/**
 * App.js - المحرك التشغيلي للتقويم الأكاديمي
 * صُمم ليدير تدفق البيانات، التحقق من النطاق الزمني، والتفاعل مع الواجهات الاحترافية.
 */

const App = {
    data: null,

    async init() {
        // تحميل البيانات من IndexedDB عند تشغيل التطبيق
        this.data = await Storage.load();
        this.bindEvents();
        this.renderAll();
    },

    renderAll() {
        if (!this.data) return;
        
        // تحديث حقول التاريخ الأساسية في واجهة الإعدادات
        if (this.data.config.startDate) {
            document.getElementById('startDate').value = this.data.config.startDate;
            document.getElementById('endDate').value = this.data.config.endDate;
            
            this.updateFiltersUI(); 
            UIManager.updateCourseSelects(this.data.courses);
            CalendarEngine.render(this.data);
        } else {
            CalendarEngine.hideLoading();
        }
    },

    bindEvents() {
        // إدارة النوافذ المنبثقة (Modals)
        document.getElementById('openSettings').onclick = () => {
            this.prepareSettingsForm();
            UIManager.toggleModal('settingsModal', true);
        };
        
        document.getElementById('addEventBtn').onclick = () => {
            this.openAddEvent(Utils.formatDate(new Date()));
        };
        
        document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => {
            UIManager.toggleModal('settingsModal', false);
            UIManager.toggleModal('eventModal', false);
        });
        
        document.querySelector('.close-detail').onclick = () => UIManager.toggleModal('detailModal', false);

        // إضافة الصفوف الديناميكية في الإعدادات
        document.getElementById('addCourseRow').onclick = () => UIManager.createRow('coursesList', 'course');
        document.getElementById('addHolidayRow').onclick = () => UIManager.createRow('holidaysList', 'holiday');
        document.getElementById('addPeriodRow').onclick = () => UIManager.createRow('periodsList', 'period');
        document.getElementById('addProcedureRow').onclick = () => UIManager.createRow('proceduresList', 'procedure');

        // تبديل نوع الموعد (يوم واحد أو فترة)
        document.getElementById('typeSingle').onclick = () => this.toggleEventType('single');
        document.getElementById('typeRange').onclick = () => this.toggleEventType('range');

        // تسليم النماذج (Forms)
        document.getElementById('settingsForm').onsubmit = async (e) => await this.handleSettingsSubmit(e);
        document.getElementById('eventForm').onsubmit = async (e) => await this.handleEventSubmit(e);

        // إدارة البيانات
        document.getElementById('exportFull').onclick = () => Utils.downloadJSON(this.data, 'التقويم_الأكاديمي_الكامل.json');
        document.getElementById('importFullBtn').onclick = () => this.triggerImport('full');
        document.getElementById('universalFilePicker').onchange = (e) => this.handleFileImport(e);
        document.getElementById('resetAllData').onclick = async () => await Storage.clear();

        // تصدير واستيراد مقرر معين
        document.getElementById('exportCourse').onclick = () => this.handleCourseExport();
        document.getElementById('importCourseBtn').onclick = () => this.triggerImport('merge');
    },

    /**
     * تبديل واجهة إضافة الموعد بين يوم واحد وفترة زمنية
     */
    toggleEventType(type) {
        const endContainer = document.getElementById('endDateContainer');
        const singleBtn = document.getElementById('typeSingle');
        const rangeBtn = document.getElementById('typeRange');
        
        if (type === 'single') {
            endContainer.classList.add('hidden');
            singleBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all bg-white text-blue-600 shadow-sm';
            rangeBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all text-slate-400 hover:text-slate-600';
            document.getElementById('eventEndDate').value = ''; // تفريغ تاريخ النهاية
        } else {
            endContainer.classList.remove('hidden');
            rangeBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all bg-white text-blue-600 shadow-sm';
            singleBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all text-slate-400 hover:text-slate-600';
        }
    },

    prepareSettingsForm() {
        // تنظيف القوائم الحالية قبل ملئها
        ['coursesList', 'holidaysList', 'periodsList', 'proceduresList'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '';
        });

        // بناء الصفوف بناءً على البيانات المخزنة
        this.data.courses.forEach(c => UIManager.createRow('coursesList', 'course', c));
        this.data.holidays.forEach(h => UIManager.createRow('holidaysList', 'holiday', h));
        this.data.periods.forEach(p => UIManager.createRow('periodsList', 'period', p)); // الفترات أصبحت عامة الآن
        this.data.procedures.forEach(pr => UIManager.createRow('proceduresList', 'procedure', pr));
    },

    async handleSettingsSubmit(e) {
        e.preventDefault();
        const startSem = document.getElementById('startDate').value;
        const endSem = document.getElementById('endDate').value;

        // ميزة: التحقق من النطاق الزمني للفصل الدراسي
        if (startSem >= endSem) {
            return UIManager.showToast('تاريخ نهاية الفصل يجب أن يكون بعد تاريخ البداية', 'error');
        }

        this.data.config.startDate = startSem;
        this.data.config.endDate = endSem;
        
        // جمع المقررات
        this.data.courses = Array.from(document.querySelectorAll('#coursesList > .dynamic-row')).map(row => ({
            id: row.dataset.id || Utils.generateId('c'),
            name: row.querySelector('.course-name').value,
            code: row.querySelector('.course-code').value,
            color: row.querySelector('.course-color').value
        }));

        // دالة للتحقق من وقوع التاريخ ضمن نطاق الفصل
        const isOutside = (date) => date < startSem || date > endSem;

        // جمع البيانات الأخرى مع التحقق من التواريخ
        const categories = ['holidays', 'periods', 'procedures'];
        for (const cat of categories) {
            const rows = Array.from(document.querySelectorAll(`#${cat}List > .dynamic-row`));
            const items = [];
            
            for (const row of rows) {
                const s = row.querySelector('.item-start').value;
                const e = row.querySelector('.item-end').value;

                if (isOutside(s) || isOutside(e)) {
                    UIManager.showToast(`تنبيه: أحد تواريخ ${cat} يقع خارج نطاق الفصل الدراسي`, 'error');
                    return; 
                }

                items.push({
                    name: row.querySelector('.item-name').value,
                    start: s,
                    end: e
                });
            }
            this.data[cat] = items;
        }

        await Storage.save(this.data);
        UIManager.showToast('تم تحديث إعدادات الفصل الدراسي بنجاح', 'success');
        this.renderAll();
        UIManager.toggleModal('settingsModal', false);
    },

    openAddEvent(date) {
        UIManager.updateCourseSelects(this.data.courses);
        document.getElementById('eventDate').value = date;
        this.toggleEventType('single'); // الافتراضي موعد ليوم واحد
        UIManager.toggleModal('eventModal', true);
    },

    async handleEventSubmit(e) {
        e.preventDefault();
        const startDate = document.getElementById('eventDate').value;
        const endDate = document.getElementById('eventEndDate').value || startDate;

        // ميزة: التحقق من وقوع الموعد ضمن الفصل الدراسي
        if (startDate < this.data.config.startDate || endDate > this.data.config.endDate) {
            return UIManager.showToast('لا يمكن إضافة موعد خارج نطاق الفصل الدراسي', 'error');
        }

        this.data.events.push({
            id: Utils.generateId('ev'),
            courseId: document.getElementById('eventCourse').value,
            title: document.getElementById('eventTitle').value,
            start: startDate,
            end: endDate,
            notes: document.getElementById('eventNotes').value
        });

        await Storage.save(this.data);
        UIManager.showToast('تم تثبيت الموعد في التقويم', 'success');
        this.renderAll();
        UIManager.toggleModal('eventModal', false);
        e.target.reset();
    },

    showEventDetail(id) {
        const ev = this.data.events.find(e => e.id === id);
        if (!ev) return;
        
        const course = this.data.courses.find(c => c.id == ev.courseId);
        
        document.getElementById('detailHeader').style.backgroundColor = course ? course.color : '#0F172A';
        document.getElementById('detailCourseName').innerText = ev.title;
        document.getElementById('editTitle').value = ev.title;
        document.getElementById('editNotes').value = ev.notes || '';
        
        // عرض التاريخ (يوم واحد أو فترة)
        const dateText = ev.start === ev.end ? ev.start : `${ev.start} ← ${ev.end}`;
        document.getElementById('detailDateText').innerText = dateText;

        UIManager.toggleModal('detailModal', true);

        // حذف الموعد
        document.getElementById('deleteEvent').onclick = async () => {
            if(confirm('هل تريد حذف هذا الموعد نهائياً؟')) {
                this.data.events = this.data.events.filter(e => e.id !== id);
                await Storage.save(this.data);
                UIManager.showToast('تم حذف الموعد من الجدول', 'info');
                this.renderAll();
                UIManager.toggleModal('detailModal', false);
            }
        };

        // تحديث الموعد
        document.getElementById('saveEditEvent').onclick = async () => {
            ev.title = document.getElementById('editTitle').value;
            ev.notes = document.getElementById('editNotes').value;
            await Storage.save(this.data);
            UIManager.showToast('تم تحديث تفاصيل الموعد', 'success');
            this.renderAll();
            UIManager.toggleModal('detailModal', false);
        };
    },

    updateFiltersUI() {
        const container = document.getElementById('filterContainer');
        if(!container) return;
        
        let html = `
            <label class="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                <input type="checkbox" checked value="holidays" class="w-4 h-4 rounded-lg accent-orange-500">
                <span class="text-xs font-bold text-slate-600">الإجازات</span>
            </label>
            <label class="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                <input type="checkbox" checked value="periods" class="w-4 h-4 rounded-lg accent-purple-500">
                <span class="text-xs font-bold text-slate-600">الفترات</span>
            </label>
            <label class="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                <input type="checkbox" checked value="procedures" class="w-4 h-4 rounded-lg accent-emerald-500">
                <span class="text-xs font-bold text-slate-600">الإجراءات</span>
            </label>
            <label class="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                <input type="checkbox" checked value="general" class="w-4 h-4 rounded-lg accent-slate-500">
                <span class="text-xs font-bold text-slate-600">عام</span>
            </label>
        `;
        
        this.data.courses.forEach(c => {
            html += `
                <label class="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm" style="border-right: 4px solid ${c.color}">
                    <input type="checkbox" checked value="${c.id}" class="w-4 h-4" style="accent-color:${c.color}">
                    <span class="text-xs font-bold text-slate-600">${Utils.escapeHTML(c.name)}</span>
                </label>
            `;
        });
        
        container.innerHTML = html;
        container.querySelectorAll('input').forEach(i => {
            i.onchange = () => CalendarEngine.render(this.data);
        });
    },

    triggerImport(mode) {
        const picker = document.getElementById('universalFilePicker');
        if(picker) {
            picker.dataset.mode = mode;
            picker.click();
        }
    },

    handleFileImport(e) {
        const reader = new FileReader();
        const mode = e.target.dataset.mode;
        
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (mode === 'full') {
                    this.data = { ...DEFAULT_DATA, ...imported };
                }
                await Storage.save(this.data);
                UIManager.showToast('تم استيراد البيانات بنجاح، جاري التحديث...', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) { 
                UIManager.showToast('الملف المرفوع غير صالح', 'error');
            }
        };
        reader.readAsText(e.target.files[0]);
    }
};

// تشغيل التطبيق
App.init();

// منطق تحديث التطبيق عبر Service Worker
if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
        reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    if (confirm("يوجد تحديث جديد للواجهة، هل تود التحديث الآن؟")) {
                        installingWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            };
        };
    });
}
