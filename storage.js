const Storage = {
    load() {
        const raw = JSON.parse(localStorage.getItem('uniCalendarData')) || {};
        // صمام الأمان لضمان وجود كافة الحقول
        return { ...DEFAULT_DATA, ...raw };
    },
    save(data) {
        localStorage.setItem('uniCalendarData', JSON.stringify(data));
    },
    clear() {
        localStorage.removeItem('uniCalendarData');
        location.reload();
    }
};
