const Utils = {
    formatDate: (date) => date.toISOString().split('T')[0],

    getHijriDate: (date) => {
        try {
            return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-uma-nu-latn', {
                day: 'numeric',
                month: 'long'
            }).format(date);
        } catch (e) { return ''; }
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
