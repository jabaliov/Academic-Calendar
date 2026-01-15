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
        document.getElementById('openSettings').onclick = () => {
            this.prepareSettingsForm();
            UIManager.toggleModal('settingsModal', true);
        };
        document.getElementById('addEventBtn').onclick = () => this.openAddEvent(Utils.formatDate(new Date()));
        
        document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => {
            UIManager.toggleModal('settingsModal', false);
            UIManager.toggleModal('eventModal', false);
        });
        
        document.querySelector('.close-detail').onclick = () => UIManager.toggleModal('detailModal', false);

        document.getElementById('addCourseRow').onclick = () => UIManager.createRow('coursesList', 'course');
        document.getElementById('addHolidayRow').onclick = () => UIManager.createRow('holidaysList', 'holiday');
        // تمرير قائمة المقررات عند إضافة فترة جديدة
        document.getElementById('addPeriodRow').onclick = () => UIManager.createRow('periodsList', 'period', {}, this.data.courses);
        document.getElementById('addProcedureRow').onclick = () => UIManager.createRow('proceduresList', 'procedure');

        document.getElementById('settingsForm').onsubmit = async (e) => await this.handleSettingsSubmit(e);
        document.getElementById('eventForm').onsubmit = async (e) => await this.handleEventSubmit(e);

        document.getElementById('exportFull').onclick = () => Utils.downloadJSON(this.data, 'التقويم_الجامعي_الكامل.json');
        document.getElementById('exportCourse').onclick = () => this.handleCourseExport();
        document.getElementById('importFullBtn').onclick = () => this.triggerImport('full');
        document.getElementById('importCourseBtn').onclick = () => this.triggerImport('merge');
        document.getElementById('universalFilePicker').onchange = (e) => this.handleFileImport(e);
        
        document.getElementById('resetAllData').onclick = async () => await Storage.clear();
    },

    prepareSettingsForm() {
        ['coursesList', 'holidaysList', 'periodsList', 'proceduresList'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '';
        });
        this.data.courses.forEach(c => UIManager.createRow('coursesList', 'course', c));
        this.data.holidays.forEach(h => UIManager.createRow('holidaysList', 'holiday', h));
        // تمرير المقررات عند بناء صفوف الفترات الموجودة مسبقاً
        this.data.periods.forEach(p => UIManager.createRow('periodsList', 'period', p, this.data.courses));
        this.data.procedures.forEach(pr => UIManager.createRow('proceduresList', 'procedure', pr));
    },

    async handleSettingsSubmit(e) {
        e.preventDefault();
        const startSem = document.getElementById('startDate').value;
        const endSem = document.getElementById('endDate').value;

        // ميزة: التأكد من أن نهاية الفصل بعد بدايته
        if (startSem >= endSem) {
            return UIManager.showToast('تاريخ نهاية الفصل يجب أن يكون بعد تاريخ البداية', 'error');
        }

        this.data.config.startDate = startSem;
        this.data.config.endDate = endSem;
        
        this.data.courses = Array.from(document.querySelectorAll('#coursesList > .dynamic-row')).map(row => ({
            id: row.dataset.id || Utils.generateId('c'),
            name: row.querySelector('.course-name').value,
            code: row.querySelector('.course-code').value,
            color: row.querySelector('.course-color').value
        }));

        // دالة مساعدة للتحقق من النطاق الزمني
        const isOutsideRange = (date) => date < startSem || date > endSem;

        const categories = [
            { id: 'holidays', label: 'الإجازات' },
            { id: 'periods', label: 'الفترات' },
            { id: 'procedures', label: 'الإجراءات' }
        ];

        for (const cat of categories) {
            const rows = Array.from(document.querySelectorAll(`#${cat.id}List > .dynamic-row`));
            const items = [];
            
            for (const row of rows) {
                const s = row.querySelector('.item-start').value;
                const e = row.querySelector('.item-end').value;

                // ميزة: التحقق من وقوع التواريخ ضمن نطاق الفصل الدراسي
                if (isOutsideRange(s) || isOutsideRange(e)) {
                    UIManager.showToast(`خطأ: تاريخ في ${cat.label} يقع خارج نطاق الفصل الدراسي`, 'error');
                    return; // إيقاف الحفظ
                }

                const item = {
                    name: row.querySelector('.item-name').value,
                    start: s,
                    end: e
                };

                // ميزة: حفظ بيانات المقرر والملاحظات للفترات
                if (cat.id === 'periods') {
                    item.courseId = row.querySelector('.item-course').value;
                    item.notes = row.querySelector('.item-notes').value;
                }
                
                items.push(item);
            }
            this.data[cat.id] = items;
        }

        await Storage.save(this.data);
        UIManager.showToast('تم حفظ الإعدادات بنجاح', 'success');
        this.renderAll();
        UIManager.toggleModal('settingsModal', false);
    },

    openAddEvent(date) {
        UIManager.updateCourseSelects(this.data.courses);
        document.getElementById('eventDate').value = date;
        UIManager.toggleModal('eventModal', true);
    },

    async handleEventSubmit(e) {
        e.preventDefault();
        const eventDate = document.getElementById('eventDate').value;

        // ميزة: التحقق من تاريخ الموعد الجديد
        if (eventDate < this.data.config.startDate || eventDate > this.data.config.endDate) {
            return UIManager.showToast('تاريخ الموعد خارج نطاق الفصل الدراسي المعتمد', 'error');
        }

        this.data.events.push({
            id: Utils.generateId('ev'),
            courseId: document.getElementById('eventCourse').value,
            title: document.getElementById('eventTitle').value,
            date: eventDate,
            notes: ''
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
        
        document.getElementById('detailHeader').style.backgroundColor = course ? course.color : '#64748b';
        document.getElementById('detailCourseName').innerText = ev.title;
        document.getElementById('editTitle').value = ev.title;
        document.getElementById('editNotes').value = ev.notes || '';
        document.getElementById('detailDateText').innerText = ev.date;

        UIManager.toggleModal('detailModal', true);

        document.getElementById('deleteEvent').onclick = async () => {
            this.data.events = this.data.events.filter(e => e.id !== id);
            await Storage.save(this.data);
            UIManager.showToast('تم حذف الموعد', 'info');
            this.renderAll();
            UIManager.toggleModal('detailModal', false);
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
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="holidays" class="w-4 h-4"><span>الإجازات</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="periods" class="w-4 h-4"><span>الفترات</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="procedures" class="w-4 h-4"><span>الإجراءات</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="general" class="w-4 h-4"><span>عام</span></label>
        `;
        this.data.courses.forEach(c => {
            html += `<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="${c.id}" class="w-4 h-4" style="accent-color:${c.color}"><span>${Utils.escapeHTML(c.name)}</span></label>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('input').forEach(i => i.onchange = () => CalendarEngine.render(this.data));
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
                    if (imported.type !== 'course_package') {
                        return UIManager.showToast('ملف غير صالح لمقرر', 'error');
                    }
                    if (!this.data.courses.find(c => c.id == imported.course.id)) this.data.courses.push(imported.course);
                    imported.events.forEach(ev => {
                        if (!this.data.events.find(old => old.date === ev.date && old.title === ev.title)) this.data.events.push(ev);
                    });
                }
                await Storage.save(this.data);
                UIManager.showToast('تم استيراد البيانات بنجاح', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) { 
                UIManager.showToast('خطأ في قراءة الملف', 'error');
            }
        };
        reader.readAsText(e.target.files[0]);
    },

    handleCourseExport() {
        const cid = document.getElementById('exportCourseId').value;
        const course = this.data.courses.find(c => c.id == cid);
        if (!course) return UIManager.showToast('الرجاء اختيار مقرر أولاً', 'info');
        const events = this.data.events.filter(ev => ev.courseId == cid);
        Utils.downloadJSON({ type: 'course_package', course, events }, `مقرر_${course.name}.json`);
    }
};

App.init();

// منطق Service Worker لتحديث التطبيق
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
                    if (confirm("توجد تحديثات جديدة للتقويم، هل تود التحديث الآن؟")) {
                        installingWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            };
        };
    });
}
