/**
 * storage.js - مدير قاعدة البيانات (IndexedDB)
 * يستخدم مكتبة Dexie لتخزين الإعدادات والمقررات والمحاضرات بشكل دائم.
 */

const db = new Dexie("AcademicCalendarDB");

// تعريف بنية قاعدة البيانات
db.version(1).stores({
    settings: 'id', // لتخزين الإعدادات العامة (مثل التواريخ وأوقات الحصص)
    data: 'category' // لتخزين المقررات، الإجازات، الفترات، والمواعيد
});

const Storage = {
    /**
     * تحميل كافة البيانات من المتصفح
     */
    async load() {
        try {
            // جلب الإعدادات العامة ودمجها مع القيم الافتراضية لضمان وجود الحقول الجديدة (مثل timeMappings)
            const savedConfig = await db.settings.get('main_config');
            const config = { 
                ...DEFAULT_DATA.config, 
                ...(savedConfig || {}) 
            };

            // جلب بقية التصنيفات
            const courses = await db.data.get('courses') || { items: [] };
            const holidays = await db.data.get('holidays') || { items: [] };
            const periods = await db.data.get('periods') || { items: [] };
            const procedures = await db.data.get('procedures') || { items: [] };
            const events = await db.data.get('events') || { items: [] };

            return {
                config: config,
                courses: courses.items,
                holidays: holidays.items,
                periods: periods.items,
                procedures: procedures.items,
                events: events.items
            };
        } catch (e) {
            console.error("خطأ في تحميل البيانات:", e);
            return { ...DEFAULT_DATA }; // العودة للقيم الافتراضية في حال حدوث خطأ
        }
    },

    /**
     * حفظ الحالة الكاملة للتطبيق
     */
    async save(data) {
        try {
            // حفظ الإعدادات (تشمل أوقات الحصص ووضع رمضان)
            await db.settings.put({ id: 'main_config', ...data.config });

            // حفظ البيانات المقسمة حسب التصنيف
            await db.data.put({ category: 'courses', items: data.courses });
            await db.data.put({ category: 'holidays', items: data.holidays });
            await db.data.put({ category: 'periods', items: data.periods });
            await db.data.put({ category: 'procedures', items: data.procedures });
            await db.data.put({ category: 'events', items: data.events });
        } catch (e) {
            console.error("خطأ أثناء عملية الحفظ:", e);
        }
    },

    /**
     * مسح كافة البيانات وإعادة ضبط المصنع
     */
    async clear() {
        if (confirm('هل أنت متأكد من حذف كافة البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) {
            await db.delete();
            location.reload();
        }
    }
};
