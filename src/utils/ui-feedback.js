// Feedback das telas demonstrativas que ainda não usam a API.
window.showToast = (mensagem, tipo = 'info') => {
    let container = document.querySelector('.shopwise-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'shopwise-toast-container';
        document.body.append(container);
    }
    const toast = document.createElement('div');
    toast.className = `shopwise-toast show ${tipo}`;
    toast.setAttribute('role', 'status');
    toast.textContent = mensagem;
    container.append(toast);
    setTimeout(() => toast.remove(), 4000);
};

document.querySelectorAll('form[data-stay-on-page="true"]').forEach(form => {
    form.addEventListener('submit', evento => {
        evento.preventDefault();
        window.showToast('Avaliação registrada nesta demonstração.', 'success');
    });
});
