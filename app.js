/**
 * app.js - النسخة النهائية المصححة
 */

const App = {
    data: null,

    async init() {
        this.data = await Storage.load();
        this.bindEvents();
        this.renderAll();
    },

    renderAll() {
        if (!this.data) return;
        if (this.data.config.startDate) {
            document.getElementById('startDate').value = this.data.config.startDate;
            document.getElementById('endDate').value = this.data.config.endDate;
        }
        this.updateRamadanUI();
        this.updateFiltersUI(); 
        UIManager.updateCourseSelects(this.data.courses);
        CalendarEngine.render(this.data);
    },

    async handleAiImport() {
        const jsonArea = document.getElementById('aiImportJson');
        try {
            const imported = JSON.parse(jsonArea.value);
            if (!imported.courses || !imported.lectures) throw new Error();

            // التحقق من النطاق الزمني أولاً
            if (!this.data.config.startDate || !this.data.config.endDate) {
                return UIManager.showToast('يرجى تحديد تاريخ بداية ونهاية الفصل من الإعدادات وحفظها أولاً', 'error');
            }

            // خريطة لربط المعرفات في الـ JSON بالمعرفات الفعلية في النظام
            const idMap = {};

            // 1. معالجة المقررات
            imported.courses.forEach(c => {
                const existing = this.data.courses.find(old => old.code === c.code);
                if (existing) {
                    idMap[c.id] = existing.id; // ربط المعرف الجديد بالقديم الموجود فعلياً
                } else {
                    const newId = c.id || Utils.generateId('c');
                    this.data.courses.push({ ...c, id: newId, color: c.color || Utils.getRandomColor() });
                    idMap[c.id] = newId;
                }
            });

            // 2. توليد المحاضرات بناءً على الربط الصحيح
            imported.lectures.forEach(lec => {
                const actualCourseId = idMap[lec.courseId];
                const course = this.data.courses.find(c => c.id === actualCourseId);
                
                if (course) {
                    const dates = Utils.getDatesForDay(lec.day, this.data.config.startDate, this.data.config.endDate);
                    dates.forEach(date => {
                        this.data.events.push({
                            id: Utils.generateId('ev'),
                            courseId: actualCourseId,
                            title: `${course.name} (${lec.type})`,
                            start: date,
                            end: date,
                            periods: lec.periods,
                            gender: lec.gender,
                            notes: `شعبة: ${lec.section}`
                        });
                    });
                }
            });

            await Storage.save(this.data);
            UIManager.showToast('تم استيراد الجدول بنجاح وتوليد المواعيد', 'success');
            jsonArea.value = '';
            this.renderAll();
        } catch (e) {
            UIManager.showToast('فشل الاستيراد: تأكد من صحة الـ JSON ووجود التواريخ', 'error');
            console.error(e);
        }
    },

    // دالة استيراد النسخة الاحتياطية (كانت مفقودة)
    // دالة الاستيراد الذكي (Smart Merge)
    // دالة استيراد مع تشخيص كامل للأخطاء (Debug Mode)
    async handleFileImport(e) {
        console.clear(); // تنظيف الكونسول للتركيز على العملية الحالية
        console.group("🚀 بدء عملية تشخيص الاستيراد");

        const file = e.target.files[0];
        if (!file) {
            console.error("❌ الخطوة 0: لم يتم اختيار ملف.");
            console.groupEnd();
            return;
        }
        console.log("✅ الخطوة 0: تم التقاط الملف:", file.name);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                // 1. تحليل الملف
                console.log("🔄 الخطوة 1: محاولة قراءة وتحليل ملف JSON...");
                let imported;
                try {
                    imported = JSON.parse(event.target.result);
                    console.log("✅ الخطوة 1: نجح التحليل (JSON Valid).");
                } catch (parseError) {
                    throw new Error("فشل تحليل JSON. تأكد من سلامة الملف. " + parseError.message);
                }

                // 2. فحص الإعدادات والتواريخ
                console.log("🔄 الخطوة 2: فحص بيانات الإعدادات (Config)...");
                if (!imported.config) {
                    console.error("❌ الخطوة 2: فشل. الملف لا يحتوي على كائن 'config'.");
                } else {
                    console.log(`✅ الخطوة 2: تم العثور على الإعدادات. التاريخ: من ${imported.config.startDate} إلى ${imported.config.endDate}`);
                }

                // 3. تحميل البيانات الحالية للدمج
                console.log("🔄 الخطوة 3: جلب البيانات الحالية من المتصفح...");
                const current = await Storage.load();
                console.log("✅ الخطوة 3: تم جلب البيانات الحالية.");

                // دالة مساعدة للدمج مع التبليغ
                const mergeAndReport = (name, oldArr, newArr) => {
                    if (!newArr) {
                        console.warn(`⚠️ تحذير في ${name}: القائمة غير موجودة في الملف المستورد. سيتم الاحتفاظ بالقديم.`);
                        return oldArr || [];
                    }
                    console.log(`ℹ️ معالجة ${name}: وجد ${newArr.length} عنصر جديد.`);
                    
                    // دمج بسيط لمنع التكرار (حسب الاسم)
                    const mergedMap = new Map();
                    (oldArr || []).forEach(i => mergedMap.set(i.name, i));
                    newArr.forEach(i => {
                        // إصلاح البيانات الناقصة لتجنب الأخطاء
                        if (!i.id) i.id = Utils.generateId('imp');
                        mergedMap.set(i.name, i);
                    });
                    
                    const result = Array.from(mergedMap.values());
                    console.log(`✅ تم دمج ${name}. العدد الكلي الآن: ${result.length}`);
                    return result;
                };

                // 4. تجهيز البيانات الجديدة
                const newData = {
                    config: { 
                        ...current.config, 
                        ...imported.config,
                        // حماية timeMappings من الضياع
                        timeMappings: imported.config?.timeMappings || current.config.timeMappings 
                    },
                    courses: mergeAndReport('المقررات (courses)', current.courses, imported.courses),
                    holidays: mergeAndReport('الإجازات (holidays)', current.holidays, imported.holidays),
                    periods: mergeAndReport('الفترات (periods)', current.periods, imported.periods),
                    // هنا غالباً المشكلة: إذا كانت procedures مفقودة في الملف
                    procedures: mergeAndReport('الإجراءات (procedures)', current.procedures, imported.procedures),
                    events: mergeAndReport('المواعيد (events)', current.events, imported.events)
                };

                // 5. الحفظ
                console.log("🔄 الخطوة 5: محاولة الحفظ في قاعدة البيانات...");
                await Storage.save(newData);
                console.log("✅ الخطوة 5: تم الحفظ بنجاح.");

                // 6. تحديث الذاكرة والواجهة
                console.log("🔄 الخطوة 6: تحديث الواجهة...");
                this.data = await Storage.load(); // إعادة التحميل للتأكد
                
                try {
                    this.renderAll();
                    console.log("✅ الخطوة 6: تم تحديث الواجهة ورسم التقويم بنجاح.");
                    UIManager.showToast('تم الاستيراد بنجاح! راجع الـ Console للتفاصيل', 'success');
                } catch (renderError) {
                    console.error("❌ الخطوة 6: فشل رسم الواجهة (Render Error).", renderError);
                    console.log("💡 تلميح: هذا الخطأ يعني أن البيانات حُفظت، لكن هناك حقل ناقص يمنع العرض.");
                }

            } catch (e) {
                console.error("❌ توقفت العملية بسبب خطأ:", e);
                UIManager.showToast('فشل الاستيراد. راجع الكونسول', 'error');
            } finally {
                console.groupEnd();
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    },
    
    bindEvents() {
        document.getElementById('openSettings').onclick = () => { this.prepareSettingsForm(); UIManager.toggleModal('settingsModal', true); };
        document.getElementById('addEventBtn').onclick = () => this.openAddEvent(Utils.formatDate(new Date()));
        document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => { UIManager.toggleModal('settingsModal', false); UIManager.toggleModal('eventModal', false); });
        document.getElementById('processAiBtn').onclick = () => this.handleAiImport();
        document.getElementById('ramadanToggle').onclick = () => this.handleRamadanToggle();
        document.getElementById('addCourseRow').onclick = () => UIManager.createRow('coursesList', 'course');
        document.getElementById('addHolidayRow').onclick = () => UIManager.createRow('holidaysList', 'holiday');
        document.getElementById('addPeriodRow').onclick = () => UIManager.createRow('periodsList', 'period');
        document.getElementById('addProcedureRow').onclick = () => UIManager.createRow('proceduresList', 'procedure');
        document.getElementById('settingsForm').onsubmit = (e) => this.handleSettingsSubmit(e);
        document.getElementById('eventForm').onsubmit = (e) => this.handleEventSubmit(e);
        document.getElementById('exportFull').onclick = () => Utils.downloadJSON(this.data, 'التقويم.json');
        document.getElementById('importFullBtn').onclick = () => document.getElementById('universalFilePicker').click();
        document.getElementById('universalFilePicker').onchange = (e) => this.handleFileImport(e);
        document.getElementById('resetAllData').onclick = () => Storage.clear();
        document.querySelectorAll('.time-tab-btn').forEach(btn => { btn.onclick = () => UIManager.renderTimeMappingRows(btn.dataset.target); });
    },

    handleRamadanToggle() {
        this.data.config.isRamadanMode = !this.data.config.isRamadanMode;
        Storage.save(this.data);
        this.updateRamadanUI();
        CalendarEngine.render(this.data);
    },

    updateRamadanUI() {
        const btn = document.getElementById('ramadanToggle');
        const ball = document.getElementById('ramadanToggleBall');
        if (this.data.config.isRamadanMode) {
            btn.classList.replace('bg-slate-200', 'bg-amber-400');
            ball.classList.replace('translate-x-1', 'translate-x-6');
        } else {
            btn.classList.replace('bg-amber-400', 'bg-slate-200');
            ball.classList.replace('translate-x-6', 'translate-x-1');
        }
    },

    prepareSettingsForm() {
        ['coursesList', 'holidaysList', 'periodsList', 'proceduresList'].forEach(id => document.getElementById(id).innerHTML = '');
        this.data.courses.forEach(c => UIManager.createRow('coursesList', 'course', c));
        this.data.holidays.forEach(h => UIManager.createRow('holidaysList', 'holiday', h));
        this.data.periods.forEach(p => UIManager.createRow('periodsList', 'period', p));
        this.data.procedures.forEach(pr => UIManager.createRow('proceduresList', 'procedure', pr));
    },

    updateFiltersUI() {
        const container = document.getElementById('filterContainer');
        if(!container) return;
        let html = `
            <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm border border-slate-100"><input type="checkbox" checked value="holidays" class="accent-orange-500"><span class="text-[10px] font-black">الإجازات</span></label>
            <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm border border-slate-100"><input type="checkbox" checked value="periods" class="accent-purple-500"><span class="text-[10px] font-black">الفترات</span></label>
            <label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm border border-slate-100"><input type="checkbox" checked value="procedures" class="accent-emerald-500"><span class="text-[10px] font-black">الإجراءات</span></label>`;
        this.data.courses.forEach(c => {
            html += `<label class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl cursor-pointer shadow-sm border-r-4" style="border-color: ${c.color}"><input type="checkbox" checked value="${c.id}" style="accent-color:${c.color}"><span class="text-[10px] font-black">${Utils.escapeHTML(c.name)}</span></label>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('input').forEach(i => i.onchange = () => CalendarEngine.render(this.data));
    },

    async handleSettingsSubmit(e) {
        e.preventDefault();
        this.data.config.startDate = document.getElementById('startDate').value;
        this.data.config.endDate = document.getElementById('endDate').value;
        const timeRows = document.querySelectorAll('#timeRowsContainer > div');
        timeRows.forEach(row => {
            const type = row.dataset.type;
            const index = parseInt(row.dataset.index);
            this.data.config.timeMappings[type][index] = { start: row.querySelector('.time-start').value, end: row.querySelector('.time-end').value };
        });
        this.data.courses = Array.from(document.querySelectorAll('#coursesList .dynamic-row')).map(row => ({ id: row.dataset.id || Utils.generateId('c'), name: row.querySelector('.course-name').value, code: row.querySelector('.course-code').value, color: row.querySelector('.course-color').value }));
        ['holidays', 'periods', 'procedures'].forEach(cat => { this.data[cat] = Array.from(document.querySelectorAll(`#${cat}List .dynamic-row`)).map(row => ({ name: row.querySelector('.item-name').value, start: row.querySelector('.item-start').value, end: row.querySelector('.item-end').value })); });
        await Storage.save(this.data);
        UIManager.showToast('تم حفظ الإعدادات بنجاح', 'success');
        this.renderAll();
        UIManager.toggleModal('settingsModal', false);
    },

    openAddEvent(date) { UIManager.updateCourseSelects(this.data.courses); document.getElementById('eventDate').value = date; UIManager.toggleModal('eventModal', true); },

    async handleEventSubmit(e) {
        e.preventDefault();
        this.data.events.push({ id: Utils.generateId('ev'), courseId: document.getElementById('eventCourse').value, title: document.getElementById('eventTitle').value, start: document.getElementById('eventDate').value, end: document.getElementById('eventEndDate').value || document.getElementById('eventDate').value, notes: document.getElementById('eventNotes').value });
        await Storage.save(this.data);
        UIManager.showToast('تمت إضافة الموعد', 'success');
        this.renderAll();
        UIManager.toggleModal('eventModal', false);
        e.target.reset();
    },

    showEventDetail(id) {
        const ev = this.data.events.find(e => e.id === id);
        if (!ev) return;
        const course = this.data.courses.find(c => c.id === ev.courseId);
        document.getElementById('detailHeader').style.backgroundColor = course ? course.color : '#0F172A';
        document.getElementById('detailCourseName').innerText = ev.title;
        document.getElementById('editTitle').value = ev.title;
        document.getElementById('editNotes').value = ev.notes || '';
        document.getElementById('detailDateText').innerText = ev.start === ev.end ? ev.start : `${ev.start} ← ${ev.end}`;
        UIManager.toggleModal('detailModal', true);
        document.getElementById('deleteEvent').onclick = async () => { if(confirm('حذف هذا الموعد؟')) { this.data.events = this.data.events.filter(e => e.id !== id); await Storage.save(this.data); this.renderAll(); UIManager.toggleModal('detailModal', false); } };
        document.getElementById('saveEditEvent').onclick = async () => { ev.title = document.getElementById('editTitle').value; ev.notes = document.getElementById('editNotes').value; await Storage.save(this.data); this.renderAll(); UIManager.toggleModal('detailModal', false); };
    }
};

App.init();
