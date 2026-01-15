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

        // البدء من بداية الأسبوع (الأحد)
        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        
        const filterContainer = document.getElementById('filterContainer');
        const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(i => i.value);
        
        let weekNumber = 1;

        while (current <= last) {
            processedDays += 7;
            this.updateProgressBar(processedDays, totalDays);

            // ميزة: التحقق مما إذا كان الأسبوع بالكامل إجازة لعدم حِسبانه في ترقيم الأسابيع الدراسية
            let isFullHolidayWeek = true;
            let tempDate = new Date(current);
            for (let i = 0; i < 7; i++) {
                const ds = Utils.formatDate(tempDate);
                // يعتبر الأسبوع دراسياً إذا وجد فيه يوم واحد على الأقل ليس ضمن الإجازات
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
                weekLabel.innerHTML = `<span>أسبوع</span><span class="text-xl">${weekNumber}</span>`;
                weekNumber++;
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
            
            // تحسين الأداء عبر requestAnimationFrame كل 4 أسابيع
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
        // ميزة: جلب اسم الشهر الميلادي باللغة العربية
        const monthName = current.toLocaleDateString('ar-SA', { month: 'long' });
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

        let html = `
            <div class="day-header">
                <div class="flex flex-col">
                    <span class="day-name">${dayNames[current.getDay()]}</span>
                    <span class="text-[9px] text-blue-500 font-bold">${monthName}</span>
                    <span class="hijri-date">${hijri}</span>
                </div>
                <span class="day-number">${current.getDate()}</span>
            </div>`;
        
        // عرض الإجازات العامة
        if (filters.includes('holidays')) {
            const holiday = data.holidays.find(h => dateStr >= h.start && dateStr <= h.end);
            if (holiday) {
                html += `<span class="text-[10px] font-bold text-orange-600 block mt-1">${Utils.escapeHTML(holiday.name)}</span>`;
            }
        }

        // ميزة: عرض الفترات المرتبطة بالمقررات (مع الملاحظات)
        if (filters.includes('periods')) {
            data.periods.filter(p => dateStr >= p.start && dateStr <= p.end && (p.courseId === 'general' || filters.includes(p.courseId))).forEach(p => {
                const course = data.courses.find(c => c.id == p.courseId);
                const color = course ? course.color : '#9333ea';
                html += `
                    <div class="text-[9px] p-1 mt-1 rounded border-r-2 bg-purple-50 border-purple-600" title="${Utils.escapeHTML(p.notes || '')}">
                        <span class="font-bold block">${Utils.escapeHTML(p.name)}</span>
                        ${p.notes ? `<span class="opacity-70 italic block">${Utils.escapeHTML(p.notes)}</span>` : ''}
                    </div>`;
            });
        }

        // عرض الإجراءات الأكاديمية
        if (filters.includes('procedures')) {
            const procedure = data.procedures.find(p => dateStr >= p.start && dateStr <= p.end);
            if (procedure) {
                html += `<span class="text-[10px] font-bold text-emerald-600 block mt-1">${Utils.escapeHTML(procedure.name)}</span>`;
            }
        }

        // عرض المواعيد الفردية (Events)
        data.events.filter(ev => ev.date === dateStr && filters.includes(ev.courseId)).forEach(ev => {
            const course = data.courses.find(c => c.id == ev.courseId);
            const color = course ? course.color : '#64748b';
            const safeCourseName = Utils.escapeHTML(course ? course.name : 'عام');
            const safeEventTitle = Utils.escapeHTML(ev.title);
            
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

    showLoading() { 
        const loader = document.getElementById('loadingOverlay');
        if(loader) loader.classList.remove('fade-out'); 
    },
    
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
