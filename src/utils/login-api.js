(() => {
    const form = document.querySelector('[data-shopwise-login]');
    if (!form) return;

    const mensagem = form.querySelector('.login-message');
    const botao = form.querySelector('button[type="submit"]');
    if (new URLSearchParams(location.search).get('cadastro') === 'ok') {
        mensagem.textContent = 'Cadastro concluído. Entre com seu e-mail e senha.';
        mensagem.classList.add('login-message-success');
    }

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        mensagem.textContent = '';
        mensagem.classList.remove('login-message-success');
        const campos = new FormData(form);
        botao.disabled = true;
        try {
            const resposta = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: String(campos.get('identificador')).trim(),
                    password: campos.get('password'),
                }),
            });
            if (resposta.status >= 500) throw new Error(ShopWiseMensagens.servidor);
            const dados = await resposta.json();
            if (!resposta.ok) {
                mensagem.textContent = resposta.status === 401 ? 'E-mail ou senha incorretos. Confira os dados e tente novamente.' : ShopWiseMensagens.dados(dados, 'Não foi possível entrar.');
                return;
            }
            if (dados.tipo !== form.dataset.tipo) {
                mensagem.textContent = dados.tipo === 'supermercado'
                    ? 'Use o login de supermercado para esta conta.'
                    : 'Esta conta não pertence a um supermercado.';
                return;
            }

            sessionStorage.setItem('shopwise_auth', JSON.stringify({
                token: dados.token,
                usuario: dados.usuario,
                nome: dados.nome,
                tipo: dados.tipo,
                supermercados: dados.supermercados,
            }));
            const proxima = new URLSearchParams(location.search).get('next');
            if (proxima === 'checkout' && dados.tipo === 'usuario') {
                window.location.assign('checkout.html');
            } else if (proxima === 'pedidos') {
                window.location.assign('pedidos.html');
            } else if (form.dataset.destino) {
                window.location.assign(form.dataset.destino);
            } else {
                mensagem.textContent = 'Login confirmado.';
                mensagem.classList.add('login-message-success');
            }
        } catch (erro) {
            mensagem.textContent = ShopWiseMensagens.falha(erro);
        } finally {
            botao.disabled = false;
        }
    });
})();
