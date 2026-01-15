const db = new Dexie("AcademicCalendarDB");

// تعريف بنية قاعدة البيانات
db.version(1).stores({
    settings: 'id', // لتخزين الإعدادات (تاريخ البداية والنهاية)
    data: 'category' // لتخزين المقررات، الإجازات، الفترات، والمواعيد
});

const Storage = {
    async load() {
        try {
            const config = await db.settings.get('main_config') || { id: 'main_config', ...DEFAULT_DATA.config };
            const courses = await db.data.get('courses') || { category: 'courses', items: [] };
            const holidays = await db.data.get('holidays') || { category: 'holidays', items: [] };
            const periods = await db.data.get('periods') || { category: 'periods', items: [] };
            const procedures = await db.data.get('procedures') || { category: 'procedures', items: [] };
            const events = await db.data.get('events') || { category: 'events', items: [] };

            return {
                config: config,
                courses: courses.items,
                holidays: holidays.items,
                periods: periods.items,
                procedures: procedures.items,
                events: events.items
            };
        } catch (e) {
            console.error("خطأ في تحميل البيانات من IndexedDB:", e);
            return { ...DEFAULT_DATA };
        }
    },

    async save(data) {
        await db.settings.put({ id: 'main_config', ...data.config });
        await db.data.put({ category: 'courses', items: data.courses });
        await db.data.put({ category: 'holidays', items: data.holidays });
        await db.data.put({ category: 'periods', items: data.periods });
        await db.data.put({ category: 'procedures', items: data.procedures });
        await db.data.put({ category: 'events', items: data.events });
    },

    async clear() {
        if (confirm('هل أنت متأكد من حذف كافة البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) {
            await db.delete();
            location.reload();
        }
    }
};
