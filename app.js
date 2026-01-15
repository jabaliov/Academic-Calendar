/**
 * App.js - المحرك التشغيلي للتقويم الأكاديمي الاحترافي
 * يدير تدفق البيانات، التحقق من النطاق الزمني، والعمليات المتقدمة للمقررات.
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

        // تبديل نوع الموعد (يوم واحد أو فترة زمنية ممتدة)
        document.getElementById('typeSingle').onclick = () => this.toggleEventType('single');
        document.getElementById('typeRange').onclick = () => this.toggleEventType('range');

        // تسليم النماذج (Forms)
        document.getElementById('settingsForm').onsubmit = async (e) => await this.handleSettingsSubmit(e);
        document.getElementById('eventForm').onsubmit = async (e) => await this.handleEventSubmit(e);

        // إدارة البيانات (النسخ الاحتياطي والمشاركة)
        document.getElementById('exportFull').onclick = () => Utils.downloadJSON(this.data, 'التقويم_الأكاديمي_الكامل.json');
        document.getElementById('exportCourse').onclick = () => this.handleCourseExport();
        document.getElementById('importFullBtn').onclick = () => this.triggerImport('full');
        document.getElementById('importCourseBtn').onclick = () => this.triggerImport('merge');
        document.getElementById('universalFilePicker').onchange = (e) => this.handleFileImport(e);
        
        document.getElementById('resetAllData').onclick = async () => await Storage.clear();
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
            rangeBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all text-slate-400';
            document.getElementById('eventEndDate').value = ''; 
        } else {
            endContainer.classList.remove('hidden');
            rangeBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all bg-white text-blue-600 shadow-sm';
            singleBtn.className = 'flex-1 py-3 rounded-xl text-xs font-black transition-all text-slate-400';
        }
    },

    prepareSettingsForm() {
        ['coursesList', 'holidaysList', 'periodsList', 'proceduresList'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '';
        });

        // بناء الصفوف بناءً على البيانات المخزنة
        this.data.courses.forEach(c => UIManager.createRow('coursesList', 'course', c));
        this.data.holidays.forEach(h => UIManager.createRow('holidaysList', 'holiday', h));
        this.data.periods.forEach(p => UIManager.createRow('periodsList', 'period', p)); 
        this.data.procedures.forEach(pr => UIManager.createRow('proceduresList', 'procedure', pr));
    },

    async handleSettingsSubmit(e) {
        e.preventDefault();
        const startSem = document.getElementById('startDate').value;
        const endSem = document.getElementById('endDate').value;

        // التحقق من منطقية النطاق الزمني للفصل الدراسي
        if (startSem >= endSem) {
            return UIManager.showToast('تاريخ نهاية الفصل يجب أن يكون بعد تاريخ البداية', 'error');
        }

        this.data.config.startDate = startSem;
        this.data.config.endDate = endSem;
        
        // حفظ المقررات
        this.data.courses = Array.from(document.querySelectorAll('#coursesList > .dynamic-row')).map(row => ({
            id: row.dataset.id || Utils.generateId('c'),
            name: row.querySelector('.course-name').value,
            code: row.querySelector('.course-code').value,
            color: row.querySelector('.course-color').value
        }));

        // التحقق من وقوع التواريخ العامة ضمن نطاق الفصل الدراسي
        const isOutside = (date) => date < startSem || date > endSem;
        const categories = ['holidays', 'periods', 'procedures'];
        
        for (const cat of categories) {
            const rows = Array.from(document.querySelectorAll(`#${cat}List > .dynamic-row`));
            const items = [];
            for (const row of rows) {
                const s = row.querySelector('.item-start').value;
                const e = row.querySelector('.item-end').value;

                if (isOutside(s) || isOutside(e)) {
                    UIManager.showToast(`تاريخ في قسم ${cat} خارج نطاق الفصل الدراسي`, 'error');
                    return; 
                }
                items.push({ name: row.querySelector('.item-name').value, start: s, end: e });
            }
            this.data[cat] = items;
        }

        await Storage.save(this.data);
        UIManager.showToast('تم حفظ الإعدادات بنجاح', 'success');
        this.renderAll();
        UIManager.toggleModal('settingsModal', false);
    },

    openAddEvent(date) {
        UIManager.updateCourseSelects(this.data.courses);
        document.getElementById('eventDate').value = date;
        this.toggleEventType('single'); 
        UIManager.toggleModal('eventModal', true);
    },

    async handleEventSubmit(e) {
        e.preventDefault();
        const startDate = document.getElementById('eventDate').value;
        const endDate = document.getElementById('eventEndDate').value || startDate;

        // التحقق من تاريخ الموعد الجديد
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
        UIManager.showToast('تمت إضافة الموعد للجدول', 'success');
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
        
        const dateText = ev.start === ev.end ? ev.start : `${ev.start} ← ${ev.end}`;
        document.getElementById('detailDateText').innerText = dateText;

        UIManager.toggleModal('detailModal', true);

        document.getElementById('deleteEvent').onclick = async () => {
            if(confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
                this.data.events = this.data.events.filter(e => e.id !== id);
                await Storage.save(this.data);
                UIManager.showToast('تم حذف الموعد', 'info');
                this.renderAll();
                UIManager.toggleModal('detailModal', false);
            }
        };

        document.getElementById('saveEditEvent').onclick = async () => {
            ev.title = document.getElementById('editTitle').value;
            ev.notes = document.getElementById('editNotes').value;
            await Storage.save(this.data);
            UIManager.showToast('تم تحديث البيانات', 'success');
            this.renderAll();
            UIManager.toggleModal('detailModal', false);
        };
    },

    updateFiltersUI() {
        const container = document.getElementById('filterContainer');
        if(!container) return;
        
        let html = `
            <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm hover:bg-slate-50 transition-all">
                <input type="checkbox" checked value="holidays" class="accent-orange-500">
                <span class="text-xs font-bold text-slate-600">الإجازات</span>
            </label>
            <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm hover:bg-slate-50 transition-all">
                <input type="checkbox" checked value="periods" class="accent-purple-500">
                <span class="text-xs font-bold text-slate-600">الفترات</span>
            </label>
            <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm hover:bg-slate-50 transition-all">
                <input type="checkbox" checked value="procedures" class="accent-emerald-500">
                <span class="text-xs font-bold text-slate-600">الإجراءات</span>
            </label>
        `;
        
        this.data.courses.forEach(c => {
            html += `
                <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm hover:bg-slate-50 transition-all" style="border-right: 4px solid ${c.color}">
                    <input type="checkbox" checked value="${c.id}" style="accent-color:${c.color}">
                    <span class="text-xs font-bold text-slate-600">${Utils.escapeHTML(c.name)}</span>
                </label>`;
        });
        
        container.innerHTML = html;
        container.querySelectorAll('input').forEach(i => i.onchange = () => CalendarEngine.render(this.data));
    },

    handleCourseExport() {
        const cid = document.getElementById('exportCourseId').value;
        const course = this.data.courses.find(c => c.id == cid);
        if (!course) return UIManager.showToast('الرجاء اختيار مقرر أولاً', 'info');
        
        const events = this.data.events.filter(ev => ev.courseId == cid);
        Utils.downloadJSON({ type: 'course_package', course, events }, `مقرر_${course.name}.json`);
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
                } else {
                    if (imported.type !== 'course_package') return UIManager.showToast('ملف غير صالح لمقرر', 'error');
                    if (!this.data.courses.find(c => c.id == imported.course.id)) this.data.courses.push(imported.course);
                    imported.events.forEach(ev => {
                        if (!this.data.events.find(old => old.start === ev.start && old.title === ev.title)) this.data.events.push(ev);
                    });
                }
                await Storage.save(this.data);
                UIManager.showToast('تمت العملية بنجاح، جاري التحديث...', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) { 
                UIManager.showToast('خطأ في معالجة الملف', 'error');
            }
        };
        reader.readAsText(e.target.files[0]);
    }
};

App.init();
