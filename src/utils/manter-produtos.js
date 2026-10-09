(() => {
    const form = document.getElementById('mpFormProduto');
    if (!form) return;

    let autenticacao;
    try {
        autenticacao = JSON.parse(sessionStorage.getItem('shopwise_auth'));
    } catch {
        autenticacao = null;
    }
    if (autenticacao?.tipo !== 'supermercado' || !autenticacao.token || !autenticacao.supermercados?.length) {
        location.replace('login-supermercado.html');
        return;
    }

    const mercado = autenticacao.supermercados[0];
    const tabela = document.getElementById('mpTabelaProdutos');
    const mensagem = document.getElementById('mpMensagem');
    const nomeInput = document.getElementById('mpNome');
    const categoriaInput = document.getElementById('mpCategoria');
    const precoInput = document.getElementById('mpPreco');
    const estoqueInput = document.getElementById('mpEstoque');
    const salvar = document.getElementById('mpSalvar');
    const tituloFormulario = document.getElementById('mpTituloFormulario');
    let produtos = [];
    let precos = [];
    let precoEmEdicao = null;

    document.getElementById('sairMercado').addEventListener('click', (evento) => {
        evento.preventDefault();
        sessionStorage.removeItem('shopwise_auth');
        location.assign('login-supermercado.html');
    });

    const manual = document.getElementById('btnManual');
    const api = document.getElementById('btnApi');
    const sessaoManual = document.getElementById('sessaoManual');
    const sessaoApi = document.getElementById('sessaoApi');
    manual.addEventListener('click', () => {
        manual.classList.add('active');
        api.classList.remove('active');
        sessaoManual.style.display = '';
        sessaoApi.style.display = 'none';
    });
    api.addEventListener('click', () => {
        api.classList.add('active');
        manual.classList.remove('active');
        sessaoManual.style.display = 'none';
        sessaoApi.style.display = '';
    });

    function erroApi(dados) {
        if (typeof dados?.detail === 'string') return dados.detail;
        if (!dados || typeof dados !== 'object') return 'Não foi possível concluir a operação.';
        return ShopWiseMensagens.dados(dados, 'Não foi possível concluir a operação.');
    }

    async function requisicao(caminho, opcoes = {}) {
        const resposta = await fetch(caminho, {
            ...opcoes,
            headers: {
                Authorization: `Token ${autenticacao.token}`,
                ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
            },
        });
        if (resposta.status >= 500) throw new Error(ShopWiseMensagens.servidor);
        const dados = resposta.status === 204 ? null : await resposta.json();
        if (resposta.status === 401) {
            sessionStorage.removeItem('shopwise_auth');
            const entrar = document.createElement('a');
            entrar.href = 'login-supermercado.html';
            entrar.textContent = 'Entrar novamente';
            if (!document.getElementById('mpEntrarNovamente')) {
                entrar.id = 'mpEntrarNovamente';
                mensagem.after(entrar);
            }
            throw new Error('Sua sessão foi encerrada. Os campos preenchidos foram mantidos nesta tela. Entre novamente para continuar.');
        }
        if (!resposta.ok) throw new Error(erroApi(dados));
        return dados;
    }

    const normalizar = (valor) => String(valor || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');

    function encontrarProduto(nome) {
        return produtos.find((produto) => normalizar(produto.nome) === normalizar(nome));
    }

    function preencherCategoria(produto) {
        if (!produto) return;
        const opcao = Array.from(categoriaInput.options).find((item) =>
            normalizar(item.textContent) === normalizar(produto.categoria)
        );
        if (opcao) categoriaInput.value = opcao.value;
    }

    function renderizar() {
        const meusPrecos = precos.filter((preco) => preco.supermercado === mercado.id);
        document.getElementById('produtosExistentes').replaceChildren(...produtos.map((produto) => {
            const opcao = document.createElement('option');
            opcao.value = produto.nome;
            return opcao;
        }));

        tabela.replaceChildren();
        if (!meusPrecos.length) {
            const celula = tabela.insertRow().insertCell();
            celula.colSpan = 5;
            celula.textContent = 'Nenhum produto cadastrado no estoque ainda.';
            return;
        }

        for (const preco of meusPrecos) {
            const produto = produtos.find((item) => item.id === preco.produto);
            if (!produto) continue;
            const linha = tabela.insertRow();
            const nomeCelula = linha.insertCell();
            const caminhoFoto = (produto.imagem ? `../assets/${produto.imagem}` : null);
            if (caminhoFoto) {
                const foto = document.createElement('img');
                foto.className = 'mp-product-thumb';
                foto.src = caminhoFoto;
                foto.alt = '';
                nomeCelula.append(foto);
            }
            const nome = document.createElement('strong');
            nome.textContent = produto.nome;
            nomeCelula.append(nome);
            linha.insertCell().textContent = produto.categoria || 'Outros';
            linha.insertCell().textContent = Number(preco.valor).toLocaleString('pt-BR', {
                style: 'currency', currency: 'BRL',
            });
            linha.insertCell().textContent = preco.estoque === null ? 'Não informado' : `${preco.estoque} un.`;

            const acoes = linha.insertCell();
            const editar = document.createElement('button');
            editar.type = 'button';
            editar.className = 'mp-action-link mp-edit-link';
            editar.textContent = 'Editar';
            editar.setAttribute('aria-label', `Editar preço e estoque de ${produto.nome}`);
            editar.dataset.editar = preco.id;
            const remover = document.createElement('button');
            remover.type = 'button';
            remover.className = 'mp-action-link';
            remover.textContent = 'Excluir';
            remover.dataset.remover = preco.id;
            acoes.append(editar, remover);
        }
    }

    async function carregar() {
        [produtos, precos] = await Promise.all([
            requisicao('/api/produtos/'),
            requisicao('/api/precos/'),
        ]);
        renderizar();
    }

    nomeInput.addEventListener('change', () => preencherCategoria(encontrarProduto(nomeInput.value)));
    form.addEventListener('reset', () => {
        precoEmEdicao = null;
        nomeInput.readOnly = false;
        categoriaInput.disabled = false;
        salvar.textContent = 'Cadastrar Produto';
        tituloFormulario.textContent = 'Novo Produto';
    });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        mensagem.textContent = '';
        const nome = nomeInput.value.trim();
        const valor = Number(precoInput.value);
        const estoque = Number(estoqueInput.value);
        if (!nome || (!precoEmEdicao && !categoriaInput.value) || !Number.isFinite(valor) || valor <= 0 ||
            estoqueInput.value === '' || !Number.isInteger(estoque) || estoque < 0) {
            const campo = !nome ? nomeInput : (!precoEmEdicao && !categoriaInput.value) ? categoriaInput : (!Number.isFinite(valor) || valor <= 0) ? precoInput : estoqueInput;
            mensagem.textContent = campo === nomeInput ? 'Informe o nome do produto.' : campo === categoriaInput ? 'Selecione a categoria do produto.' : campo === precoInput ? 'Informe um preço maior que zero.' : 'Informe o estoque em unidades inteiras, a partir de zero.';
            campo.focus();
            return;
        }

        salvar.disabled = true;
        try {
            let produto = precoEmEdicao
                ? produtos.find((item) => item.id === precoEmEdicao.produto)
                : encontrarProduto(nome);
            if (!produto && !precoEmEdicao) {
                produto = await requisicao('/api/produtos/', {
                    method: 'POST',
                    body: JSON.stringify({
                        nome,
                        categoria: categoriaInput.options[categoriaInput.selectedIndex].text,
                    }),
                });
                produtos.push(produto);
            }
            const existente = precoEmEdicao || precos.find((preco) =>
                preco.produto === produto.id && preco.supermercado === mercado.id
            );
            await requisicao(existente ? `/api/precos/${existente.id}/` : '/api/precos/', {
                method: existente ? 'PUT' : 'POST',
                body: JSON.stringify({
                    produto: produto.id,
                    supermercado: mercado.id,
                    valor: valor.toFixed(2),
                    estoque,
                }),
            });
            form.reset();
            await carregar();
            mensagem.textContent = 'Produto salvo no estoque do seu supermercado.';
        } catch (erro) {
            mensagem.textContent = ShopWiseMensagens.falha(erro);
        } finally {
            salvar.disabled = false;
        }
    });

    tabela.addEventListener('click', async (evento) => {
        const editar = evento.target.closest('[data-editar]');
        const remover = evento.target.closest('[data-remover]');
        if (editar) {
            const preco = precos.find((item) => item.id === Number(editar.dataset.editar));
            const produto = produtos.find((item) => item.id === preco?.produto);
            if (!preco || !produto) return;
            nomeInput.value = produto.nome;
            preencherCategoria(produto);
            precoInput.value = preco.valor;
            estoqueInput.value = preco.estoque ?? '';
            precoEmEdicao = preco;
            nomeInput.readOnly = true;
            categoriaInput.disabled = true;
            salvar.textContent = 'Salvar alterações';
            tituloFormulario.textContent = 'Editar produto do estoque';
            manual.click();
            mensagem.textContent = `Editando ${produto.nome}. Altere o preço ou o estoque e salve.`;
            sessaoManual.scrollIntoView({ behavior: 'smooth', block: 'start' });
            precoInput.focus();
        }
        if (remover && window.confirm('Excluir o preço e o estoque deste produto do seu supermercado?')) {
            try {
                await requisicao(`/api/precos/${remover.dataset.remover}/`, { method: 'DELETE' });
                await carregar();
                mensagem.textContent = 'Produto removido do seu estoque.';
            } catch (erro) {
                mensagem.textContent = ShopWiseMensagens.falha(erro);
            }
        }
    });

    carregar().catch((erro) => {
        tabela.innerHTML = '<tr><td colspan="5">Não foi possível carregar os produtos.</td></tr>';
        mensagem.textContent = ShopWiseMensagens.falha(erro);
    });
})();
