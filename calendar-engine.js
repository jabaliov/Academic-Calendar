/**
 * CalendarEngine.js
 * المحرك البصري للتقويم الأكاديمي - النسخة الاحترافية المطورة
 * يركز على تجربة المستخدم (UX) والتسلسل الهرمي للمعلومات.
 */

const CalendarEngine = {
    async render(data) {
        const { startDate, endDate } = data.config;
        if (!startDate || !endDate) return this.hideLoading();

        this.showLoading();
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        let current = new Date(startDate);
        const last = new Date(endDate);
        const today = new Date();
        const totalDays = Math.ceil((last - current) / (1000 * 60 * 60 * 24)) || 1;
        let processedDays = 0;

        // البدء دائماً من يوم الأحد لضمان اتساق شكل الأسبوع
        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        
        const filterContainer = document.getElementById('filterContainer');
        const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
        
        let academicWeek = 1;

        while (current <= last) {
            processedDays += 7;
            this.updateProgressBar(processedDays, totalDays);

            // منطق: التحقق مما إذا كان الأسبوع بالكامل إجازة لتخطي عدّه دراسياً
            let isFullHolidayWeek = true;
            let tempDate = new Date(current);
            for (let i = 0; i < 7; i++) {
                const ds = Utils.formatDate(tempDate);
                if (!data.holidays.some(h => ds >= h.start && ds <= h.end)) {
                    isFullHolidayWeek = false;
                    break;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }

            const weekRow = document.createElement('div');
            // شبكة متجاوبة: عمود للرقم وعمود للأيام
            weekRow.className = 'grid grid-cols-1 md:grid-cols-[100px_1fr] gap-6 mb-10 items-stretch';
            
            const weekLabel = document.createElement('div');
            weekLabel.className = 'flex md:flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-4 transition-all hover:shadow-md';
            
            if (isFullHolidayWeek) {
                weekLabel.innerHTML = `<span class="text-[10px] font-black text-orange-500 uppercase md:rotate-180 md:[writing-mode:vertical-lr] tracking-[0.2em]">إجازة رسمية</span>`;
                weekLabel.classList.add('bg-orange-50/40', 'border-orange-100');
            } else {
                weekLabel.innerHTML = `
                    <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">الأسبوع</span>
                    <span class="text-4xl font-black text-blue-600 leading-none">${academicWeek}</span>
                `;
                academicWeek++;
            }
            weekRow.appendChild(weekLabel);

            const daysGrid = document.createElement('div');
            daysGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 flex-1';

            for (let i = 0; i < 7; i++) {
                const dateStr = Utils.formatDate(current);
                if (current.getDay() < 5) { // عرض الأحد إلى الخميس
                    const isToday = Utils.formatDate(today) === dateStr;
                    const cell = this.createDayCell(current, dateStr, data, activeFilters, isToday);
                    daysGrid.appendChild(cell);
                }
                current.setDate(current.getDate() + 1);
            }
            weekRow.appendChild(daysGrid);
            fragment.appendChild(weekRow);
            
            if (academicWeek % 4 === 0) await new Promise(r => requestAnimationFrame(r));
        }

        grid.appendChild(fragment);
        this.hideLoading();
        lucide.createIcons();
    },

    createDayCell(current, dateStr, data, filters, isToday) {
        const cell = document.createElement('div');
        const isHoliday = filters.includes('holidays') && data.holidays.some(h => dateStr >= h.start && dateStr <= h.end);
        const isProcedure = filters.includes('procedures') && data.procedures.some(p => dateStr >= p.start && dateStr <= p.end);
        
        cell.className = `group relative bg-white rounded-[2.5rem] p-6 border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/40 hover:-translate-y-1 cursor-pointer flex flex-col min-h-[180px] ${isToday ? 'ring-2 ring-blue-500 ring-offset-4' : ''} ${isHoliday ? 'bg-orange-50/10' : ''}`;
        
        const hijri = Utils.getHijriDate(current);
        const monthName = current.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long' });
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

        // تصميم الترويسة الاحترافي (رقم اليوم، الشهر، الهجري، واسم اليوم)
        let html = `
            <div class="flex justify-between items-start mb-5">
                <div class="flex flex-col">
                    <span class="text-4xl font-light text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">${current.getDate()}</span>
                    <div class="flex flex-col mt-1">
                        <span class="text-[10px] font-black text-blue-600 uppercase tracking-tight">${monthName}</span>
                        <span class="text-[10px] font-bold text-slate-400 mt-0.5">${hijri}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-[10px] font-black text-slate-300 group-hover:text-slate-500 transition-colors tracking-widest uppercase">${dayNames[current.getDay()]}</span>
                    ${isToday ? '<span class="flex h-2 w-2 rounded-full bg-blue-600 mt-2 animate-pulse"></span>' : ''}
                </div>
            </div>`;
        
        // عرض التصنيفات العامة (إجازات، فترات، إجراءات)
        const categories = [
            { id: 'holidays', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-100' },
            { id: 'periods', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-100' },
            { id: 'procedures', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-100' }
        ];

        categories.forEach(cat => {
            if (filters.includes(cat.id)) {
                const items = data[cat.id].filter(i => dateStr >= i.start && dateStr <= i.end);
                items.forEach(item => {
                    html += `
                        <div class="flex items-center gap-2 mb-1.5 animate-in fade-in slide-in-from-right-2">
                            <span class="w-1 h-3 rounded-full ${cat.color}"></span>
                            <span class="text-[9px] font-black ${cat.text} truncate">${Utils.escapeHTML(item.name)}</span>
                        </div>`;
                });
            }
        });

        // عرض المواعيد الدراسية (دعم المواعيد الممتدة والملاحظات)
        data.events.filter(ev => dateStr >= ev.start && dateStr <= ev.end && filters.includes(ev.courseId)).forEach(ev => {
            const course = data.courses.find(c => c.id == ev.courseId);
            const color = course ? course.color : '#64748B';
            const isRange = ev.start !== ev.end;
            
            html += `
                <div class="event-card group/ev relative overflow-hidden p-3 rounded-2xl transition-all hover:scale-[1.03] active:scale-95 shadow-sm border border-slate-50 mb-2" 
                     style="background: ${color}08; border-right: 4px solid ${color}"
                     title="${Utils.escapeHTML(ev.notes || '')}"
                     onclick="event.stopPropagation(); App.showEventDetail('${ev.id}')">
                    <div class="flex flex-col">
                        <span class="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">${Utils.escapeHTML(course ? course.name : 'عام')}</span>
                        <span class="text-[10px] font-bold text-slate-800 leading-tight truncate">${Utils.escapeHTML(ev.title)}</span>
                        ${isRange ? '<span class="text-[7px] text-blue-500 font-bold italic mt-1">موعد ممتد</span>' : ''}
                    </div>
                </div>`;
        });

        cell.innerHTML = html;
        cell.onclick = () => App.openAddEvent(dateStr);
        return cell;
    },

    showLoading() { document.getElementById('loadingOverlay')?.classList.remove('fade-out'); },
    hideLoading() { 
        setTimeout(() => {
            document.getElementById('loadingOverlay')?.classList.add('fade-out');
        }, 300); 
    },
    updateProgressBar(p, t) {
        const progress = Math.min(Math.round((p / t) * 100), 100);
        const bar = document.getElementById('loadingBar');
        const text = document.getElementById('loadingText');
        if(bar) bar.style.width = `${progress}%`;
        if(text) text.innerText = `${progress}%`;
    }
};
