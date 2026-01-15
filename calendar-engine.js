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
        const totalDays = Math.ceil((last - current) / (1000 * 60 * 60 * 24)) || 1;
        let processedDays = 0;

        // العودة إلى أول يوم أحد في الأسبوع للبدء منه
        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        
        const filterContainer = document.getElementById('filterContainer');
        const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
        
        let academicWeek = 1;

        while (current <= last) {
            processedDays += 7;
            this.updateProgressBar(processedDays, totalDays);

            // منطق التحقق مما إذا كان الأسبوع بالكامل إجازة لتخطي عدّه
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
            weekRow.className = 'week-row';
            
            const weekLabel = document.createElement('div');
            weekLabel.className = 'week-label';
            
            if (isFullHolidayWeek) {
                weekLabel.innerHTML = `<span class="text-[10px] text-orange-500 font-bold uppercase">إجازة</span>`;
            } else {
                weekLabel.innerHTML = `<span>أسبوع</span><span class="text-xl">${academicWeek}</span>`;
                academicWeek++;
            }
            weekRow.appendChild(weekLabel);

            for (let i = 0; i < 7; i++) {
                const dateStr = Utils.formatDate(current);
                if (current.getDay() < 5) { // عرض أيام العمل فقط (الأحد - الخميس)
                    const cell = this.createDayCell(current, dateStr, data, activeFilters);
                    weekRow.appendChild(cell);
                }
                current.setDate(current.getDate() + 1);
            }
            fragment.appendChild(weekRow);
            
            if (academicWeek % 4 === 0) await new Promise(r => requestAnimationFrame(r));
        }

        grid.appendChild(fragment);
        this.hideLoading();
        lucide.createIcons();
    },

    createDayCell(current, dateStr, data, filters) {
        const cell = document.createElement('div');
        const isHoliday = filters.includes('holidays') && data.holidays.some(h => dateStr >= h.start && dateStr <= h.end);
        const isProcedure = filters.includes('procedures') && data.procedures.some(p => dateStr >= p.start && dateStr <= p.end);
        
        cell.className = `day-cell ${isHoliday ? 'is-holiday' : ''} ${isProcedure ? 'is-procedure' : ''}`;
        
        const hijri = Utils.getHijriDate(current);
        // استخدام تقويم gregory صراحة لضمان ظهور الشهر بالميلادي دائماً
        const monthName = current.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long' });
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

        // تنسيق الترويسة: توزيع رقم اليوم والشهر على اليسار، واسم اليوم والهجري على اليمين
        let html = `
            <div class="day-header flex flex-col gap-1 mb-2">
                <div class="flex justify-between items-start">
                    <span class="day-name text-[10px] text-gray-400 font-medium">${dayNames[current.getDay()]}</span>
                    <span class="day-number text-lg font-bold leading-none">${current.getDate()}</span>
                </div>
                <div class="flex justify-between items-center border-t border-gray-100 pt-1">
                    <span class="hijri-date text-[9px] text-gray-500 font-medium">${hijri}</span>
                    <span class="month-name text-[9px] font-bold text-blue-600">${monthName}</span>
                </div>
            </div>`;
        
        // عرض الإجازات، الفترات، والإجراءات
        ['holidays', 'periods', 'procedures'].forEach(type => {
            if (filters.includes(type)) {
                const items = data[type].filter(i => dateStr >= i.start && dateStr <= i.end);
                items.forEach(item => {
                    const safeName = Utils.escapeHTML(item.name);
                    html += `<span class="text-[10px] font-bold ${STATUS_COLORS[type]} block mt-1">${safeName}</span>`;
                });
            }
        });

        // عرض المواعيد الدراسية
        data.events.filter(ev => ev.date === dateStr && filters.includes(ev.courseId)).forEach(ev => {
            const course = data.courses.find(c => c.id == ev.courseId);
            const color = course ? course.color : '#64748b';
            const safeCourseName = Utils.escapeHTML(course ? course.name : 'عام');
            const safeEventTitle = Utils.escapeHTML(ev.title);
            
            html += `
                <div class="event-item" style="border-right-color: ${color}; background: ${color}15" onclick="event.stopPropagation(); App.showEventDetail('${ev.id}')">
                    <span class="text-[9px] opacity-60 block">${safeCourseName}</span>
                    <span class="truncate block">${safeEventTitle}</span>
                </div>`;
        });

        cell.innerHTML = html;
        cell.onclick = () => App.openAddEvent(dateStr);
        return cell;
    },

    showLoading() { document.getElementById('loadingOverlay').classList.remove('fade-out'); },
    hideLoading() { 
        setTimeout(() => {
            const loader = document.getElementById('loadingOverlay');
            if(loader) loader.classList.add('fade-out');
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
