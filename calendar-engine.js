/**
 * calendar-engine.js - محرك رندر التقويم الذكي
 * مسؤول عن تحويل البيانات إلى واجهات رسومية ومعالجة منطق الأوقات المعقد.
 */

const CalendarEngine = {
    /**
     * الوظيفة الرئيسية لبدء رسم التقويم
     */
    render(data) {
        const container = document.getElementById('calendarGrid');
        if (!container) return;

        container.innerHTML = ''; // تنظيف الشبكة الحالية
        this.showLoading();

        if (!data.config.startDate || !data.config.endDate) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                    <i data-lucide="calendar-days" class="w-16 h-16 mb-4 opacity-20"></i>
                    <p class="font-bold text-lg">برجاء تهيئة النطاق الزمني من الإعدادات</p>
                </div>`;
            lucide.createIcons();
            this.hideLoading();
            return;
        }

        // استخراج التواريخ وبناء الشهور
        const months = this.getMonthsRange(data.config.startDate, data.config.endDate);
        
        months.forEach(month => {
            const monthHTML = this.renderMonth(month.year, month.month, data);
            container.appendChild(monthHTML);
        });

        lucide.createIcons();
        this.hideLoading();
    },

    /**
     * معالجة منطق الوقت لكل حدث (محاضرة أو موعد يدوي)
     * هنا يتم تحديد الوقت بناءً على: رقم الحصة، الجنس، ووضع رمضان
     */
    getEventTimeDisplay(event, config) {
        // إذا كان موعداً يدوياً عادياً بدون حصص
        if (!event.periods || event.periods.length === 0) {
            return event.startTime ? `${event.startTime}` : "موعد طوال اليوم";
        }

        // تحديد قائمة الأوقات المرجعية المناسبة
        let mapping;
        if (config.isRamadanMode) {
            mapping = config.timeMappings.ramadan;
        } else {
            mapping = config.timeMappings[event.gender] || config.timeMappings.male;
        }

        try {
            // الحصول على وقت بداية أول حصة ونهاية آخر حصة في المصفوفة
            const firstPeriodIndex = event.periods[0] - 1;
            const lastPeriodIndex = event.periods[event.periods.length - 1] - 1;

            const startTime = mapping[firstPeriodIndex].start;
            const endTime = mapping[lastPeriodIndex].end;

            return `${startTime} - ${endTime}`;
        } catch (e) {
            return "خطأ في توقيت الحصة";
        }
    },

    /**
     * رسم شهر واحد داخل التقويم
     */
    renderMonth(year, month, data) {
        const monthContainer = document.createElement('div');
        monthContainer.className = 'animate-in fade-in slide-in-from-bottom-4 duration-500';
        
        const monthName = new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(new Date(year, month));
        
        let html = `
            <div class="flex items-center gap-4 mb-6">
                <h3 class="text-2xl font-black text-slate-800">${monthName}</h3>
                <div class="h-[2px] flex-1 bg-slate-100 rounded-full"></div>
            </div>
            <div class="grid grid-cols-7 gap-2">
        `;

        // أسماء الأيام
        ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].forEach(day => {
            html += `<div class="text-center text-[10px] font-black text-slate-400 uppercase py-2">${day}</div>`;
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // مربعات فارغة لبداية الشهر
        for (let i = 0; i < firstDay; i++) html += `<div></div>`;

        // رسم أيام الشهر
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = Utils.formatDate(new Date(year, month, day));
            const isToday = dateStr === Utils.formatDate(new Date());
            const dayEvents = this.getDayEvents(dateStr, data);

            html += `
                <div class="min-h-[120px] bg-white rounded-2xl p-2 border border-slate-100 transition-all hover:shadow-xl hover:shadow-slate-200/50 group ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-black ${isToday ? 'text-blue-600' : 'text-slate-400'}">${day}</span>
                        ${dayEvents.length > 0 ? `<span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>` : ''}
                    </div>
                    <div class="space-y-1">
                        ${this.renderDayEvents(dayEvents, data)}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        monthContainer.innerHTML = html;
        return monthContainer;
    },

    /**
     * رسم الأحداث داخل خلية اليوم
     */
    renderDayEvents(events, data) {
        const activeFilters = Array.from(document.querySelectorAll('#filterContainer input:checked')).map(i => i.value);
        
        return events
            .filter(ev => {
                // الفلترة بناءً على نوع الحدث أو المقرر
                if (ev.category) return activeFilters.includes(ev.category);
                return activeFilters.includes(ev.courseId);
            })
            .map(ev => {
                const course = data.courses.find(c => c.id === ev.courseId);
                const color = course ? course.color : '#64748b';
                const timeStr = this.getEventTimeDisplay(ev, data.config);
                const isLecture = !!ev.periods;

                return `
                    <div onclick="App.showEventDetail('${ev.id}')" 
                         class="p-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-95 overflow-hidden"
                         style="background-color: ${color}15; color: ${color}; border-right: 3px solid ${color}">
                        <div class="truncate">${ev.title}</div>
                        <div class="flex items-center gap-1 mt-0.5 opacity-70">
                            <i data-lucide="clock" class="w-2.5 h-2.5"></i>
                            <span>${timeStr}</span>
                            ${isLecture ? `<span class="ml-1 bg-white/50 px-1 rounded uppercase text-[7px]">${ev.gender === 'female' ? 'بنات' : 'بنين'}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
    },

    /**
     * جلب كافة أحداث يوم معين (إجازات، فترات، محاضرات)
     */
    getDayEvents(dateStr, data) {
        const events = [];

        // 1. الإجازات
        data.holidays.forEach(h => {
            if (dateStr >= h.start && dateStr <= h.end) events.push({ ...h, title: h.name, category: 'holidays' });
        });

        // 2. الفترات الأكاديمية
        data.periods.forEach(p => {
            if (dateStr >= p.start && dateStr <= p.end) events.push({ ...p, title: p.name, category: 'periods' });
        });

        // 3. الإجراءات
        data.procedures.forEach(pr => {
            if (dateStr >= pr.start && dateStr <= pr.end) events.push({ ...pr, title: pr.name, category: 'procedures' });
        });

        // 4. المواعيد والمحاضرات
        data.events.forEach(ev => {
            if (dateStr >= ev.start && dateStr <= ev.end) events.push(ev);
        });

        return events;
    },

    getMonthsRange(start, end) {
        const months = [];
        let current = new Date(start);
        const endDate = new Date(end);

        while (current <= endDate) {
            months.push({ year: current.getFullYear(), month: current.getMonth() });
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    },

    showLoading() {
        const loader = document.getElementById('loadingOverlay');
        const bar = document.getElementById('loadingBar');
        if (loader) loader.classList.remove('hidden', 'opacity-0');
        if (bar) bar.style.width = '100%';
    },

    hideLoading() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.classList.add('hidden'), 700);
        }
    }
};
