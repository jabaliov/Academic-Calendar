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
    select.innerHTML = universityData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// --- دالة إنشاء الصفوف (موحدة ومنظمة) ---
function createRow(containerId, type, data = {}) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2';
    
    if (type === 'course') {
        div.innerHTML = `
            <div class="field-group flex-[2]"><label>اسم المقرر</label>
            <input type="text" placeholder="اسم المقرر" value="${data.name || ''}" class="course-name w-full border rounded-lg p-2" required></div>
            <div class="field-group flex-1"><label>الرمز</label>
            <input type="text" placeholder="الرمز" value="${data.code || ''}" class="course-code w-full border rounded-lg p-2" required></div>
            <div class="field-group w-12 flex-none"><label>اللون</label>
            <input type="color" value="${data.color || '#3b82f6'}" class="course-color w-full h-10 rounded cursor-pointer border-none p-1"></div>
            <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
    } else {
        div.innerHTML = `
            <div class="field-group flex-[2]"><label>المسمى</label>
            <input type="text" placeholder="الاسم" value="${data.name || ''}" class="item-name w-full border rounded p-2" required></div>
            <div class="field-group flex-1"><label>من</label>
            <input type="date" value="${data.start || ''}" class="item-start w-full border rounded p-1 text-xs" required></div>
            <div class="field-group flex-1"><label>إلى</label>
            <input type="date" value="${data.end || ''}" class="item-end w-full border rounded p-1 text-xs" required></div>
            <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        setupDateConstraint(div.querySelector('.item-start'), div.querySelector('.item-end'));
    }

    container.appendChild(div);
    lucide.createIcons({ props: { class: 'w-4 h-4' }, target: div }); // استهداف الصف الجديد فقط
    div.querySelector('.remove-row').onclick = () => div.remove();
}

// --- توليد التقويم (أداء عالي) ---
async function renderCalendar() {
    const { startDate, endDate } = universityData.config;
    if (!startDate || !endDate) return hideLoading();

    const bar = document.getElementById('loadingBar');
    const text = document.getElementById('loadingText');
    document.getElementById('loadingOverlay').classList.remove('fade-out');

    calendarGrid.innerHTML = '';
    const fragment = document.createDocumentFragment(); // استخدام Fragment للأداء
    
    let current = new Date(startDate);
    const last = new Date(endDate);
    const totalDays = Math.ceil((last - current) / (1000 * 60 * 60 * 24));
    let processedDays = 0;

    while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
    const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
    let weekNumber = 1;

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

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
            if (current.getDay() < 5) {
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
            current.setDate(current.getDate() + 1);
        }
        fragment.appendChild(weekRow);
        weekNumber++;
        if (weekNumber % 5 === 0) await new Promise(r => requestAnimationFrame(r)); // استخدام Frame بدلاً من Timeout
    }

    calendarGrid.appendChild(fragment); // إضافة كل الأسابيع مرة واحدة
    hideLoading();
}

// ... بقية الدوال المساعدة (isHoliday, getHolidaysForDay, setupDateConstraint, إلخ) تظل كما هي ...

function hideLoading() {
    setTimeout(() => document.getElementById('loadingOverlay').classList.add('fade-out'), 300);
}
