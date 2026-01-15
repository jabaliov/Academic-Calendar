const CalendarEngine = {
    async render(universityData) {
        const { startDate, endDate } = universityData.config;
        if (!startDate || !endDate) return this.hideLoading();

        this.showLoading();
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        let current = new Date(startDate);
        const last = new Date(endDate);
        const activeFilters = Array.from(document.getElementById('filterContainer').querySelectorAll('input:checked')).map(i => i.value);

        while (current.getDay() !== 0) current.setDate(current.getDate() - 1);
        let weekNumber = 1;

        while (current <= last) {
            const weekRow = document.createElement('div');
            weekRow.className = 'week-row';
            // ... (منطق بناء الأيام والأسابيع كما في النسخة السابقة مع استخدام Utils) ...
            
            // ملاحظة: يتم زيادة اليوم بمقدار 1 في نهاية حلقة الأيام
            fragment.appendChild(weekRow);
            weekNumber++;
            if (weekNumber % 4 === 0) await new Promise(r => requestAnimationFrame(r));
        }
        grid.appendChild(fragment);
        this.hideLoading();
        lucide.createIcons();
    },

    showLoading() { document.getElementById('loadingOverlay').classList.remove('fade-out'); },
    hideLoading() { setTimeout(() => document.getElementById('loadingOverlay').classList.add('fade-out'), 300); }
};
