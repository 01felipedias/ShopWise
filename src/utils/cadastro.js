// O mesmo formulário atende cliente e supermercado; o tipo vem da página.
(() => {
    const form = document.querySelector('[data-shopwise-cadastro]');
    if (!form) return;

    const mensagem = form.querySelector('.login-message');
    const botao = form.querySelector('button[type="submit"]');
    const textoBotao = botao.textContent;

    function formatarErros(dados) {
        const nomes = {
            nome: 'Nome',
            username: 'Usuário',
            email: 'E-mail',
            password: 'Senha',
            supermercado_nome: 'Nome do supermercado',
            supermercado_endereco: 'Endereço',
        };
        if (typeof dados?.detail === 'string') return dados.detail;
        if (!dados || typeof dados !== 'object') return 'Não foi possível concluir o cadastro.';
        return Object.entries(dados).map(([campo, erros]) => {
            const texto = Array.isArray(erros) ? erros.join(' ') : String(erros);
            return `${nomes[campo] || 'Cadastro'}: ${texto}`;
        }).join(' ');
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
        botao.textContent = 'Cadastrando...';
        try {
            const resposta = await fetch('/api/auth/cadastro/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(dados),
            });
            const resultado = await resposta.json();
            if (!resposta.ok) {
                mensagem.textContent = formatarErros(resultado);
                return;
            }
            window.location.assign(`${form.dataset.destino}?cadastro=ok`);
        } catch {
            mensagem.textContent = 'Não foi possível conectar à API. Abra o site pelo servidor Django.';
        } finally {
            botao.disabled = false;
            botao.textContent = textoBotao;
        }
    });
})();
