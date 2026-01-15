const UIManager = {
    toggleModal: (modalId, show) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.toggle('hidden', !show);
        document.body.classList.toggle('modal-open', show);
    },

    createRow: (containerId, type, data = {}) => {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.className = 'dynamic-row flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2';
        
        // تأمين البيانات المدخلة قبل وضعها في الـ value
        const safeName = Utils.escapeHTML(data.name || '');
        const safeCode = Utils.escapeHTML(data.code || '');

        if (type === 'course') {
            div.innerHTML = `
                <div class="field-group flex-[2]"><label class="text-[10px] text-gray-400">اسم المقرر</label>
                <input type="text" placeholder="اسم المقرر" value="${safeName}" class="course-name w-full border rounded-lg p-2" required></div>
                <div class="field-group flex-1"><label class="text-[10px] text-gray-400">الرمز</label>
                <input type="text" placeholder="الرمز" value="${safeCode}" class="course-code w-full border rounded-lg p-2" required></div>
                <div class="field-group w-12 flex-none"><label class="text-[10px] text-gray-400">اللون</label>
                <input type="color" value="${data.color || '#3b82f6'}" class="course-color w-full h-10 rounded cursor-pointer border-none p-1"></div>
                <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        } else {
            div.innerHTML = `
                <div class="field-group flex-[2]"><label class="text-[10px] text-gray-400">المسمى</label>
                <input type="text" placeholder="الاسم" value="${safeName}" class="item-name w-full border rounded p-2" required></div>
                <div class="field-group flex-1"><label class="text-[10px] text-gray-400">من</label>
                <input type="date" value="${data.start || ''}" class="item-start w-full border rounded p-1 text-xs" required></div>
                <div class="field-group flex-1"><label class="text-[10px] text-gray-400">إلى</label>
                <input type="date" value="${data.end || ''}" class="item-end w-full border rounded p-1 text-xs" required></div>
                <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        }
        div.dataset.id = data.id || '';
        container.appendChild(div);
        lucide.createIcons({ props: { class: 'w-4 h-4' }, target: div });
        div.querySelector('.remove-row').onclick = () => div.remove();
    },

    updateCourseSelects: (courses) => {
        const selects = [document.getElementById('eventCourse'), document.getElementById('exportCourseId')];
        const options = `<option value="general">موعد عام (غير مرتبط بمقرر)</option>` + 
                        courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        selects.forEach(s => { if(s) s.innerHTML = options; });
    },

    showToast: (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-emerald-600',
            error: 'bg-red-600',
            info: 'bg-blue-600'
        };
        const icons = {
            success: 'check-circle',
            error: 'alert-triangle',
            info: 'info'
        };

        toast.className = `${bgColors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] toast-in`;
        toast.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5"></i>
            <span class="font-bold text-sm">${message}</span>
        `;
        
        container.appendChild(toast);
        lucide.createIcons({ target: toast });

        // إخفاء التنبيه تلقائياً بعد 4 ثوانٍ
        setTimeout(() => {
            toast.classList.replace('toast-in', 'toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};
