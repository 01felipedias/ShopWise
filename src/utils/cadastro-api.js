(() => {
    const form = document.querySelector('[data-shopwise-cadastro]');
    if (!form) return;

    const mensagem = form.querySelector('.login-message');
    const botao = form.querySelector('button[type="submit"]');

    function mostrarErros(dados) {
        if (typeof dados?.detail === 'string') return dados.detail;
        if (!dados || typeof dados !== 'object') return 'Não foi possível concluir o cadastro.';
        return ShopWiseMensagens.dados(dados, 'Não foi possível concluir o cadastro.');
    }

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        mensagem.textContent = '';
        const campos = new FormData(form);
        if (campos.get('password') !== campos.get('confirm_password')) {
            mensagem.textContent = 'As senhas digitadas não são iguais.';
            return;
        }

        const dados = {
            tipo: form.dataset.tipo,
            nome: String(campos.get('nome')).trim(),
            email: String(campos.get('email')).trim(),
            password: campos.get('password'),
        };
        if (dados.tipo === 'supermercado') {
            dados.supermercado_nome = String(campos.get('supermercado_nome')).trim();
            dados.supermercado_endereco = String(campos.get('supermercado_endereco')).trim();
        }

        botao.disabled = true;
        try {
            const resposta = await fetch('/api/auth/cadastro/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados),
            });
            if (resposta.status >= 500) throw new Error(ShopWiseMensagens.servidor);
            const resultado = await resposta.json();
            if (!resposta.ok) {
                mensagem.textContent = mostrarErros(resultado);
                return;
            }
            window.location.assign(`${form.dataset.login}?cadastro=ok`);
        } catch (erro) {
            mensagem.textContent = ShopWiseMensagens.falha(erro);
        } finally {
            botao.disabled = false;
        }
    });
})();
