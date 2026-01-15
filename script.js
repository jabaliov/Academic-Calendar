/**
 * نظام المخطط الجامعي الاحترافي
 * يدعم: التاريخ الهجري، استيراد/تصدير المقررات، الإجراءات الأكاديمية، والملاحظات
 */

// 1. البيانات الأساسية وتحميلها
let universityData = JSON.parse(localStorage.getItem('uniCalendarData')) || {
    config: { startDate: '', endDate: '' },
    courses: [],
    holidays: [],
    periods: [],
    procedures: [],
    events: []
};

// 2. العناصر الأساسية من واجهة المستخدم
const calendarGrid = document.getElementById('calendarGrid');
const settingsModal = document.getElementById('settingsModal');
const eventModal = document.getElementById('eventModal');
const detailModal = document.getElementById('detailModal');
const filterContainer = document.getElementById('filterContainer');
const universalFilePicker = document.getElementById('universalFilePicker');

// --- وظائف مساعدة (Utilities) ---

const saveData = () => {
    localStorage.setItem('uniCalendarData', JSON.stringify(universityData));
    renderCalendar();
    updateFilters();
    updateCourseSelects();
};

const toggleModal = (modal, show) => {
    modal.classList.toggle('hidden', !show);
    if(show) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
};

// تحويل التاريخ للميلادي بصيغة YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

// التاريخ الهجري باستخدام Intl API
const getHijriDate = (date) => {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-uma-nu-latn', {
        day: 'numeric',
        month: 'long'
    }).format(date);
};

// تحميل ملف JSON
const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// --- إدارة التقويم (Core Logic) ---

async function renderCalendar() {
    const { startDate, endDate } = universityData.config;
    if (!startDate || !endDate) return hideLoading();

    const bar = document.getElementById('loadingBar');
    const text = document.getElementById('loadingText');
    document.getElementById('loadingOverlay').classList.remove('fade-out');

    calendarGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    let current = new Date(startDate);
    const last = new Date(endDate);
    const totalDays = Math.ceil((last - current) / (1000 * 60 * 60 * 24)) || 1;
    let processedDays = 0;

    // ضبط البداية لتكون يوم الأحد
    while (current.getDay() !== 0) current.setDate(current.getDate() - 1);

    const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    let weekNumber = 1;

    while (current <= last) {
        processedDays += 7;
        let progress = Math.min(Math.round((processedDays / totalDays) * 100), 100);
        bar.style.width = `${progress}%`;
        text.innerText = `${progress}%`;

        const weekRow = document.createElement('div');
        weekRow.className = 'week-row';
        
        const weekLabel = document.createElement('div');
        weekLabel.className = 'week-label';
        weekLabel.innerHTML = `<span>أسبوع</span><span class="text-xl">${weekNumber}</span>`;
        weekRow.appendChild(weekLabel);

        for (let i = 0; i < 7; i++) {
            const dateStr = formatDate(current);
            const hijri = getHijriDate(current);
            
            if (current.getDay() < 5) { // الأحد - الخميس
                const cell = document.createElement('div');
                cell.className = `day-cell ${activeFilters.includes('holidays') && isTypeMatch(dateStr, 'holidays') ? 'is-holiday' : ''} ${activeFilters.includes('procedures') && isTypeMatch(dateStr, 'procedures') ? 'is-procedure' : ''}`;
                
                // الضغط للإضافة
                cell.onclick = (e) => {
                    if (e.target.classList.contains('day-cell') || e.target.closest('.day-header')) {
                        openAddEvent(dateStr);
                    }
                };

                let contentHtml = `
                    <div class="day-header">
                        <div class="flex flex-col">
                            <span class="day-name">${dayNames[current.getDay()]}</span>
                            <span class="hijri-date">${hijri}</span>
                        </div>
                        <span class="day-number">${current.getDate()}</span>
                    </div>
                `;

                if (activeFilters.includes('holidays')) contentHtml += getTypeTags(dateStr, 'holidays');
                if (activeFilters.includes('periods')) contentHtml += getTypeTags(dateStr, 'periods');
                if (activeFilters.includes('procedures')) contentHtml += getTypeTags(dateStr, 'procedures');

                // عرض المواعيد
                universityData.events.filter(ev => ev.date === dateStr && activeFilters.includes(ev.courseId)).forEach(ev => {
                    const course = universityData.courses.find(c => c.id == ev.courseId);
                    const color = course ? course.color : '#64748b';
                    const name = course ? course.name : 'عام';
                    contentHtml += `
                        <div class="event-item" style="border-right-color: ${color}; background: ${color}15" onclick="showEventDetail('${ev.id}')">
                            <span class="text-[9px] opacity-60 block">${name}</span>
                            ${ev.title}
                        </div>`;
                });

                cell.innerHTML = contentHtml;
                weekRow.appendChild(cell);
            }
            current.setDate(current.getDate() + 1);
        }
        fragment.appendChild(weekRow);
        weekNumber++;
        if (weekNumber % 4 === 0) await new Promise(r => requestAnimationFrame(r));
    }

    calendarGrid.appendChild(fragment);
    hideLoading();
    lucide.createIcons();
}

function hideLoading() {
    setTimeout(() => document.getElementById('loadingOverlay').classList.add('fade-out'), 300);
}

// --- إدارة الإعدادات والصفوف ---

function createRow(containerId, type, data = {}) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    
    if (type === 'course') {
        div.innerHTML = `
            <div class="field-group flex-[2]"><label>اسم المقرر</label><input type="text" value="${data.name || ''}" class="course-name w-full border rounded-lg p-2" required></div>
            <div class="field-group flex-1"><label>الرمز</label><input type="text" value="${data.code || ''}" class="course-code w-full border rounded-lg p-2" required></div>
            <div class="field-group w-12 flex-none"><label>اللون</label><input type="color" value="${data.color || '#3b82f6'}" class="course-color w-full h-10 rounded cursor-pointer border-none p-1"></div>
            <button type="button" class="remove-row text-red-400 p-1 mt-4" data-id="${data.id || ''}"><i data-lucide="trash-2"></i></button>`;
    } else {
        div.innerHTML = `
            <div class="field-group flex-[2]"><label>المسمى</label><input type="text" value="${data.name || ''}" class="item-name w-full border rounded p-2" required></div>
            <div class="field-group flex-1"><label>من</label><input type="date" value="${data.start || ''}" class="item-start w-full border rounded p-1 text-xs" required></div>
            <div class="field-group flex-1"><label>إلى</label><input type="date" value="${data.end || ''}" class="item-end w-full border rounded p-1 text-xs" required></div>
            <button type="button" class="remove-row text-red-400 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        setupDateConstraint(div.querySelector('.item-start'), div.querySelector('.item-end'));
    }

    div.dataset.id = data.id || '';
    container.appendChild(div);
    lucide.createIcons({ target: div });
    div.querySelector('.remove-row').onclick = () => div.remove();
}

// --- التعامل مع النماذج (Forms) ---

document.getElementById('settingsForm').onsubmit = (e) => {
    e.preventDefault();
    universityData.config.startDate = document.getElementById('startDate').value;
    universityData.config.endDate = document.getElementById('endDate').value;

    universityData.courses = Array.from(document.querySelectorAll('#coursesList > div')).map(row => ({
        id: row.dataset.id || 'c_' + Date.now() + Math.random().toString(36).substr(2, 5),
        name: row.querySelector('.course-name').value,
        code: row.querySelector('.course-code').value,
        color: row.querySelector('.course-color').value
    }));

    ['holidays', 'periods', 'procedures'].forEach(type => {
        universityData[type] = Array.from(document.querySelectorAll(`#${type}List > div`)).map(row => ({
            name: row.querySelector('.item-name').value,
            start: row.querySelector('.item-start').value,
            end: row.querySelector('.item-end').value
        }));
    });

    saveData();
    toggleModal(settingsModal, false);
};

function openAddEvent(date) {
    updateCourseSelects();
    document.getElementById('eventDate').value = date;
    toggleModal(eventModal, true);
}

document.getElementById('eventForm').onsubmit = (e) => {
    e.preventDefault();
    universityData.events.push({
        id: 'ev_' + Date.now(),
        courseId: document.getElementById('eventCourse').value,
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        notes: ''
    });
    saveData();
    toggleModal(eventModal, false);
    e.target.reset();
};

// --- تفاصيل الموعد والملاحظات ---

window.showEventDetail = (id) => {
    const ev = universityData.events.find(e => e.id === id);
    if (!ev) return;

    const course = universityData.courses.find(c => c.id == ev.courseId);
    document.getElementById('detailHeader').style.backgroundColor = course ? course.color : '#64748b';
    document.getElementById('detailCourseName').innerText = ev.title;
    document.getElementById('editTitle').value = ev.title;
    document.getElementById('editNotes').value = ev.notes || '';
    document.getElementById('detailDateText').innerText = ev.date;

    toggleModal(detailModal, true);

    document.getElementById('deleteEvent').onclick = () => {
        universityData.events = universityData.events.filter(e => e.id !== id);
        saveData();
        toggleModal(detailModal, false);
    };

    document.getElementById('saveEditEvent').onclick = () => {
        ev.title = document.getElementById('editTitle').value;
        ev.notes = document.getElementById('editNotes').value;
        saveData();
        toggleModal(detailModal, false);
    };
};

// --- نظام الاستيراد والتصدير المطور ---

document.getElementById('exportFull').onclick = () => downloadJSON(universityData, 'التقويم_الجامعي_الكامل.json');

document.getElementById('exportCourse').onclick = () => {
    const cid = document.getElementById('exportCourseId').value;
    const course = universityData.courses.find(c => c.id == cid);
    if(!course) return alert('الرجاء اختيار مقرر');
    const events = universityData.events.filter(ev => ev.courseId == cid);
    downloadJSON({ type: 'course_package', course, events }, `مقرر_${course.name}.json`);
};

document.getElementById('importFullBtn').onclick = () => { universalFilePicker.dataset.mode = 'full'; universalFilePicker.click(); };
document.getElementById('importCourseBtn').onclick = () => { universalFilePicker.dataset.mode = 'merge'; universalFilePicker.click(); };

universalFilePicker.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (universalFilePicker.dataset.mode === 'full') {
                if(confirm('استيراد كامل سيحذف بياناتك الحالية، استمرار؟')) { universityData = imported; saveData(); location.reload(); }
            } else {
                if(imported.type !== 'course_package') return alert('ملف غير صالح لمقرر');
                if(!universityData.courses.find(c => c.id == imported.course.id)) universityData.courses.push(imported.course);
                imported.events.forEach(ev => { if(!universityData.events.find(old => old.date === ev.date && old.title === ev.title)) universityData.events.push(ev); });
                saveData(); alert('تم دمج المقرر والمواعيد بنجاح');
            }
        } catch(err) { alert('فشل قراءة الملف'); }
    };
    reader.readAsText(file);
};

// --- وظائف مساعدة للبيانات ---

function isTypeMatch(date, type) { return universityData[type].some(i => date >= i.start && date <= i.end); }
function getTypeTags(date, type) {
    const item = universityData[type].find(i => date >= i.start && date <= i.end);
    if (!item) return '';
    const colors = { holidays: 'text-orange-600', periods: 'text-purple-600', procedures: 'text-emerald-600' };
    return `<span class="text-[10px] font-bold ${colors[type]} block mt-1">${item.name}</span>`;
}

function updateFilters() {
    const static = `<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="holidays" class="w-4 h-4"><span>الإجازات</span></label>
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="periods" class="w-4 h-4"><span>الفترات</span></label>
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="procedures" class="w-4 h-4"><span>الإجراءات</span></label>
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="general" class="w-4 h-4"><span>عام</span></label>`;
    const courses = universityData.courses.map(c => `<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="${c.id}" class="w-4 h-4" style="accent-color:${c.color}"><span>${c.name}</span></label>`).join('');
    filterContainer.innerHTML = static + courses;
    filterContainer.querySelectorAll('input').forEach(i => i.onchange = renderCalendar);
}

function updateCourseSelects() {
    const selects = [document.getElementById('eventCourse'), document.getElementById('exportCourseId')];
    const options = `<option value="general">موعد عام</option>` + universityData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    selects.forEach(s => { if(s) s.innerHTML = options; });
}

function setupDateConstraint(s, e) { s.onchange = () => { e.min = s.value; if(e.value < s.value) e.value = s.value; }; }

// --- التشغيل الأولي ---

document.getElementById('openSettings').onclick = () => toggleModal(settingsModal, true);
document.getElementById('addEventBtn').onclick = () => openAddEvent(formatDate(new Date()));
document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => { toggleModal(settingsModal, false); toggleModal(eventModal, false); });
document.querySelector('.close-detail').onclick = () => toggleModal(detailModal, false);

document.getElementById('addCourseRow').onclick = () => createRow('coursesList', 'course');
document.getElementById('addHolidayRow').onclick = () => createRow('holidaysList', 'holiday');
document.getElementById('addPeriodRow').onclick = () => createRow('periodsList', 'period');
document.getElementById('addProcedureRow').onclick = () => createRow('proceduresList', 'procedure');

window.onload = () => {
    if (universityData.config.startDate) {
        document.getElementById('startDate').value = universityData.config.startDate;
        document.getElementById('endDate').value = universityData.config.endDate;
        universityData.courses.forEach(c => createRow('coursesList', 'course', c));
        universityData.holidays.forEach(i => createRow('holidaysList', 'holiday', i));
        universityData.periods.forEach(i => createRow('periodsList', 'period', i));
        universityData.procedures.forEach(i => createRow('proceduresList', 'procedure', i));
        renderCalendar();
        updateFilters();
        updateCourseSelects();
    } else {
        hideLoading();
    }
};

document.getElementById('resetAllData').onclick = () => { if(confirm('حذف الكل؟')) { localStorage.removeItem('uniCalendarData'); location.reload(); } };
