const UIManager = {
    toggleModal: (modal, show) => {
        modal.classList.toggle('hidden', !show);
        document.body.classList.toggle('modal-open', show);
    },

    createRow: (containerId, type, data = {}) => {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2';
        
        if (type === 'course') {
            div.innerHTML = `
                <div class="field-group flex-[2]"><label>المقرر</label><input type="text" value="${data.name || ''}" class="course-name w-full border rounded p-2"></div>
                <div class="field-group flex-1"><label>الرمز</label><input type="text" value="${data.code || ''}" class="course-code w-full border rounded p-2"></div>
                <div class="field-group w-12 flex-none"><label>اللون</label><input type="color" value="${data.color || '#3b82f6'}" class="course-color w-full h-10 rounded cursor-pointer border-none p-1"></div>
                <button type="button" class="remove-row text-red-400 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        } else {
            div.innerHTML = `
                <div class="field-group flex-[2]"><label>المسمى</label><input type="text" value="${data.name || ''}" class="item-name w-full border rounded p-2"></div>
                <div class="field-group flex-1"><label>من</label><input type="date" value="${data.start || ''}" class="item-start w-full border rounded p-1 text-xs"></div>
                <div class="field-group flex-1"><label>إلى</label><input type="date" value="${data.end || ''}" class="item-end w-full border rounded p-1 text-xs"></div>
                <button type="button" class="remove-row text-red-500 p-1 mt-4"><i data-lucide="trash-2"></i></button>`;
        }
        div.dataset.id = data.id || '';
        container.appendChild(div);
        lucide.createIcons({ target: div });
        div.querySelector('.remove-row').onclick = () => div.remove();
    }
};
