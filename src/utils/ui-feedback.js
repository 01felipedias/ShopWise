(function () {
    let hideTimer;

    function ensureContainer() {
        let container = document.querySelector('.shopwise-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'shopwise-toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    window.showToast = function (message, type = 'info') {
        const container = ensureContainer();
        container.replaceChildren();
        const toast = document.createElement('div');
        toast.className = `shopwise-toast ${['success', 'error', 'warning', 'info'].includes(type) ? type : 'info'}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.textContent = String(message ?? '');
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 220);
        }, 3800);
    };

    function getDialog() {
        let dialog = document.getElementById('shopwiseActionDialog');
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.id = 'shopwiseActionDialog';
        dialog.className = 'shopwise-action-dialog';
        dialog.innerHTML = '<form method="dialog" class="shopwise-action-card"><button class="shopwise-action-close" value="cancel" aria-label="Fechar">×</button><h2></h2><p></p><label class="shopwise-prompt-field" hidden><span></span><input type="text" autocomplete="off"></label><div class="shopwise-action-buttons"><button class="shopwise-action-cancel" value="cancel">Voltar</button><button class="shopwise-action-confirm" value="confirm">Confirmar</button></div></form>';
        document.body.appendChild(dialog);
        return dialog;
    }

    function actionDialog({ title, message, confirmText, initialValue, prompt = false, danger = false }) {
        const dialog = getDialog();
        const form = dialog.querySelector('form');
        const input = dialog.querySelector('input');
        dialog.querySelector('h2').textContent = title;
        dialog.querySelector('p').textContent = message;
        dialog.querySelector('.shopwise-action-confirm').textContent = confirmText;
        dialog.querySelector('.shopwise-action-confirm').classList.toggle('danger', danger);
        const field = dialog.querySelector('.shopwise-prompt-field');
        field.hidden = !prompt;
        if (prompt) {
            field.querySelector('span').textContent = 'Preço desejado';
            input.value = initialValue ?? '';
            input.inputMode = 'decimal';
        }
        if (dialog.open) dialog.close('cancel');
        return new Promise(resolve => {
            const done = event => {
                dialog.removeEventListener('close', done);
                if (event) event.preventDefault?.();
                const confirmed = dialog.returnValue === 'confirm';
                resolve(prompt ? (confirmed ? input.value : null) : confirmed);
            };
            dialog.addEventListener('close', done, { once: true });
            dialog.returnValue = '';
            dialog.showModal();
            if (prompt) input.focus();
        });
    }

    window.showConfirm = (message, options = {}) => actionDialog({
        title: options.title || 'Confirmar ação',
        message,
        confirmText: options.confirmText || 'Confirmar',
        danger: Boolean(options.danger)
    });
    window.showPrompt = (message, initialValue = '', options = {}) => actionDialog({
        title: options.title || 'Informe o valor',
        message,
        confirmText: options.confirmText || 'Salvar',
        initialValue,
        prompt: true
    });
})();
