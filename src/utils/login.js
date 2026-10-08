(function () {
    const form = document.querySelector('[data-shopwise-login]');
    if (!form) return;

    const message = form.querySelector('.login-message');
    const button = form.querySelector('button[type="submit"]');
    sessionStorage.removeItem('shopwise_auth');
    if (new URLSearchParams(window.location.search).get('cadastro') === 'ok') {
        message.textContent = 'Cadastro concluído. Entre com sua conta.';
        message.classList.add('login-message-success');
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        message.textContent = '';
        message.classList.remove('login-message-success');
        button.disabled = true;
        button.textContent = 'Entrando...';

        const fields = new FormData(form);
        try {
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: fields.get('username').trim(),
                    password: fields.get('password')
                })
            });
            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.detail || 'Não foi possível entrar.';
                return;
            }

            const tipoEsperado = form.dataset.tipo;
            const tipoCorreto = data.tipo === tipoEsperado;
            if (!tipoCorreto) {
                message.textContent = tipoEsperado === 'supermercado'
                    ? 'Esta conta não está vinculada a um supermercado.'
                    : 'Use o login de supermercado para esta conta.';
                return;
            }

            sessionStorage.setItem('shopwise_auth', JSON.stringify({
                token: data.token,
                usuario: data.usuario,
                tipo: data.tipo,
                supermercados: data.supermercados
            }));
            window.location.assign(form.dataset.destino);
        } catch (error) {
            message.textContent = 'Não foi possível conectar à API. Abra o site pelo servidor Django.';
        } finally {
            button.disabled = false;
            button.textContent = 'Entrar';
        }
    });
})();
