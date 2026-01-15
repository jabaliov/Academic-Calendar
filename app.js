let universityData = Storage.load();

window.onload = () => {
    // تعبئة البيانات في الإعدادات
    if (universityData.config.startDate) {
        document.getElementById('startDate').value = universityData.config.startDate;
        document.getElementById('endDate').value = universityData.config.endDate;
        // توليد الصفوف...
        CalendarEngine.render(universityData);
    } else {
        CalendarEngine.hideLoading();
    }
};

// الأحداث (Event Listeners)
document.getElementById('settingsForm').onsubmit = (e) => {
    e.preventDefault();
    // تجميع البيانات من الواجهة وحفظها...
    universityData.config.startDate = document.getElementById('startDate').value;
    // ... إلخ
    Storage.save(universityData);
    CalendarEngine.render(universityData);
};
