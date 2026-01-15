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

        // ضبط البداية لتكون من أول يوم أحد في الأسبوع
        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        
        const filterContainer = document.getElementById('filterContainer');
        const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
        
        let academicWeek = 1;

        while (current <= last) {
            processedDays += 7;
            this.updateProgressBar(processedDays, totalDays);

            // ميزة: التحقق من أسابيع الإجازات الكاملة
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
                weekLabel.innerHTML = `<span class="text-[9px] text-orange-500 font-black uppercase tracking-tighter rotate-180 [writing-mode:vertical-lr]">إجازة رسمية</span>`;
            } else {
                weekLabel.innerHTML = `<span>أسبوع</span><span class="text-xl font-black">${academicWeek}</span>`;
                academicWeek++;
            }
            weekRow.appendChild(weekLabel);

            for (let i = 0; i < 7; i++) {
                const dateStr = Utils.formatDate(current);
                if (current.getDay() < 5) { // الأحد - الخميس
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
        
        cell.className = `day-cell group ${isHoliday ? 'is-holiday' : ''} ${isProcedure ? 'is-procedure' : ''}`;
        
        const hijri = Utils.getHijriDate(current); //
        const monthName = current.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long' });
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

        // التصميم الجديد والمطور للترويسة (Professional Design)
        let html = `
            <div class="day-header flex flex-col mb-4">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex flex-col">
                        <span class="day-number text-3xl font-black text-slate-900 leading-none tracking-tighter group-hover:text-blue-600 transition-colors">${current.getDate()}</span>
                        <span class="month-name text-[10px] font-black text-blue-600 uppercase tracking-tight mt-1">${monthName}</span>
                    </div>
                    <span class="day-name text-[10px] font-bold text-slate-400 border-r-2 border-slate-200 pr-2 h-fit mt-1 uppercase tracking-widest">${dayNames[current.getDay()]}</span>
                </div>
                <div class="flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-xl border border-slate-100/50 group-hover:bg-white transition-colors">
                    <span class="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-40 group-hover:opacity-100"></span>
                    <span class="hijri-date text-[10px] text-slate-500 font-bold tracking-tight">${hijri}</span>
                </div>
            </div>`;
        
        // عرض التصنيفات (إجازات، فترات، إجراءات) بتصميم مبسط
        ['holidays', 'periods', 'procedures'].forEach(type => {
            if (filters.includes(type)) {
                const items = data[type].filter(i => dateStr >= i.start && dateStr <= i.end);
                items.forEach(item => {
                    html += `
                        <div class="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-right-1 duration-300">
                            <span class="w-1 h-3 rounded-full ${this.getIndicatorColor(type)}"></span>
                            <span class="text-[10px] font-black ${STATUS_COLORS[type]} truncate">${Utils.escapeHTML(item.name)}</span>
                        </div>`;
                });
            }
        });

        // عرض المواعيد الدراسية (Events)
        data.events.filter(ev => ev.date === dateStr && filters.includes(ev.courseId)).forEach(ev => {
            const course = data.courses.find(c => c.id == ev.courseId);
            const color = course ? course.color : '#64748b';
            html += `
                <div class="event-item group/ev" style="border-right-color: ${color}; background: ${color}10" onclick="event.stopPropagation(); App.showEventDetail('${ev.id}')">
                    <div class="flex flex-col overflow-hidden">
                        <span class="text-[8px] font-bold opacity-50 uppercase tracking-tighter">${Utils.escapeHTML(course ? course.name : 'عام')}</span>
                        <span class="text-[10px] font-bold text-slate-700 truncate">${Utils.escapeHTML(ev.title)}</span>
                    </div>
                </div>`;
        });

        cell.innerHTML = html;
        cell.onclick = () => App.openAddEvent(dateStr);
        return cell;
    },

    // دالة مساعدة للألوان الجانبية
    getIndicatorColor(type) {
        const colors = { holidays: 'bg-orange-500', periods: 'bg-purple-500', procedures: 'bg-emerald-500' };
        return colors[type] || 'bg-slate-300';
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
