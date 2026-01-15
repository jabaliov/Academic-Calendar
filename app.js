const App = {
    data: null, // سنقوم بتحميل البيانات لاحقاً

    async init() {
        // تحميل البيانات بشكل غير متزامن
        this.data = await Storage.load();
        this.bindEvents();
        this.renderAll();
    },

    renderAll() {
        if (!this.data) return; // صمام أمان
        
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
        document.getElementById('addPeriodRow').onclick = () => UIManager.createRow('periodsList', 'period');
        document.getElementById('addProcedureRow').onclick = () => UIManager.createRow('proceduresList', 'procedure');

        document.getElementById('settingsForm').onsubmit = (e) => this.handleSettingsSubmit(e);
        document.getElementById('eventForm').onsubmit = (e) => this.handleEventSubmit(e);

        document.getElementById('exportFull').onclick = () => Utils.downloadJSON(this.data, 'التقويم_الجامعي_الكامل.json');
        document.getElementById('exportCourse').onclick = () => this.handleCourseExport();
        document.getElementById('importFullBtn').onclick = () => this.triggerImport('full');
        document.getElementById('importCourseBtn').onclick = () => this.triggerImport('merge');
        document.getElementById('universalFilePicker').onchange = (e) => this.handleFileImport(e);
        
        document.getElementById('resetAllData').onclick = () => Storage.clear();
    },

    prepareSettingsForm() {
        ['coursesList', 'holidaysList', 'periodsList', 'proceduresList'].forEach(id => document.getElementById(id).innerHTML = '');
        this.data.courses.forEach(c => UIManager.createRow('coursesList', 'course', c));
        this.data.holidays.forEach(h => UIManager.createRow('holidaysList', 'holiday', h));
        this.data.periods.forEach(p => UIManager.createRow('periodsList', 'period', p));
        this.data.procedures.forEach(pr => UIManager.createRow('proceduresList', 'procedure', pr));
    },

    async handleSettingsSubmit(e) {
        e.preventDefault();
        this.data.config.startDate = document.getElementById('startDate').value;
        this.data.config.endDate = document.getElementById('endDate').value;
        
        this.data.courses = Array.from(document.querySelectorAll('#coursesList > .dynamic-row')).map(row => ({
            id: row.dataset.id || Utils.generateId('c'),
            name: row.querySelector('.course-name').value,
            code: row.querySelector('.course-code').value,
            color: row.querySelector('.course-color').value
        }));

        ['holidays', 'periods', 'procedures'].forEach(type => {
            this.data[type] = Array.from(document.querySelectorAll(`#${type}List > .dynamic-row`)).map(row => ({
                name: row.querySelector('.item-name').value,
                start: row.querySelector('.item-start').value,
                end: row.querySelector('.item-end').value
            }));
        });

        await Storage.save(this.data);
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
        this.data.events.push({
            id: Utils.generateId('ev'),
            courseId: document.getElementById('eventCourse').value,
            title: document.getElementById('eventTitle').value,
            date: document.getElementById('eventDate').value,
            notes: ''
        });
        await Storage.save(this.data);
        this.renderAll();
        UIManager.toggleModal('eventModal', false);
        e.target.reset();
    },

    async showEventDetail(id) {
        const ev = this.data.events.find(e => e.id === id);
        if (!ev) return;
        const course = this.data.courses.find(c => c.id == ev.courseId);
        
        document.getElementById('detailHeader').style.backgroundColor = course ? course.color : '#64748b';
        document.getElementById('detailCourseName').innerText = ev.title;
        document.getElementById('editTitle').value = ev.title;
        document.getElementById('editNotes').value = ev.notes || '';
        document.getElementById('detailDateText').innerText = ev.date;

        UIManager.toggleModal('detailModal', true);

        document.getElementById('deleteEvent').onclick = () => {
            this.data.events = this.data.events.filter(e => e.id !== id);
            await Storage.save(this.data);
            this.renderAll();
            UIManager.toggleModal('detailModal', false);
        };

        document.getElementById('saveEditEvent').onclick = () => {
            ev.title = document.getElementById('editTitle').value;
            ev.notes = document.getElementById('editNotes').value;
            await Storage.save(this.data);
            this.renderAll();
            UIManager.toggleModal('detailModal', false);
        };
    },

    updateFiltersUI() {
        const container = document.getElementById('filterContainer');
        let html = `
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="holidays" class="w-4 h-4"><span>الإجازات</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="periods" class="w-4 h-4"><span>الفترات</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="procedures" class="w-4 h-4"><span>الإجراءات</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="general" class="w-4 h-4"><span>عام</span></label>
        `;
        this.data.courses.forEach(c => {
            html += `<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="${c.id}" class="w-4 h-4" style="accent-color:${c.color}"><span>${c.name}</span></label>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('input').forEach(i => i.onchange = () => CalendarEngine.render(this.data));
    },

    triggerImport(mode) {
        const picker = document.getElementById('universalFilePicker');
        picker.dataset.mode = mode;
        picker.click();
    },

    async handleFileImport(e) {
        const reader = new FileReader();
        const mode = e.target.dataset.mode;
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (mode === 'full') {
                    this.data = { ...DEFAULT_DATA, ...imported };
                } else {
                    if (imported.type !== 'course_package') return alert('ملف غير صالح لمقرر');
                    if (!this.data.courses.find(c => c.id == imported.course.id)) this.data.courses.push(imported.course);
                    imported.events.forEach(ev => {
                        if (!this.data.events.find(old => old.date === ev.date && old.title === ev.title)) this.data.events.push(ev);
                    });
                }
                await Storage.save(this.data);
                location.reload();
            } catch (err) { alert('خطأ في قراءة الملف'); }
        };
        reader.readAsText(e.target.files[0]);
    },

    handleCourseExport() {
        const cid = document.getElementById('exportCourseId').value;
        const course = this.data.courses.find(c => c.id == cid);
        if (!course) return alert('الرجاء اختيار مقرر');
        const events = this.data.events.filter(ev => ev.courseId == cid);
        Utils.downloadJSON({ type: 'course_package', course, events }, `مقرر_${course.name}.json`);
    }
};



App.init();

// في ملف app.js
if ('serviceWorker' in navigator) {
    let refreshing = false;
    // الاستماع لتغيير المتحكم (Controller) لضمان إعادة التحميل مرة واحدة فقط
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
        reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            installingWorker.onstatechange = () => {
                // التأكد من أن العامل الجديد تم تنصيبه وأن هناك عامل قديم مسيطر حالياً
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    if (confirm("توجد تحديثات جديدة للتقويم، هل تود التحديث الآن؟")) {
                        // إرسال أمر للعامل الجديد ليتخطى مرحلة الانتظار
                        installingWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            };
        };
    });
}
