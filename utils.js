/**
 * utils.js - الأدوات المساعدة (Utilities)
 * يحتوي على دوال التنسيق، التوليد، ومعالجة التواريخ.
 */

const Utils = {
    /**
     * توليد معرف فريد (Unique ID) للعناصر الجديدة
     */
    generateId: (prefix = 'id') => {
        return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * تنسيق التاريخ ليصبح بصيغة (YYYY-MM-DD) المتوافقة مع حقول HTML
     */
    formatDate: (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    },

    /**
     * حماية النصوص من حقن الأكواد (XSS Protection)
     */
    escapeHTML: (str) => {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * تحميل البيانات كملف JSON (للنسخ الاحتياطي)
     */
    downloadJSON: (data, fileName) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * استخراج كافة التواريخ ليوم معين (مثل "الثلاثاء") ضمن نطاق زمني محدد
     * هذه الدالة أساسية لعملية "الاستيراد الذكي" لتوزيع المحاضرات
     */
    getDatesForDay: (dayName, startStr, endStr) => {
        // خريطة الأيام العربية (مع مراعاة الهمزات)
        const daysMap = {
            'الأحد': 0, 'الاحد': 0,
            'الاثنين': 1, 'الاثنين': 1, 'الإثنين': 1,
            'الثلاثاء': 2,
            'الأربعاء': 3, 'الاربعاء': 3,
            'الخميس': 4,
            'الجمعة': 5, 'الجمعه': 5,
            'السبت': 6
        };

        const targetDay = daysMap[dayName];
        if (targetDay === undefined) return [];

        const dates = [];
        let current = new Date(startStr);
        const end = new Date(endStr);

        // المرور على كافة الأيام بين البداية والنهاية
        while (current <= end) {
            if (current.getDay() === targetDay) {
                dates.push(Utils.formatDate(current));
            }
            current.setDate(current.getDate() + 1);
        }
        return dates;
    },

    /**
     * توليد لون عشوائي متناسق للمقررات الجديدة المستوردة آلياً
     */
    getRandomColor: () => {
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};
