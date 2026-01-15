// الكائن الأساسي للبيانات - يتم تحميله من LocalStorage أو كقيم افتراضية
let universityData = JSON.parse(localStorage.getItem('uniCalendarData')) || {
    config: { startDate: '', endDate: '' },
    courses: [],
    holidays: [],
    periods: [],
    events: []
};

// عناصر واجهة المستخدم
const calendarGrid = document.getElementById('calendarGrid');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const filterContainer = document.getElementById('filterContainer');

// --- وظائف التخزين ---
function saveData() {
    localStorage.setItem('uniCalendarData', JSON.stringify(universityData));
    renderCalendar();
    updateFilters();
}

// --- وظائف المودال (النوافذ المنبثقة) ---
document.getElementById('openSettings').onclick = () => settingsModal.classList.remove('hidden');
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => settingsModal.classList.add('hidden');
});

// --- إضافة صفوف ديناميكية في الإعدادات ---
function createRow(containerId, type, data = {}) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-dashed border-gray-300';
    
    if (type === 'course') {
        div.innerHTML = `
            <input type="text" placeholder="اسم المقرر" value="${data.name || ''}" class="course-name flex-1 p-1 border rounded" required>
            <input type="text" placeholder="الرمز" value="${data.code || ''}" class="course-code w-20 p-1 border rounded" required>
            <input type="color" value="${data.color || '#3b82f6'}" class="course-color w-10 h-8 rounded cursor-pointer">
            <button type="button" class="text-red-500 remove-row"><i data-lucide="trash-2"></i></button>
        `;
    } else if (type === 'holiday' || type === 'period') {
        div.innerHTML = `
            <input type="text" placeholder="الاسم" value="${data.name || ''}" class="item-name flex-1 p-1 border rounded" required>
            <input type="date" value="${data.start || ''}" class="item-start p-1 border rounded text-xs" required>
            <input type="date" value="${data.end || ''}" class="item-end p-1 border rounded text-xs" required>
            <button type="button" class="text-red-500 remove-row"><i data-lucide="trash-2"></i></button>
        `;
    }

    container.appendChild(div);
    lucide.createIcons();
    div.querySelector('.remove-row').onclick = () => div.remove();
}

document.getElementById('addCourseRow').onclick = () => createRow('coursesList', 'course');
document.getElementById('addHolidayRow').onclick = () => createRow('holidaysList', 'holiday');
document.getElementById('addPeriodRow').onclick = () => createRow('periodsList', 'period');

// --- حفظ الإعدادات ---
settingsForm.onsubmit = (e) => {
    e.preventDefault();
    
    universityData.config.startDate = document.getElementById('startDate').value;
    universityData.config.endDate = document.getElementById('endDate').value;

    // تجميع المقررات
    universityData.courses = Array.from(document.querySelectorAll('#coursesList > div')).map(row => ({
        id: Date.now() + Math.random(),
        name: row.querySelector('.course-name').value,
        code: row.querySelector('.course-code').value,
        color: row.querySelector('.course-color').value
    }));

    // تجميع الإجازات
    universityData.holidays = Array.from(document.querySelectorAll('#holidaysList > div')).map(row => ({
        name: row.querySelector('.item-name').value,
        start: row.querySelector('.item-start').value,
        end: row.querySelector('.item-end').value
    }));

    // تجميع الفترات
    universityData.periods = Array.from(document.querySelectorAll('#periodsList > div')).map(row => ({
        name: row.querySelector('.item-name').value,
        start: row.querySelector('.item-start').value,
        end: row.querySelector('.item-end').value
    }));

    saveData();
    settingsModal.classList.add('hidden');
};

// --- منطق توليد التقويم ---
function renderCalendar() {
    const { startDate, endDate } = universityData.config;
    if (!startDate || !endDate) return;

    calendarGrid.innerHTML = '';
    let current = new Date(startDate);
    const last = new Date(endDate);
    
    // ضبط البداية لتكون الأحد (لأول أسبوع)
    while (current.getDay() !== 0) { 
        current.setDate(current.getDate() - 1); 
    }

    let weekNumber = 1;
    while (current <= last) {
        const weekRow = document.createElement('div');
        weekRow.className = 'week-row';
        
        // عمود رقم الأسبوع
        const weekLabel = document.createElement('div');
        weekLabel.className = 'week-label';
        weekLabel.innerHTML = `<span>الأسبوع</span><span class="text-xl">${weekNumber}</span>`;
        weekRow.appendChild(weekLabel);

        // توليد الأيام (من الأحد 0 إلى الخميس 4)
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(current);
            const dateStr = dayDate.toISOString().split('T')[0];
            
            // تخطي الجمعة (5) والسبت (6)
            if (dayDate.getDay() < 5) {
                const cell = document.createElement('div');
                cell.className = `day-cell ${isHoliday(dateStr) ? 'is-holiday' : ''} ${isPeriod(dateStr) ? 'is-period' : ''}`;
                
                const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
                
                cell.innerHTML = `
                    <div class="day-header">
                        <span class="day-name">${dayNames[dayDate.getDay()]}</span>
                        <span class="day-number">${dayDate.getDate()} / ${dayDate.getMonth() + 1}</span>
                    </div>
                    ${getHolidaysForDay(dateStr)}
                    ${getPeriodsForDay(dateStr)}
                `;
                
                weekRow.appendChild(cell);
            }
            current.setDate(current.getDate() + 1);
        }
        
        calendarGrid.appendChild(weekRow);
        weekNumber++;
    }
}

// وظائف مساعدة للتحقق من التواريخ
function isHoliday(date) {
    return universityData.holidays.some(h => date >= h.start && date <= h.end);
}

function getHolidaysForDay(date) {
    const holiday = universityData.holidays.find(h => date >= h.start && date <= h.end);
    return holiday ? `<span class="holiday-tag">${holiday.name}</span>` : '';
}

function isPeriod(date) {
    return universityData.periods.some(p => date >= p.start && date <= p.end);
}

function getPeriodsForDay(date) {
    const period = universityData.periods.find(p => date >= p.start && date <= p.end);
    return period ? `<div class="text-[10px] bg-purple-100 text-purple-700 p-1 rounded mt-1">${period.name}</div>` : '';
}

// --- تحديث الفلاتر ---
function updateFilters() {
    const coursesArea = filterContainer.querySelectorAll('.course-filter');
    coursesArea.forEach(el => el.remove());

    universityData.courses.forEach(course => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer course-filter';
        label.innerHTML = `
            <input type="checkbox" checked value="${course.id}" class="w-4 h-4 rounded" style="accent-color: ${course.color}">
            <span>${course.name}</span>
        `;
        filterContainer.appendChild(label);
    });
}

// --- عند التحميل الأولي ---
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
