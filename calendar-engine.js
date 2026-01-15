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

        // ضبط البداية لتكون من أول يوم أحد في الأسبوع
        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        
        const filterContainer = document.getElementById('filterContainer');
        const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
        
        let academicWeek = 1;

        while (current <= last) {
            processedDays += 7;
            this.updateProgressBar(processedDays, totalDays);

            // تحديد ما إذا كان الأسبوع إجازة كاملة لتخطي العد
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
            // تحويل الصف لشبكة (Grid) لضمان التجاوب الاحترافي
            weekRow.className = 'grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4 mb-8 items-stretch';
            
            const weekLabel = document.createElement('div');
            weekLabel.className = 'flex md:flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm p-4';
            
            if (isFullHolidayWeek) {
                weekLabel.innerHTML = `<span class="text-[10px] font-black text-orange-400 uppercase md:rotate-180 md:[writing-mode:vertical-lr] tracking-widest">إجازة رسمية</span>`;
                weekLabel.classList.add('bg-orange-50/30', 'border-orange-100');
            } else {
                weekLabel.innerHTML = `
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">الأسبوع</span>
                    <span class="text-3xl font-black text-blue-600 leading-none">${academicWeek}</span>
                `;
                academicWeek++;
            }
            weekRow.appendChild(weekLabel);

            const daysContainer = document.createElement('div');
            daysContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1';

            for (let i = 0; i < 7; i++) {
                const dateStr = Utils.formatDate(current);
                if (current.getDay() < 5) { // الأحد - الخميس
                    const isToday = Utils.formatDate(today) === dateStr;
                    const cell = this.createDayCell(current, dateStr, data, activeFilters, isToday);
                    daysContainer.appendChild(cell);
                }
                current.setDate(current.getDate() + 1);
            }
            weekRow.appendChild(daysContainer);
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
        
        // تصميم الخلية الأساسي بلمسة Apple (Rounded corners, subtle shadows, smooth hover)
        cell.className = `group relative bg-white rounded-[2rem] p-4 border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/40 hover:-translate-y-1 cursor-pointer flex flex-col min-h-[160px] ${isToday ? 'ring-2 ring-blue-500 ring-offset-4' : ''} ${isHoliday ? 'bg-orange-50/20' : ''}`;
        
        const hijri = Utils.getHijriDate(current);
        const monthName = current.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long' });
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

        // ترويسة اليوم: تصميم نظيف يركز على الرقم مع معلومات ثانوية أنيقة
        let html = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex flex-col">
                    <span class="text-4xl font-light text-slate-800 tracking-tighter group-hover:text-blue-600 transition-colors duration-300">${current.getDate()}</span>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-black text-blue-500 uppercase tracking-tight">${monthName}</span>
                        <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span class="text-[10px] font-bold text-slate-400">${hijri}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-[10px] font-black text-slate-300 group-hover:text-slate-500 transition-colors uppercase tracking-widest">${dayNames[current.getDay()]}</span>
                    ${isToday ? '<span class="flex h-2 w-2 rounded-full bg-blue-500 mt-2"></span>' : ''}
                </div>
            </div>`;
        
        // المحتوى: الفئات (Pills) والمواعيد
        const contentContainer = document.createElement('div');
        contentContainer.className = 'space-y-2 flex-1';

        // عرض الإجازات والفترات كـ "كبسولات" ملونة أنيقة
        ['holidays', 'periods', 'procedures'].forEach(type => {
            if (filters.includes(type)) {
                const items = data[type].filter(i => dateStr >= i.start && dateStr <= i.end);
                items.forEach(item => {
                    const bgColor = type === 'holidays' ? 'bg-orange-100 text-orange-700' : type === 'periods' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700';
                    html += `
                        <div class="inline-flex items-center px-2 py-0.5 rounded-full ${bgColor} text-[9px] font-black mb-1 mr-1 animate-in fade-in zoom-in duration-500">
                            ${Utils.escapeHTML(item.name)}
                        </div>`;
                });
            }
        });

        // المواعيد الدراسية (Events): تصميم يشبه بطاقات Google Calendar
        data.events.filter(ev => ev.date === dateStr && filters.includes(ev.courseId)).forEach(ev => {
            const course = data.courses.find(c => c.id == ev.courseId);
            const color = course ? course.color : '#64748b';
            html += `
                <div class="relative overflow-hidden p-2.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-sm mb-1.5" style="background: ${color}08; border-right: 4px solid ${color}" onclick="event.stopPropagation(); App.showEventDetail('${ev.id}')">
                    <span class="text-[8px] font-black opacity-50 block uppercase tracking-tighter mb-0.5">${Utils.escapeHTML(course ? course.name : 'عام')}</span>
                    <span class="text-[11px] font-bold text-slate-700 leading-tight block truncate">${Utils.escapeHTML(ev.title)}</span>
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
