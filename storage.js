const Storage = {
    load() {
        try {
            const raw = JSON.parse(localStorage.getItem('uniCalendarData')) || {};
            // دمج البيانات مع القالب الافتراضي لضمان عدم وجود حقول ناقصة (صمام أمان)
            return {
                config: raw.config || { ...DEFAULT_DATA.config },
                courses: raw.courses || [],
                holidays: raw.holidays || [],
                periods: raw.periods || [],
                procedures: raw.procedures || [],
                events: raw.events || []
            };
        } catch (e) {
            console.error("خطأ في تحميل البيانات:", e);
            return { ...DEFAULT_DATA };
        }
    },

    save(data) {
        localStorage.setItem('uniCalendarData', JSON.stringify(data));
    },

    clear() {
        if (confirm('هل أنت متأكد من حذف كافة البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) {
            localStorage.removeItem('uniCalendarData');
            location.reload();
        }
    }
};
