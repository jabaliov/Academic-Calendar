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

        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        
        // تحسين: التأكد من جلب الفلاتر بشكل صحيح
        const filterContainer = document.getElementById('filterContainer');
        const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
        
        let weekNumber = 1;

        while (current <= last) {
            processedDays += 7;
            this.updateProgressBar(processedDays, totalDays);

            const weekRow = document.createElement('div');
            weekRow.className = 'week-row';
            
            const weekLabel = document.createElement('div');
            weekLabel.className = 'week-label';
            weekLabel.innerHTML = `<span>أسبوع</span><span class="text-xl">${weekNumber}</span>`;
            weekRow.appendChild(weekLabel);

            for (let i = 0; i < 7; i++) {
                const dateStr = Utils.formatDate(current);
                if (current.getDay() < 5) {
                    const cell = this.createDayCell(current, dateStr, data, activeFilters);
                    weekRow.appendChild(cell);
                }
                current.setDate(current.getDate() + 1);
            }
            fragment.appendChild(weekRow);
            weekNumber++;
            if (weekNumber % 4 === 0) await new Promise(r => requestAnimationFrame(r));
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
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

        // ترويسة اليوم (نصوص ثابتة أو محسوبة لا تحتاج تنظيف، لكننا نحافظ على الهيكل)
        let html = `
            <div class="day-header">
                <div class="flex flex-col">
                    <span class="day-name">${dayNames[current.getDay()]}</span>
                    <span class="hijri-date">${hijri}</span>
                </div>
                <span class="day-number">${current.getDate()}</span>
            </div>`;
        
        // تنظيف أسماء الإجازات والفترات
        ['holidays', 'periods', 'procedures'].forEach(type => {
            if (filters.includes(type)) {
                const item = data[type].find(i => dateStr >= i.start && dateStr <= i.end);
                if (item) {
                    const safeName = Utils.escapeHTML(item.name); // تأمين الاسم هنا
                    html += `<span class="text-[10px] font-bold ${STATUS_COLORS[type]} block mt-1">${safeName}</span>`;
                }
            }
        });

        // تنظيف أسماء المقررات وعناوين المواعيد
        data.events.filter(ev => ev.date === dateStr && filters.includes(ev.courseId)).forEach(ev => {
            const course = data.courses.find(c => c.id == ev.courseId);
            const color = course ? course.color : '#64748b';
            const safeCourseName = Utils.escapeHTML(course ? course.name : 'عام'); // تأمين اسم المقرر
            const safeEventTitle = Utils.escapeHTML(ev.title); // تأمين عنوان الموعد
            
            html += `
                <div class="event-item" style="border-right-color: ${color}; background: ${color}15" onclick="event.stopPropagation(); App.showEventDetail('${ev.id}')">
                    <span class="text-[9px] opacity-60 block">${safeCourseName}</span>
                    ${safeEventTitle}
                </div>`;
        });

        cell.innerHTML = html;
        cell.onclick = () => App.openAddEvent(dateStr);
        return cell;
    },

    showLoading() { document.getElementById('loadingOverlay').classList.remove('fade-out'); },
    hideLoading() { setTimeout(() => {
        const loader = document.getElementById('loadingOverlay');
        if(loader) loader.classList.add('fade-out');
    }, 300); },
    updateProgressBar(p, t) {
        const progress = Math.min(Math.round((p / t) * 100), 100);
        const bar = document.getElementById('loadingBar');
        const text = document.getElementById('loadingText');
        if(bar) bar.style.width = `${progress}%`;
        if(text) text.innerText = `${progress}%`;
    }
};
