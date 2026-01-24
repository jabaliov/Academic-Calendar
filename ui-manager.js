/**
 * ui-manager.js - مدير واجهة المستخدم
 * مسؤول عن بناء العناصر الديناميكية، إدارة النوافذ، وعرض أوقات الحصص.
 */

const UIManager = {
    // التحكم في إظهار وإخفاء النوافذ المنبثقة (Modals)
    toggleModal: (modalId, show) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.toggle('hidden', !show);
        document.body.classList.toggle('modal-overflow-hidden', show);
        
        // إذا فتحنا الإعدادات، نقوم بتهيئة تبويبات الوقت تلقائياً
        if (modalId === 'settingsModal' && show) {
            UIManager.renderTimeMappingRows('male'); 
        }
    },

    // إنشاء صف جديد في الإعدادات (مقرر، إجازة، فترة، أو إجراء)
    // تم الحفاظ على هذه الوظيفة تماماً كما في النسخة الأصلية
    createRow: (containerId, type, data = {}) => {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.className = 'dynamic-row flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-200 mb-2 animate-in fade-in zoom-in-95';
        
        const safeName = Utils.escapeHTML(data.name || '');
        const safeCode = Utils.escapeHTML(data.code || '');

        if (type === 'course') {
            div.innerHTML = `
                <div class="field-group flex-[2]"><label class="text-[9px] font-black text-gray-400 uppercase">اسم المقرر</label>
                <input type="text" placeholder="مثال: تصميم واجهات" value="${safeName}" class="course-name w-full border-none rounded-lg p-2 text-xs font-bold shadow-sm" required></div>
                <div class="field-group flex-1"><label class="text-[9px] font-black text-gray-400 uppercase">الرمز</label>
                <input type="text" placeholder="HCI2101" value="${safeCode}" class="course-code w-full border-none rounded-lg p-2 text-xs font-bold shadow-sm" required></div>
                <div class="field-group w-12 flex-none"><label class="text-[9px] font-black text-gray-400 uppercase">اللون</label>
                <input type="color" value="${data.color || '#3b82f6'}" class="course-color w-full h-8 rounded-lg cursor-pointer border-none p-1"></div>
                <button type="button" class="remove-row text-red-400 hover:text-red-600 p-1 mt-4 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        } else {
            div.innerHTML = `
                <div class="field-group flex-[2]"><label class="text-[9px] font-black text-gray-400 uppercase">المسمى</label>
                <input type="text" placeholder="الاسم" value="${safeName}" class="item-name w-full border-none rounded-lg p-2 text-xs font-bold shadow-sm" required></div>
                <div class="field-group flex-1"><label class="text-[9px] font-black text-gray-400 uppercase">من</label>
                <input type="date" value="${data.start || ''}" class="item-start w-full border-none rounded-lg p-2 text-[10px] font-bold shadow-sm" required></div>
                <div class="field-group flex-1"><label class="text-[9px] font-black text-gray-400 uppercase">إلى</label>
                <input type="date" value="${data.end || ''}" class="item-end w-full border-none rounded-lg p-2 text-[10px] font-bold shadow-sm" required></div>
                <button type="button" class="remove-row text-red-400 hover:text-red-600 p-1 mt-4 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        }
        div.dataset.id = data.id || '';
        container.appendChild(div);
        lucide.createIcons({ target: div });
        div.querySelector('.remove-row').onclick = () => div.remove();
    },

    /**
     * بناء صفوف تعديل أوقات الحصص الـ 12
     * تسمح للمحاضر بتخصيص وقت كل حصة بناءً على التبويب المختار (بنين/بنات/رمضان)
     */
    renderTimeMappingRows: (type) => {
        const container = document.getElementById('timeRowsContainer');
        if (!container) return;

        // جلب البيانات من الكائن المرجعي في App
        const mappings = App.data.config.timeMappings[type];
        container.innerHTML = '';

        mappings.forEach((slot, index) => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-4 gap-2 p-3 items-center border-b border-slate-50 hover:bg-slate-50 transition-colors';
            row.innerHTML = `
                <div class="text-[10px] font-black text-slate-400 text-center">${index + 1}</div>
                <input type="time" value="${slot.start}" class="time-start bg-slate-100 border-none rounded-lg p-1.5 text-[10px] font-bold text-center focus:ring-1 focus:ring-blue-500">
                <input type="time" value="${slot.end}" class="time-end bg-slate-100 border-none rounded-lg p-1.5 text-[10px] font-bold text-center focus:ring-1 focus:ring-blue-500">
                <div class="flex justify-center">
                    <span class="w-2 h-2 rounded-full ${type === 'ramadan' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-emerald-400'}"></span>
                </div>
            `;
            // تخزين النوع في خاصية البيانات للصف لسهولة الحفظ لاحقاً
            row.dataset.index = index;
            row.dataset.type = type;
            container.appendChild(row);
        });

        // تحديث حالة الأزرار (Tabs)
        document.querySelectorAll('.time-tab-btn').forEach(btn => {
            const isActive = btn.dataset.target === type;
            btn.classList.toggle('bg-white', isActive);
            btn.classList.toggle('shadow-sm', isActive);
            btn.classList.toggle('active', isActive);
        });
    },

    // تحديث قوائم اختيار المقررات (Manual Add & Export)
    updateCourseSelects: (courses) => {
        const select = document.getElementById('eventCourse');
        if (!select) return;
        
        let options = `<option value="general">موعد عام (غير مرتبط بمقرر)</option>`;
        courses.forEach(c => {
            options += `<option value="${c.id}">${Utils.escapeHTML(c.name)} (${Utils.escapeHTML(c.code)})</option>`;
        });
        select.innerHTML = options;
    },

    // إظهار تنبيهات النظام (Toasts)
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-emerald-600',
            error: 'bg-red-600',
            info: 'bg-blue-600',
            warning: 'bg-amber-500'
        };
        const icons = {
            success: 'check-circle',
            error: 'alert-triangle',
            info: 'info',
            warning: 'zap'
        };

        toast.className = `${bgColors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] toast-in z-[300]`;
        toast.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5"></i>
            <span class="font-bold text-sm">${message}</span>
        `;
        
        container.appendChild(toast);
        lucide.createIcons({ target: toast });

        setTimeout(() => {
            toast.classList.replace('toast-in', 'toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};
