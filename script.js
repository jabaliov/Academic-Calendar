let universityData = JSON.parse(localStorage.getItem('uniCalendarData')) || {
    config: { startDate: '', endDate: '' },
    courses: [],
    holidays: [],
    periods: [],
    events: []
};

// العناصر الأساسية
const calendarGrid = document.getElementById('calendarGrid');
const settingsModal = document.getElementById('settingsModal');
const eventModal = document.getElementById('eventModal');
const filterContainer = document.getElementById('filterContainer');

// --- الحفظ والرندرة ---
function saveData() {
    localStorage.setItem('uniCalendarData', JSON.stringify(universityData));
    renderCalendar();
    updateFilters();
}

// --- إدارة النوافذ ---
const toggleModal = (modal, show) => modal.classList.toggle('hidden', !show);

document.getElementById('openSettings').onclick = () => toggleModal(settingsModal, true);
document.getElementById('addEventBtn').onclick = () => {
    populateCourseSelect();
    toggleModal(eventModal, true);
};

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => {
        toggleModal(settingsModal, false);
        toggleModal(eventModal, false);
    };
});

function populateCourseSelect() {
    const select = document.getElementById('eventCourse');
    if (universityData.courses.length === 0) {
        select.innerHTML = '<option value="">لا توجد مقررات مضافة</option>';
        return;
    }
    select.innerHTML = universityData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// --- دالة إنشاء الصفوف في الإعدادات ---
function createRow(containerId, type, data = {}) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2';
    
    if (type === 'course') {
        div.innerHTML = `
            <div class="field-group flex-[2]"><label class="text-[10px] text-gray-400">اسم المقرر</label>
            <input type="text" placeholder="اسم المقرر" value="${data.name || ''}" class="course-name w-full border rounded-lg p-2" required></div>
            <div class="field-group flex-1"><label class="text-[10px] text-gray-400">الرمز</label>
            <input type="text" placeholder="الرمز" value="${data.code || ''}" class="course-code w-full border rounded-lg p-2" required></div>
            <div class="field-group w-12 flex-none"><label class="text-[10px] text-gray-400">اللون</label>
            <input type="color" value="${data.color || '#3b82f6'}" class="course-color w-full h-10 rounded cursor-pointer border-none p-1"></div>
            <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
    } else {
        div.innerHTML = `
            <div class="field-group flex-[2]"><label class="text-[10px] text-gray-400">المسمى</label>
            <input type="text" placeholder="الاسم" value="${data.name || ''}" class="item-name w-full border rounded p-2" required></div>
            <div class="field-group flex-1"><label class="text-[10px] text-gray-400">من</label>
            <input type="date" value="${data.start || ''}" class="item-start w-full border rounded p-1 text-xs" required></div>
            <div class="field-group flex-1"><label class="text-[10px] text-gray-400">إلى</label>
            <input type="date" value="${data.end || ''}" class="item-end w-full border rounded p-1 text-xs" required></div>
            <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        setupDateConstraint(div.querySelector('.item-start'), div.querySelector('.item-end'));
    }

    container.appendChild(div);
    lucide.createIcons({ props: { class: 'w-4 h-4' }, target: div });
    div.querySelector('.remove-row').onclick = () => div.remove();
}

document.getElementById('addCourseRow').onclick = () => createRow('coursesList', 'course');
document.getElementById('addHolidayRow').onclick = () => createRow('holidaysList', 'holiday');
document.getElementById('addPeriodRow').onclick = () => createRow('periodsList', 'period');

// --- حفظ النماذج ---
document.getElementById('settingsForm').onsubmit = (e) => {
    e.preventDefault();
    universityData.config.startDate = document.getElementById('startDate').value;
    universityData.config.endDate = document.getElementById('endDate').value;
    
    universityData.courses = Array.from(document.querySelectorAll('#coursesList > div')).map(row => ({
        id: Date.now() + Math.random(),
        name: row.querySelector('.course-name').value,
        code: row.querySelector('.course-code').value,
        color: row.querySelector('.course-color').value
    }));

    universityData.holidays = Array.from(document.querySelectorAll('#holidaysList > div')).map(row => ({
        name: row.querySelector('.item-name').value,
        start: row.querySelector('.item-start').value,
        end: row.querySelector('.item-end').value
    }));

    universityData.periods = Array.from(document.querySelectorAll('#periodsList > div')).map(row => ({
        name: row.querySelector('.item-name').value,
        start: row.querySelector('.item-start').value,
        end: row.querySelector('.item-end').value
    }));

    saveData();
    toggleModal(settingsModal, false);
};

document.getElementById('eventForm').onsubmit = (e) => {
    e.preventDefault();
    universityData.events.push({
        courseId: document.getElementById('eventCourse').value,
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value
    });
    saveData();
    toggleModal(eventModal, false);
    e.target.reset();
};

// --- توليد التقويم (أداء عالي وإصلاح الحلقة) ---
async function renderCalendar() {
    const { startDate, endDate } = universityData.config;
    if (!startDate || !endDate) {
        hideLoading();
        return;
    }

    const bar = document.getElementById('loadingBar');
    const text = document.getElementById('loadingText');
    document.getElementById('loadingOverlay').classList.remove('fade-out');

    calendarGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    let current = new Date(startDate);
    const last = new Date(endDate);
    const totalDays = Math.ceil((last - current) / (1000 * 60 * 60 * 24)) || 1;
    let processedDays = 0;

    // البدء من يوم الأحد للأسبوع الأول
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
        weekLabel.innerHTML = `<span>الأسبوع</span><span class="text-xl">${weekNumber}</span>`;
        weekRow.appendChild(weekLabel);

        for (let i = 0; i < 7; i++) {
            const dateStr = current.toISOString().split('T')[0];
            
            if (current.getDay() < 5) { // من الأحد إلى الخميس
                const cell = document.createElement('div');
                cell.className = `day-cell ${activeFilters.includes('holidays') && isHoliday(dateStr) ? 'is-holiday' : ''}`;
                
                let eventsHtml = '';
                if (activeFilters.includes('holidays')) eventsHtml += getHolidaysForDay(dateStr);
                if (activeFilters.includes('periods')) eventsHtml += getPeriodsForDay(dateStr);
                
                universityData.events.filter(ev => ev.date === dateStr && activeFilters.includes(ev.courseId)).forEach(ev => {
                    const course = universityData.courses.find(c => c.id == ev.courseId);
                    eventsHtml += `<div class="event-item" style="border-right-color: ${course?.color}; background: ${course?.color}20">${ev.title}</div>`;
                });

                cell.innerHTML = `<div class="day-header"><span class="day-name">${dayNames[current.getDay()]}</span><span class="day-number">${current.getDate()}</span></div>${eventsHtml}`;
                weekRow.appendChild(cell);
            }
            current.setDate(current.getDate() + 1); // زيادة اليوم (إصلاح الحلقة اللانهائية)
        }
        
        fragment.appendChild(weekRow);
        weekNumber++;
        if (weekNumber % 5 === 0) await new Promise(r => requestAnimationFrame(r));
    }

    calendarGrid.appendChild(fragment);
    hideLoading();
}

function hideLoading() {
    setTimeout(() => document.getElementById('loadingOverlay').classList.add('fade-out'), 300);
}

function isHoliday(date) { return universityData.holidays.some(h => date >= h.start && date <= h.end); }
function getHolidaysForDay(date) { 
    const h = universityData.holidays.find(h => date >= h.start && date <= h.end);
    return h ? `<span class="holiday-tag">${h.name}</span>` : '';
}
function getPeriodsForDay(date) {
    const p = universityData.periods.find(p => date >= p.start && date <= p.end);
    return p ? `<div class="text-[10px] bg-purple-100 text-purple-700 p-1 rounded mt-1">${p.name}</div>` : '';
}

function updateFilters() {
    const container = document.getElementById('filterContainer');
    const staticFilters = `
        <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="holidays" class="w-4 h-4"><span>الإجازات</span></label>
        <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked value="periods" class="w-4 h-4"><span>الفترات الهامة</span></label>
    `;
    const courseFilters = universityData.courses.map(c => `
        <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked value="${c.id}" class="w-4 h-4" style="accent-color: ${c.color}">
            <span>${c.name}</span>
        </label>
    `).join('');
    
    container.innerHTML = staticFilters + courseFilters;
    container.querySelectorAll('input').forEach(input => input.onchange = renderCalendar);
}

function setupDateConstraint(startInput, endInput) {
    startInput.addEventListener('change', () => {
        endInput.min = startInput.value;
        if (endInput.value && endInput.value < startInput.value) endInput.value = startInput.value;
    });
}

// التصدير والاستيراد
document.getElementById('exportData').onclick = () => {
    const blob = new Blob([JSON.stringify(universityData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `academic_planner_${new Date().toLocaleDateString()}.json`;
    link.click();
};

const importFile = document.getElementById('importFile');
document.getElementById('importDataBtn').onclick = () => importFile.click();
importFile.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            universityData = JSON.parse(event.target.result);
            saveData();
            location.reload();
        } catch (err) { alert('خطأ في الملف!'); }
    };
    reader.readAsText(e.target.files[0]);
};

window.onload = () => {
    setupDateConstraint(document.getElementById('startDate'), document.getElementById('endDate'));
    if (universityData.config.startDate) {
        document.getElementById('startDate').value = universityData.config.startDate;
        document.getElementById('endDate').value = universityData.config.endDate;
        universityData.courses.forEach(c => createRow('coursesList', 'course', c));
        universityData.holidays.forEach(h => createRow('holidaysList', 'holiday', h));
        universityData.periods.forEach(p => createRow('periodsList', 'period', p));
        renderCalendar();
        updateFilters();
    } else {
        hideLoading();
    }
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
