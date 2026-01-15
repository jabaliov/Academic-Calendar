let universityData = JSON.parse(localStorage.getItem('uniCalendarData')) || {
    config: { startDate: '', endDate: '' },
    courses: [],
    holidays: [],
    periods: [],
    events: []
};

// العناصر
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

// --- النوافذ المنبثقة ---
document.getElementById('openSettings').onclick = () => settingsModal.classList.remove('hidden');
document.getElementById('addEventBtn').onclick = () => {
    populateCourseSelect();
    eventModal.classList.remove('hidden');
};
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => {
        settingsModal.classList.add('hidden');
        eventModal.classList.add('hidden');
    };
});

function populateCourseSelect() {
    const select = document.getElementById('eventCourse');
    select.innerHTML = universityData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// --- إضافة صفوف في الإعدادات (نفس الكود السابق) ---
function createRow(containerId, type, data = {}) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-dashed border-gray-300';
    
    if (type === 'course') {
        div.innerHTML = `<input type="text" placeholder="اسم المقرر" value="${data.name || ''}" class="course-name flex-1 p-1 border rounded" required>
            <input type="text" placeholder="الرمز" value="${data.code || ''}" class="course-code w-20 p-1 border rounded" required>
            <input type="color" value="${data.color || '#3b82f6'}" class="course-color w-10 h-8 rounded cursor-pointer">
            <button type="button" class="text-red-500 remove-row"><i data-lucide="trash-2"></i></button>`;
    } else {
        div.innerHTML = `<input type="text" placeholder="الاسم" value="${data.name || ''}" class="item-name flex-1 p-1 border rounded" required>
            <input type="date" value="${data.start || ''}" class="item-start p-1 border rounded text-xs" required>
            <input type="date" value="${data.end || ''}" class="item-end p-1 border rounded text-xs" required>
            <button type="button" class="text-red-500 remove-row"><i data-lucide="trash-2"></i></button>`;
    }
    container.appendChild(div);
    lucide.createIcons();
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
        id: row.dataset.id || Date.now() + Math.random(),
        name: row.querySelector('.course-name').value,
        code: row.querySelector('.course-code').value,
        color: row.querySelector('.course-color').value
    }));
    universityData.holidays = Array.from(document.querySelectorAll('#holidaysList > div')).map(row => ({
        name: row.querySelector('.item-name').value, start: row.querySelector('.item-start').value, end: row.querySelector('.item-end').value
    }));
    universityData.periods = Array.from(document.querySelectorAll('#periodsList > div')).map(row => ({
        name: row.querySelector('.item-name').value, start: row.querySelector('.item-start').value, end: row.querySelector('.item-end').value
    }));
    saveData();
    settingsModal.classList.add('hidden');
};

document.getElementById('eventForm').onsubmit = (e) => {
    e.preventDefault();
    universityData.events.push({
        courseId: document.getElementById('eventCourse').value,
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value
    });
    saveData();
    eventModal.classList.add('hidden');
    e.target.reset();
};

// --- توليد التقويم ---
function renderCalendar() {
    const { startDate, endDate } = universityData.config;
    if (!startDate || !endDate) return;

    calendarGrid.innerHTML = '';
    let current = new Date(startDate);
    const last = new Date(endDate);
    while (current.getDay() !== 0) current.setDate(current.getDate() - 1);

    const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);

    let weekNumber = 1;
    while (current <= last) {
        const weekRow = document.createElement('div');
        weekRow.className = 'week-row';
        
        const weekLabel = document.createElement('div');
        weekLabel.className = 'week-label';
        weekLabel.innerHTML = `<span>الأسبوع</span><span class="text-xl">${weekNumber}</span>`;
        weekRow.appendChild(weekLabel);

        for (let i = 0; i < 7; i++) {
            const dateStr = current.toISOString().split('T')[0];
            if (current.getDay() < 5) {
                const cell = document.createElement('div');
                cell.className = `day-cell ${activeFilters.includes('holidays') && isHoliday(dateStr) ? 'is-holiday' : ''}`;
                
                let eventsHtml = '';
                if (activeFilters.includes('holidays')) eventsHtml += getHolidaysForDay(dateStr);
                if (activeFilters.includes('periods')) eventsHtml += getPeriodsForDay(dateStr);
                
                // إضافة مواعيد المقررات بناء على الفلتر
                universityData.events.filter(ev => ev.date === dateStr && activeFilters.includes(ev.courseId)).forEach(ev => {
                    const course = universityData.courses.find(c => c.id == ev.courseId);
                    eventsHtml += `<div class="event-item" style="border-right-color: ${course?.color}; background: ${course?.color}20">${ev.title}</div>`;
                });

                const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
                cell.innerHTML = `<div class="day-header"><span class="day-name">${dayNames[current.getDay()]}</span><span class="day-number">${current.getDate()}</span></div>${eventsHtml}`;
                weekRow.appendChild(cell);
            }
            current.setDate(current.getDate() + 1);
        }
        calendarGrid.appendChild(weekRow);
        weekNumber++;
    }
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

// التشغيل الأولي
window.onload = () => {
    if (universityData.config.startDate) {
        document.getElementById('startDate').value = universityData.config.startDate;
        document.getElementById('endDate').value = universityData.config.endDate;
        universityData.courses.forEach(c => createRow('coursesList', 'course', c));
        universityData.holidays.forEach(h => createRow('holidaysList', 'holiday', h));
        universityData.periods.forEach(p => createRow('periodsList', 'period', p));
        renderCalendar();
        updateFilters();
    }
};

// تسجيل الـ Service Worker للعمل Offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
