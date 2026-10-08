// Os produtos são compartilhados; cada supermercado gerencia somente seus preços.
(() => {
    const form = document.getElementById('mpFormProduto');
    const tabela = document.getElementById('mpTabelaProdutos');
    const nomeInput = document.getElementById('mpNome');
    const categoriaInput = document.getElementById('mpCategoria');
    const precoInput = document.getElementById('mpPreco');
    const salvar = document.getElementById('mpSalvar');
    const mensagem = document.getElementById('mpMensagem');
    const estado = { produtos: [], precos: [], edicaoId: null };

    let autenticacao;
    try {
        autenticacao = JSON.parse(sessionStorage.getItem('shopwise_auth'));
    } catch {
        autenticacao = null;
    }
    const mercado = autenticacao?.supermercados?.[0];
    if (!autenticacao?.token || autenticacao.tipo !== 'supermercado' || !mercado) {
        window.location.replace('login-supermercado.html');
        return;
    }

    document.getElementById('mpNomeMercado').textContent = mercado.nome;
    document.getElementById('mpTabelaMercado').textContent = mercado.nome;

    const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    function escapar(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[caractere]);
    }

    function normalizar(valor) {
        return String(valor ?? '').trim().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function avisar(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.classList.toggle('mp-message-error', erro);
    }

    function mensagemDaApi(dados) {
        if (typeof dados?.detail === 'string') return dados.detail;
        if (typeof dados === 'object' && dados !== null) {
            return Object.values(dados).flat().map(String).join(' ');
        }
        return 'Não foi possível concluir a operação.';
    }

    async function consultar(caminho, metodo = 'GET', corpo = null) {
        const resposta = await fetch(caminho, {
            method: metodo,
            headers: {
                Accept: 'application/json',
                Authorization: `Token ${autenticacao.token}`,
                ...(corpo ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(corpo ? { body: JSON.stringify(corpo) } : {}),
        });
        const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
        if (!resposta.ok) {
            if (resposta.status === 401) {
                throw new Error('Sua sessão não é válida. Saia e entre novamente.');
            }
            throw new Error(mensagemDaApi(dados));
        }
        return dados;
    }

    function produtoPorNome(nome) {
        return estado.produtos.find((produto) => normalizar(produto.nome) === normalizar(nome));
    }

    function atualizarCategoria() {
        const produto = produtoPorNome(nomeInput.value);
        categoriaInput.disabled = Boolean(produto) || estado.edicaoId !== null;
        categoriaInput.required = !categoriaInput.disabled;
        if (produto) categoriaInput.value = produto.categoria;
    }

    function limparFormulario() {
        form.reset();
        estado.edicaoId = null;
        nomeInput.disabled = false;
        categoriaInput.disabled = false;
        categoriaInput.required = true;
        document.getElementById('mpTituloForm').textContent = 'Cadastrar preço';
        salvar.textContent = 'Cadastrar preço';
    }

    function renderizarTabela() {
        const produtos = new Map(estado.produtos.map((produto) => [produto.id, produto]));
        const meusPrecos = estado.precos.filter((preco) => preco.supermercado === mercado.id);
        if (!meusPrecos.length) {
            tabela.innerHTML = '<tr><td colspan="4">Nenhum preço cadastrado para este supermercado.</td></tr>';
            return;
        }
        tabela.innerHTML = meusPrecos.map((preco) => {
            const produto = produtos.get(preco.produto);
            return `<tr>
                <td><strong>${escapar(produto?.nome || 'Produto não encontrado')}</strong></td>
                <td>${escapar(produto?.categoria || '—')}</td>
                <td>${dinheiro.format(Number(preco.valor))}</td>
                <td class="mp-actions">
                    <button type="button" class="mp-action-link" data-acao="editar" data-preco-id="${preco.id}">Alterar preço</button>
                    <button type="button" class="mp-action-link mp-action-danger" data-acao="remover" data-preco-id="${preco.id}">Remover</button>
                </td>
            </tr>`;
        }).join('');
    }

    function renderizarSugestoes() {
        document.getElementById('mpProdutosExistentes').innerHTML = estado.produtos
            .map((produto) => `<option value="${escapar(produto.nome)}"></option>`).join('');
    }

    async function carregarDados() {
        const [produtos, precos] = await Promise.all([
            consultar('/api/produtos/'),
            consultar('/api/precos/'),
        ]);
        estado.produtos = produtos;
        estado.precos = precos;
        renderizarSugestoes();
        renderizarTabela();
    }

    function iniciarEdicao(preco) {
        const produto = estado.produtos.find((item) => item.id === preco.produto);
        if (!produto) return;
        estado.edicaoId = preco.id;
        nomeInput.value = produto.nome;
        categoriaInput.value = produto.categoria;
        precoInput.value = preco.valor;
        nomeInput.disabled = true;
        categoriaInput.disabled = true;
        categoriaInput.required = false;
        document.getElementById('mpTituloForm').textContent = `Alterar preço de ${produto.nome}`;
        salvar.textContent = 'Salvar preço';
        avisar('');
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const nome = nomeInput.value.trim();
        const valor = precoInput.value;
        if (!nome || !valor || !Number.isFinite(Number(valor)) || Number(valor) <= 0) {
            avisar('Informe um produto e um preço maior que zero.', true);
            return;
        }
        salvar.disabled = true;
        avisar('Salvando...');
        let produtoCriado = false;
        try {
            if (estado.edicaoId !== null) {
                const preco = estado.precos.find((item) => item.id === estado.edicaoId && item.supermercado === mercado.id);
                if (!preco) throw new Error('Preço não encontrado para este supermercado.');
                await consultar(`/api/precos/${preco.id}/`, 'PUT', {
                    produto: preco.produto, supermercado: mercado.id, valor,
                });
                limparFormulario();
                await carregarDados();
                avisar('Preço atualizado com sucesso.');
                return;
            }

            let produto = produtoPorNome(nome);
            if (!produto) {
                if (!categoriaInput.value) throw new Error('Selecione a categoria do produto novo.');
                produto = await consultar('/api/produtos/', 'POST', {
                    nome, categoria: categoriaInput.value,
                });
                produtoCriado = true;
            }
            if (estado.precos.some((preco) => preco.produto === produto.id && preco.supermercado === mercado.id)) {
                throw new Error('Este produto já tem preço no seu supermercado. Use “Alterar preço” na tabela.');
            }
            await consultar('/api/precos/', 'POST', {
                produto: produto.id, supermercado: mercado.id, valor,
            });
            limparFormulario();
            await carregarDados();
            avisar('Preço cadastrado com sucesso.');
        } catch (erro) {
            // Se o preço falhar depois da criação, o produto novo continua no catálogo.
            if (produtoCriado) await carregarDados().catch(() => {});
            avisar(erro.message || 'Não foi possível salvar o preço.', true);
        } finally {
            salvar.disabled = false;
        }
    });

    tabela.addEventListener('click', async (evento) => {
        const botao = evento.target.closest('[data-acao]');
        if (!botao) return;
        const preco = estado.precos.find((item) => item.id === Number(botao.dataset.precoId) && item.supermercado === mercado.id);
        if (!preco) return;
        if (botao.dataset.acao === 'editar') {
            iniciarEdicao(preco);
            return;
        }
        if (!window.confirm('Remover o preço deste produto do seu supermercado?')) return;
        botao.disabled = true;
        try {
            await consultar(`/api/precos/${preco.id}/`, 'DELETE');
            await carregarDados();
            avisar('Preço removido do seu supermercado. O produto continua no catálogo.');
        } catch (erro) {
            avisar(erro.message || 'Não foi possível remover o preço.', true);
            botao.disabled = false;
        }
    });

    nomeInput.addEventListener('input', atualizarCategoria);
    document.getElementById('mpLimpar').addEventListener('click', () => {
        limparFormulario();
        avisar('');
    });
    document.getElementById('mpSair').addEventListener('click', () => {
        sessionStorage.removeItem('shopwise_auth');
    });

    carregarDados().catch((erro) => {
        tabela.innerHTML = '<tr><td colspan="4">Não foi possível carregar os preços.</td></tr>';
        avisar(erro.message || 'Não foi possível consultar a API.', true);
    });
})();
