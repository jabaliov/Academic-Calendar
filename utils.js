const Utils = {
    // إصلاح: استخدام التاريخ المحلي بدلاً من ISO لتجنب مشاكل المناطق الزمنية
    formatDate: (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getHijriDate: (date) => {
        try {
            // إصلاح: استخدام المسمى المعياري الصحيح (umalqura) لضمان الظهور
            return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
                day: 'numeric',
                month: 'long'
            }).format(date);
        } catch (e) { 
            console.error("خطأ في التاريخ الهجري:", e);
            return ''; 
        }
    },

    downloadJSON: (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    generateId: (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
};
