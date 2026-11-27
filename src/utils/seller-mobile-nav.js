(() => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sellerSidebarOverlay');
    const toggle = document.getElementById('sellerMobileMenu');
    if (!sidebar || !overlay || !toggle) return;

    const setOpen = open => {
        sidebar.classList.toggle('open', open);
        overlay.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
        toggle.textContent = open ? '×' : '☰';
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && sidebar.classList.contains('open')) setOpen(false);
    });
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
})();
