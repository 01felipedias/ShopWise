// ==========================================================
// SHOPWISE - MANTER PRODUTOS / PEDIDOS DO SUPERMERCADO
// ==========================================================

(function () {
    'use strict';

    console.log('Módulo Manter Produtos conectado à API.');

    // ======================================================
    // ELEMENTOS - PRODUTOS
    // ======================================================

    const formProduto =
        document.getElementById('mpFormProduto');

    const tabelaProdutos =
        document.getElementById('mpTabelaProdutos');

    const mpNome =
        document.getElementById('mpNome');

    const mpCategoria =
        document.getElementById('mpCategoria');

    const mpPreco =
        document.getElementById('mpPreco');

    const mpEstoque =
        document.getElementById('mpEstoque');

    const mpDescricao =
        document.getElementById('mpDescricao');

    const mpTamanhoEmbalagem =
        document.getElementById('mpTamanhoEmbalagem');

    const mpFormTitulo =
        document.getElementById('mpFormTitulo');

    const mpBtnSalvar =
        document.getElementById('mpBtnSalvar');

    const mpBtnLimpar =
        document.getElementById('mpBtnLimpar');

    const mpBtnCancelarEdicao =
        document.getElementById(
            'mpBtnCancelarEdicao'
        );

    // ======================================================
    // ELEMENTOS - ABAS
    // ======================================================

    const btnManual =
        document.getElementById('btnManual');

    const btnApi =
        document.getElementById('btnApi');


    const sessaoManual =
        document.getElementById('sessaoManual');

    const sessaoApi =
        document.getElementById('sessaoApi');

    // ======================================================
    // ESTADO
    // ======================================================

    let produtosCarregados = [];

    let produtoEmEdicaoId = null;


    const feedbackDialog = document.getElementById('mpFeedbackDialog');
    const feedbackTitulo = document.getElementById('mpFeedbackTitulo');
    const feedbackMensagem = document.getElementById('mpFeedbackMensagem');
    const feedbackConfirmar = document.getElementById('mpFeedbackConfirmar');
    const feedbackCancelar = document.getElementById('mpFeedbackCancelar');
    let feedbackResolver = null;

    function mostrarFeedback(titulo, mensagem) {
        if (!feedbackDialog) return;
        feedbackTitulo.textContent = titulo;
        feedbackMensagem.textContent = mensagem;
        feedbackConfirmar.textContent = 'Entendi';
        feedbackConfirmar.classList.remove('danger');
        feedbackCancelar.hidden = true;
        if (!feedbackDialog.open) feedbackDialog.showModal();
    }

    function confirmarFeedback(titulo, mensagem, textoConfirmar) {
        if (!feedbackDialog) return Promise.resolve(false);
        feedbackTitulo.textContent = titulo;
        feedbackMensagem.textContent = mensagem;
        feedbackConfirmar.textContent = textoConfirmar;
        feedbackConfirmar.classList.add('danger');
        feedbackCancelar.hidden = false;
        return new Promise(resolve => {
            feedbackResolver = resolve;
            if (!feedbackDialog.open) feedbackDialog.showModal();
        });
    }

    window.fecharMpFeedback = function (confirmado) {
        const resolver = feedbackResolver;
        feedbackResolver = null;
        if (feedbackDialog?.open) feedbackDialog.close();
        resolver?.(Boolean(confirmado));
    };

    feedbackDialog?.addEventListener('close', function () {
        if (feedbackResolver) {
            const resolver = feedbackResolver;
            feedbackResolver = null;
            resolver(false);
        }
    });

    // ======================================================
    // UTILITÁRIOS
    // ======================================================

    function obterSupermercadoLogado() {
        try {
            const dados =
                localStorage.getItem(
                    'shopwise_supermercado'
                );

            if (!dados) {
                return null;
            }

            return JSON.parse(dados);

        } catch (erro) {
            console.error(
                'Erro ao recuperar supermercado.',
                erro
            );

            return null;
        }
    }

    function escaparHtml(valor) {
        return String(valor ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatarPreco(valor) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return 'R$ 0,00';
        }

        return numero.toLocaleString(
            'pt-BR',
            {
                style: 'currency',
                currency: 'BRL'
            }
        );
    }

    async function obterJsonResposta(
        resposta
    ) {
        try {
            return await resposta.json();
        } catch (_) {
            return {};
        }
    }

    // ======================================================
    // NAVEGAÇÃO
    // ======================================================

    function ativarCadastroManual() {
        if (
            !btnManual ||
            !btnApi ||
            !sessaoManual ||
            !sessaoApi
        ) {
            return;
        }

        btnManual.classList.add(
            'active'
        );

        btnApi.classList.remove(
            'active'
        );

        sessaoManual.style.display =
            'block';

        sessaoApi.style.display =
            'none';
    }

    function ativarApi() {
        if (
            !btnManual ||
            !btnApi ||
            !sessaoManual ||
            !sessaoApi
        ) {
            return;
        }

        btnApi.classList.add(
            'active'
        );

        btnManual.classList.remove(
            'active'
        );

        sessaoApi.style.display =
            'block';

        sessaoManual.style.display =
            'none';
    }

    if (btnManual) {
        btnManual.addEventListener(
            'click',
            ativarCadastroManual
        );
    }

    if (btnApi) {
        btnApi.addEventListener(
            'click',
            ativarApi
        );
    }

    // ======================================================
    // RESET DO FORMULÁRIO
    // ======================================================

    function sairModoEdicao() {
        produtoEmEdicaoId = null;

        if (formProduto) {
            formProduto.reset();
        }

        if (mpFormTitulo) {
            mpFormTitulo.textContent =
                'Novo Produto';
        }

        if (mpBtnSalvar) {
            mpBtnSalvar.textContent =
                'Cadastrar Produto';

            mpBtnSalvar.disabled =
                false;
        }

        if (mpBtnLimpar) {
            mpBtnLimpar.style.display =
                '';
        }

        if (
            mpBtnCancelarEdicao
        ) {
            mpBtnCancelarEdicao
                .style.display = 'none';
        }
    }

    if (
        mpBtnCancelarEdicao
    ) {
        mpBtnCancelarEdicao
            .addEventListener(
                'click',
                sairModoEdicao
            );
    }

    if (mpBtnLimpar) {
        mpBtnLimpar.addEventListener(
            'click',
            function () {
                produtoEmEdicaoId =
                    null;

                if (
                    mpFormTitulo
                ) {
                    mpFormTitulo
                        .textContent =
                        'Novo Produto';
                }

                if (
                    mpBtnSalvar
                ) {
                    mpBtnSalvar
                        .textContent =
                        'Cadastrar Produto';
                }
            }
        );
    }

    // ======================================================
    // PRODUTOS - LISTAR
    // ======================================================

    async function carregarProdutos() {
        if (!tabelaProdutos) {
            return;
        }

        const supermercado =
            obterSupermercadoLogado();

        if (!supermercado) {
            window.location.href =
                'login-supermercado.html';

            return;
        }

        tabelaProdutos.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:2rem;
                        color:#666;
                    "
                >
                    Carregando produtos...
                </td>
            </tr>
        `;

        try {
            const resposta =
                await shopwiseFetch(
                    '/api/produtos/'
                );

            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {
                window.location.href =
                    'login-supermercado.html';

                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    'Não foi possível carregar os produtos.'
                );
            }

            const dados =
                await resposta.json();

            produtosCarregados =
                Array.isArray(dados)
                    ? dados
                    : [];

            renderizarProdutos();

        } catch (erro) {
            console.error(erro);

            tabelaProdutos.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        style="
                            text-align:center;
                            padding:2rem;
                            color:#b91c1c;
                        "
                    >
                        Não foi possível carregar
                        os produtos.
                    </td>
                </tr>
            `;
        }
    }

    function renderizarProdutos() {
        if (!tabelaProdutos) {
            return;
        }

        tabelaProdutos.innerHTML =
            '';

        if (
            produtosCarregados
                .length === 0
        ) {
            tabelaProdutos.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        style="
                            text-align:center;
                            color:#777;
                            padding:2rem;
                        "
                    >
                        Nenhum produto cadastrado
                        no estoque ainda.
                    </td>
                </tr>
            `;

            return;
        }

        produtosCarregados
            .forEach(produto => {
                const linha =
                    document
                        .createElement(
                            'tr'
                        );

                linha.innerHTML = `
                    <td>
                        <strong>
                            ${
                                escaparHtml(
                                    produto.nome
                                )
                            }
                        </strong>

                        <br>

                        <small
                            style="
                                color:#666;
                            "
                        >
                            ${
                                escaparHtml(
                                    produto
                                        .descricao ||
                                    'Sem descrição'
                                )
                            }
                        </small>
                    </td>

                    <td
                        style="
                            text-transform:
                            capitalize;
                        "
                    >
                        ${
                            escaparHtml(
                                produto
                                    .categoria
                            )
                        }
                    </td>

                    <td>
                        ${
                            formatarPreco(
                                produto.preco
                            )
                        }
                    </td>

                    <td>
                        ${
                            escaparHtml(
                                produto
                                    .estoque
                            )
                        } un.
                    </td>

                    <td>
                        <a
                            role="button"
                            tabindex="0"
                            class="
                                mp-action-link
                            "
                            data-editar="${
                                produto.id
                            }"
                        >
                            Editar
                        </a>

                        <span
                            style="
                                color:#bbb;
                                margin:0 8px;
                            "
                        >
                            |
                        </span>

                        <a
                            role="button"
                            tabindex="0"
                            class="
                                mp-action-link
                            "
                            data-excluir="${
                                produto.id
                            }"
                        >
                            Excluir
                        </a>
                    </td>
                `;

                tabelaProdutos
                    .appendChild(
                        linha
                    );
            });

        tabelaProdutos
            .querySelectorAll(
                '[data-editar]'
            )
            .forEach(link => {
                link.addEventListener(
                    'click',
                    function (
                        event
                    ) {
                        event
                            .preventDefault();

                        editarProduto(
                            Number(
                                this.dataset
                                    .editar
                            )
                        );
                    }
                );
            });

        tabelaProdutos
            .querySelectorAll(
                '[data-excluir]'
            )
            .forEach(link => {
                link.addEventListener(
                    'click',
                    function (
                        event
                    ) {
                        event
                            .preventDefault();

                        removerProduto(
                            Number(
                                this.dataset
                                    .excluir
                            )
                        );
                    }
                );
            });
    }

    // ======================================================
    // PRODUTOS - EDITAR
    // ======================================================

    function editarProduto(id) {
        const produto =
            produtosCarregados.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );

        if (!produto) {
            mostrarFeedback('Produto não encontrado', 'Atualize a lista de produtos e tente novamente.');

            return;
        }

        ativarCadastroManual();

        produtoEmEdicaoId =
            Number(produto.id);

        if (mpNome) {
            mpNome.value =
                produto.nome || '';
        }

        if (mpCategoria) {
            mpCategoria.value =
                produto.categoria || '';
        }

        if (mpPreco) {
            mpPreco.value =
                produto.preco || '';
        }

        if (mpEstoque) {
            mpEstoque.value =
                produto.estoque ?? '';
        }

        if (mpDescricao) {
            mpDescricao.value =
                produto.descricao || '';
        }

        if (mpTamanhoEmbalagem) {
            mpTamanhoEmbalagem.value =
                produto.tamanho_embalagem || '';
        }

        if (mpFormTitulo) {
            mpFormTitulo.textContent =
                `Editar Produto #${produto.id}`;
        }

        if (mpBtnSalvar) {
            mpBtnSalvar.textContent =
                'Salvar Alterações';
        }

        if (mpBtnLimpar) {
            mpBtnLimpar.style.display =
                'none';
        }

        if (
            mpBtnCancelarEdicao
        ) {
            mpBtnCancelarEdicao
                .style.display = '';
        }

        if (sessaoManual) {
            sessaoManual
                .scrollIntoView({
                    behavior:
                        'smooth',
                    block: 'start'
                });
        }

        if (mpNome) {
            mpNome.focus();
        }
    }

    window.editarProdutoMp =
        editarProduto;

    // ======================================================
    // PRODUTOS - CADASTRAR / ATUALIZAR
    // ======================================================

    if (formProduto) {
        formProduto.addEventListener(
            'submit',
            async function (
                event
            ) {
                event.preventDefault();

                const nome =
                    mpNome
                        ? mpNome
                            .value
                            .trim()
                        : '';

                const categoria =
                    mpCategoria
                        ? mpCategoria
                            .value
                        : '';

                const preco =
                    mpPreco
                        ? mpPreco
                            .value
                        : '';

                const estoque =
                    mpEstoque
                        ? mpEstoque
                            .value
                        : '';

                const descricao =
                    mpDescricao
                        ? mpDescricao
                            .value
                            .trim()
                        : '';

                const tamanhoEmbalagem =
                    mpTamanhoEmbalagem
                        ? mpTamanhoEmbalagem.value.trim()
                        : '';

                if (
                    !nome ||
                    !categoria ||
                    !preco ||
                    estoque === ''
                ) {
                    mostrarFeedback('Campos obrigatórios', 'Preencha todos os campos marcados com asterisco.');

                    return;
                }

                const precoNumero =
                    Number(preco);

                const estoqueNumero =
                    Number(estoque);

                if (
                    !Number
                        .isFinite(
                            precoNumero
                        ) ||
                    precoNumero <= 0
                ) {
                    mostrarFeedback('Preço inválido', 'Informe um preço maior que zero.');

                    return;
                }

                if (
                    !Number
                        .isInteger(
                            estoqueNumero
                        ) ||
                    estoqueNumero < 0
                ) {
                    mostrarFeedback('Estoque inválido', 'Informe um número inteiro igual ou maior que zero.');

                    return;
                }

                const supermercado =
                    obterSupermercadoLogado();

                if (!supermercado) {
                    window.location.href =
                        'login-supermercado.html';

                    return;
                }

                const dadosProduto = {
                    supermercado:
                        supermercado.id,
                    nome,
                    tamanho_embalagem: tamanhoEmbalagem,
                    categoria,
                    preco:
                        precoNumero
                            .toFixed(2),
                    estoque:
                        estoqueNumero,
                    descricao
                };

                const editando =
                    produtoEmEdicaoId !==
                    null;

                const url =
                    editando
                        ? `/api/produtos/${produtoEmEdicaoId}/`
                        : '/api/produtos/';

                const metodo =
                    editando
                        ? 'PUT'
                        : 'POST';

                try {
                    if (
                        mpBtnSalvar
                    ) {
                        mpBtnSalvar
                            .disabled =
                            true;

                        mpBtnSalvar
                            .textContent =
                            editando
                                ? 'Salvando...'
                                : 'Cadastrando...';
                    }

                    const resposta =
                        await shopwiseFetch(
                            url,
                            {
                                method:
                                    metodo,

                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify(
                                        dadosProduto
                                    )
                            }
                        );

                    const dados =
                        await obterJsonResposta(
                            resposta
                        );

                    if (
                        resposta
                            .status ===
                            401 ||
                        resposta
                            .status ===
                            403
                    ) {
                        window
                            .location
                            .href =
                            'login-supermercado.html';

                        return;
                    }

                    if (
                        !resposta.ok
                    ) {
                        console.error(
                            dados
                        );

                        throw new Error(
                            dados.erro ||
                            dados.detail ||
                            'Não foi possível salvar o produto.'
                        );
                    }

                    sairModoEdicao();

                    await carregarProdutos();

                } catch (erro) {
                    console.error(
                        erro
                    );

                    mostrarFeedback('Não foi possível salvar o produto', erro.message || 'Tente novamente.');

                } finally {
                    if (
                        mpBtnSalvar
                    ) {
                        mpBtnSalvar
                            .disabled =
                            false;

                        if (
                            produtoEmEdicaoId ===
                            null
                        ) {
                            mpBtnSalvar
                                .textContent =
                                'Cadastrar Produto';
                        } else {
                            mpBtnSalvar
                                .textContent =
                                'Salvar Alterações';
                        }
                    }
                }
            }
        );
    }

    // ======================================================
    // PRODUTOS - EXCLUIR
    // ======================================================

    async function removerProduto(
        id
    ) {
        const confirmar = await confirmarFeedback(
            'Excluir produto?',
            'O produto será removido do estoque do supermercado.',
            'Excluir produto'
        );

        if (!confirmar) {
            return;
        }

        try {
            const resposta =
                await shopwiseFetch(
                    `/api/produtos/${id}/`,
                    {
                        method:
                            'DELETE'
                    }
                );

            if (
                resposta.status ===
                    401 ||
                resposta.status ===
                    403
            ) {
                window.location.href =
                    'login-supermercado.html';

                return;
            }

            if (!resposta.ok) {
                const dados =
                    await obterJsonResposta(
                        resposta
                    );

                throw new Error(
                    dados.erro ||
                    dados.detail ||
                    'Não foi possível excluir o produto.'
                );
            }

            if (
                Number(
                    produtoEmEdicaoId
                ) ===
                Number(id)
            ) {
                sairModoEdicao();
            }

            await carregarProdutos();

        } catch (erro) {
            console.error(
                erro
            );

            mostrarFeedback('Não foi possível excluir o produto', erro.message || 'Tente novamente.');
        }
    }

    window.removerProdutoMp =
        removerProduto;

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================

    carregarProdutos();


})();
