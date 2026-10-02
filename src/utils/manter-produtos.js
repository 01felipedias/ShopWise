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

    const btnPedidos =
        document.getElementById('btnPedidos');

    const sessaoManual =
        document.getElementById('sessaoManual');

    const sessaoApi =
        document.getElementById('sessaoApi');

    // ======================================================
    // ESTADO
    // ======================================================

    let produtosCarregados = [];

    let produtoEmEdicaoId = null;

    let pedidosSupermercado = [];

    let pedidoAtual = null;

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

    function formatarData(data) {
        if (!data) {
            return '';
        }

        const objetoData =
            new Date(data);

        if (
            Number.isNaN(
                objetoData.getTime()
            )
        ) {
            return '';
        }

        return objetoData.toLocaleString(
            'pt-BR'
        );
    }

    function nomeStatusPedido(status) {
        const nomes = {
            pendente: 'Pendente',
            aguardando_pagamento:
                'Aguardando pagamento',
            confirmado: 'Confirmado',
            preparando: 'Preparando',
            enviado: 'Enviado',
            concluido: 'Concluído',
            cancelado: 'Cancelado'
        };

        return nomes[status] || status;
    }

    function nomeFormaPagamento(forma) {
        const nomes = {
            pix: 'PIX',
            credito: 'Cartão de crédito',
            debito: 'Cartão de débito',
            entrega: 'Pagamento na entrega'
        };

        return nomes[forma] || forma || '-';
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
                await fetch(
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
                            href="#"
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
                            href="#"
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
            alert(
                'Produto não encontrado.'
            );

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

                if (
                    !nome ||
                    !categoria ||
                    !preco ||
                    estoque === ''
                ) {
                    alert(
                        'Preencha todos os campos obrigatórios (*).'
                    );

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
                    alert(
                        'Informe um preço válido maior que zero.'
                    );

                    return;
                }

                if (
                    !Number
                        .isInteger(
                            estoqueNumero
                        ) ||
                    estoqueNumero < 0
                ) {
                    alert(
                        'Informe um estoque inteiro igual ou maior que zero.'
                    );

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
                        await fetch(
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

                    alert(
                        editando
                            ? '✅ Produto atualizado com sucesso!'
                            : '✅ Produto cadastrado com sucesso!'
                    );

                    sairModoEdicao();

                    await carregarProdutos();

                } catch (erro) {
                    console.error(
                        erro
                    );

                    alert(
                        erro.message ||
                        'Não foi possível salvar o produto.'
                    );

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
        const confirmar =
            confirm(
                'Tem certeza que deseja remover este produto do estoque?'
            );

        if (!confirmar) {
            return;
        }

        try {
            const resposta =
                await fetch(
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

            alert(
                'Produto excluído com sucesso!'
            );

            await carregarProdutos();

        } catch (erro) {
            console.error(
                erro
            );

            alert(
                erro.message ||
                'Não foi possível excluir o produto.'
            );
        }
    }

    window.removerProdutoMp =
        removerProduto;

    // ======================================================
    // PEDIDOS - MODAL
    // ======================================================

    function obterOverlayPedido() {
        return document
            .getElementById(
                'modalPedidoOverlay'
            );
    }

    function abrirModalPedido() {
        const overlay =
            obterOverlayPedido();

        if (!overlay) {
            throw new Error(
                'Modal de pedidos não encontrado.'
            );
        }

        const modal =
            overlay.querySelector(
                '.modal-pedido'
            );

        overlay.style.display =
            'flex';

        overlay.style.visibility =
            'visible';

        overlay.style.opacity =
            '1';

        overlay.style
            .pointerEvents =
            'auto';

        overlay.style.position =
            'fixed';

        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';

        overlay.style
            .alignItems =
            'center';

        overlay.style
            .justifyContent =
            'center';

        overlay.style.padding =
            '20px';

        overlay.style.zIndex =
            '99999';

        overlay.style
            .overflowY =
            'auto';

        overlay.style.background =
            'rgba(0, 0, 0, 0.55)';

        if (modal) {
            modal.style.display =
                'block';

            modal.style
                .visibility =
                'visible';

            modal.style.opacity =
                '1';

            modal.style
                .transform =
                'none';

            modal.style.position =
                'relative';

            modal.style.zIndex =
                '100000';

            modal.style.width =
                'min(900px, 96vw)';

            modal.style.maxHeight =
                '90vh';

            modal.style
                .overflowY =
                'auto';
            modal.style.overflowX =
                'hidden';

            modal.style.background =
                '#fff';
        }

        document.body
            .style.overflow =
            'hidden';
    }

    function fecharModalPedido() {
        const overlay =
            obterOverlayPedido();

        if (!overlay) {
            return;
        }

        overlay.style.display =
            'none';

        document.body
            .style.overflow =
            '';
    }

    window.fecharPedido =
        fecharModalPedido;

    window.fecharPedidoOverlay =
        function (event) {
            const overlay =
                obterOverlayPedido();

            if (
                overlay &&
                event.target ===
                    overlay
            ) {
                fecharModalPedido();
            }
        };

    // ======================================================
    // PEDIDOS - SELETOR
    // ======================================================

   function garantirSeletorPedidos() {
        const modalBody =
            document.querySelector(
                '#modalPedidoOverlay .modal-ped-body'
            );

        if (!modalBody) {
            return null;
        }

        let container =
            document.getElementById(
                'seletorPedidosRecebidos'
            );

        if (!container) {
            container =
                document.createElement('div');

            container.id =
                'seletorPedidosRecebidos';

            container.style.marginBottom =
                '1.5rem';

            container.innerHTML = `
                <p
                    class="secao-titulo"
                    style="margin-bottom:.5rem;"
                >
                    Pedidos recebidos
                </p>

                <select
                    id="pedidoRecebidoSelect"
                    class="mp-input"
                    style="
                        width:100%;
                        max-width:600px;
                    "
                >
                </select>
            `;

            modalBody.insertBefore(
                container,
                modalBody.firstChild
            );

            const select =
                document.getElementById(
                    'pedidoRecebidoSelect'
                );

            if (select) {
                select.addEventListener(
                    'change',
                    function () {
                        const id =
                            Number(this.value);

                        const pedido =
                            pedidosSupermercado.find(
                                item =>
                                    Number(item.id) === id
                            );

                        if (pedido) {
                            mostrarPedidoNoModal(
                                pedido
                            );
                        }
                    }
                );
            }
        }

        return document.getElementById(
            'pedidoRecebidoSelect'
        ); 
    }

    function atualizarOpcoesPedidos() {
        const select =
            garantirSeletorPedidos();

        if (!select) {
            return;
        }

        select.innerHTML =
            pedidosSupermercado
                .map(
                    pedido => `
                        <option
                            value="${
                                pedido.id
                            }"
                        >
                            Pedido #${
                                String(
                                    pedido.id
                                )
                                    .padStart(
                                        5,
                                        '0'
                                    )
                            }
                            —
                            ${
                                escaparHtml(
                                    pedido
                                        .cliente
                                        .nome
                                )
                            }
                            —
                            ${
                                escaparHtml(
                                    nomeStatusPedido(
                                        pedido
                                            .status
                                    )
                                )
                            }
                        </option>
                    `
                )
                .join('');

        if (pedidoAtual) {
            select.value =
                String(
                    pedidoAtual.id
                );
        }
    }

    // ======================================================
    // PEDIDOS - STEPPER
    // ======================================================

    function atualizarStepper(status) {
        const mapa = {
            confirmado: 0,
            preparando: 1,
            enviado: 2,
            concluido: 3
        };

        const indice = mapa[status];

        for (let i = 0; i <= 3; i++) {
            const step =
                document.getElementById(
                    `step-${i}`
                );

            if (!step) {
                continue;
            }

            step.classList.remove(
                'active'
            );

            if (
                status === 'cancelado' ||
                status === 'aguardando_pagamento'
            ) {
                step.style.opacity =
                    '0.4';

                continue;
            }

            if (
                indice !== undefined &&
                i <= indice
            ) {
                step.style.opacity =
                    '1';

                step.classList.add(
                    'active'
                );

            } else {
                step.style.opacity =
                    '0.35';
            }
        }

        const progresso =
            document.getElementById(
                'stepperProgress'
            );

        if (!progresso) {
            return;
        }

        /*
        * Mantém a barra sempre dentro
        * dos limites do stepper.
        */
        progresso.style.left =
            '12.5%';

        progresso.style.right =
            '12.5%';

        progresso.style.width =
            'auto';

        progresso.style.maxWidth =
            'none';

        progresso.style.transformOrigin =
            'left center';

        if (
            status === 'cancelado' ||
            status === 'aguardando_pagamento' ||
            indice === undefined
        ) {
            progresso.style.transform =
                'scaleX(0)';

            return;
        }

        const percentual =
            indice / 3;

        progresso.style.transform =
            `scaleX(${percentual})`;
    }

    // ======================================================
    // PEDIDOS - BOTÕES
    // ======================================================

    function atualizarBotoesPedido(
        pedido
    ) {
        const btnAvancar =
            document
                .getElementById(
                    'btnAvancar'
                );

        const btnCancelar =
            document
                .getElementById(
                    'btnCancelar'
                );

        const acaoTitulo =
            document
                .getElementById(
                    'acaoTitulo'
                );

        if (
            !btnAvancar ||
            !btnCancelar ||
            !acaoTitulo
        ) {
            return;
        }

        btnAvancar.style.display =
            '';

        btnCancelar.style.display =
            '';

        btnAvancar.disabled =
            false;

        btnCancelar.disabled =
            false;

        if (
            pedido.status ===
            'aguardando_pagamento'
        ) {
            acaoTitulo.textContent =
                'Aguardando confirmação do pagamento';

            btnAvancar.style.display =
                'none';

            btnCancelar.style.display =
                'none';

            return;
        }

        if (
            pedido.status ===
            'cancelado'
        ) {
            acaoTitulo.textContent =
                'Pedido cancelado';

            btnAvancar.style.display =
                'none';

            btnCancelar.style.display =
                'none';

            return;
        }

        if (
            pedido.status ===
            'concluido'
        ) {
            acaoTitulo.textContent =
                'Pedido concluído';

            btnAvancar.style.display =
                'none';

            btnCancelar.style.display =
                'none';

            return;
        }

        acaoTitulo.textContent =
            'O que deseja fazer?';

        if (
            pedido.status ===
            'confirmado'
        ) {
            btnAvancar.textContent =
                '▶ Iniciar preparação';

        } else if (
            pedido.status ===
            'preparando'
        ) {
            btnAvancar.textContent =
                '▶ Marcar como enviado';

        } else if (
            pedido.status ===
            'enviado'
        ) {
            btnAvancar.textContent =
                '✓ Concluir pedido';

        } else {
            btnAvancar.style.display =
                'none';
        }
    }

    // ======================================================
    // PEDIDOS - RENDERIZAR
    // ======================================================

    function mostrarPedidoNoModal(
        pedido
    ) {
        pedidoAtual = pedido;

        const titulo =
            document
                .getElementById(
                    'pedTitulo'
                );

        const subtitulo =
            document
                .getElementById(
                    'pedSubtitulo'
                );

        const clienteAvatar =
            document
                .getElementById(
                    'clienteAvatar'
                );

        const clienteNome =
            document
                .getElementById(
                    'clienteNome'
                );

        const clienteEndereco =
            document
                .getElementById(
                    'clienteEndereco'
                );

        const itensList =
            document
                .getElementById(
                    'itensList'
                );

        if (titulo) {
            titulo.textContent =
                `Pedido #${String(
                    pedido.id
                ).padStart(
                    5,
                    '0'
                )}`;
        }

        if (subtitulo) {
            subtitulo.textContent =
                `${pedido.cliente.nome} • ` +
                `${nomeStatusPedido(
                    pedido.status
                )} • ` +
                `${formatarData(
                    pedido.criado_em
                )}`;
        }

        if (clienteAvatar) {
            clienteAvatar
                .textContent =
                String(
                    pedido
                        .cliente
                        .nome ||
                    'C'
                )
                    .charAt(0)
                    .toUpperCase();
        }

        if (clienteNome) {
            clienteNome.textContent =
                pedido.cliente.nome;
        }

        if (clienteEndereco) {
            const endereco =
                pedido
                    .tipo_entrega ===
                    'pickup'
                    ? 'Retirada no supermercado'
                    : (
                        pedido
                            .endereco_entrega ||
                        'Endereço não informado'
                    );

            clienteEndereco.innerHTML = `
                ${
                    escaparHtml(
                        endereco
                    )
                }

                <br>

                ✉️ ${
                    escaparHtml(
                        pedido
                            .cliente
                            .email
                    )
                }

                <br>

                CEP: ${
                    escaparHtml(
                        pedido
                            .cliente
                            .cep
                    )
                }
            `;
        }

        if (itensList) {
            const itens =
                Array.isArray(
                    pedido.itens
                )
                    ? pedido.itens
                    : [];

            itensList.innerHTML =
                itens.map(
                    item => `
                        <div
                            style="
                                padding:
                                .85rem 0;
                                border-bottom:
                                1px solid
                                #eee;
                            "
                        >
                            <strong>
                                ${
                                    escaparHtml(
                                        item
                                            .nome
                                    )
                                }
                            </strong>

                            <div
                                style="
                                    color:#666;
                                    font-size:
                                    .9rem;
                                    margin-top:
                                    .25rem;
                                "
                            >
                                ${
                                    escaparHtml(
                                        item
                                            .quantidade
                                    )
                                }
                                x
                                ${
                                    formatarPreco(
                                        item
                                            .preco_unitario
                                    )
                                }

                                —
                                Subtotal:
                                ${
                                    formatarPreco(
                                        item
                                            .subtotal
                                    )
                                }
                            </div>
                        </div>
                    `
                ).join('');

            itensList.innerHTML += `
                <div
                    style="
                        padding-top:
                        1rem;
                        text-align:
                        right;
                        font-weight:
                        bold;
                        font-size:
                        1.05rem;
                    "
                >
                    Total desta loja:
                    ${
                        formatarPreco(
                            pedido
                                .subtotal_supermercado
                        )
                    }
                </div>

                <div
                    style="
                        margin-top:
                        .6rem;
                        color:#666;
                        font-size:
                        .9rem;
                    "
                >
                    Pagamento:
                    ${
                        escaparHtml(
                            nomeFormaPagamento(
                                pedido
                                    .forma_pagamento
                            )
                        )
                    }

                    ${
                        pedido
                            .pagamento_status
                            ? ' • Status: ' +
                              escaparHtml(
                                  pedido
                                      .pagamento_status
                              )
                            : ''
                    }
                </div>

                ${
                    pedido.observacoes
                        ? `
                            <div
                                style="
                                    margin-top:
                                    .8rem;
                                    padding:
                                    .75rem;
                                    background:
                                    #f8fafc;
                                    border-radius:
                                    8px;
                                    color:
                                    #475569;
                                "
                            >
                                <strong>
                                    Observações:
                                </strong>

                                ${
                                    escaparHtml(
                                        pedido
                                            .observacoes
                                    )
                                }
                            </div>
                          `
                        : ''
                }
            `;
        }

        const progressoSep =
            document
                .getElementById(
                    'progressoSep'
                );

        if (progressoSep) {
            progressoSep.style.display =
                'none';
        }

        atualizarStepper(
            pedido.status
        );

        atualizarBotoesPedido(
            pedido
        );

        atualizarOpcoesPedidos();
    }

    // ======================================================
    // PEDIDOS - CARREGAR
    // ======================================================

    async function abrirPedidosSupermercado() {
        try {
            const resposta =
                await fetch(
                    '/api/pedidos-supermercado/'
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

            const dados =
                await obterJsonResposta(
                    resposta
                );

            if (!resposta.ok) {
                throw new Error(
                    dados.erro ||
                    'Não foi possível carregar os pedidos.'
                );
            }

            pedidosSupermercado =
                Array.isArray(dados)
                    ? dados
                    : [];

            if (
                pedidosSupermercado
                    .length === 0
            ) {
                alert(
                    'Este supermercado ainda não recebeu pedidos.'
                );

                return;
            }

            pedidoAtual =
                pedidosSupermercado[0];

            atualizarOpcoesPedidos();

            mostrarPedidoNoModal(
                pedidoAtual
            );

            abrirModalPedido();

        } catch (erro) {
            console.error(
                'Erro ao abrir pedidos:',
                erro
            );

            alert(
                erro.message ||
                'Erro ao carregar pedidos.'
            );
        }
    }

    window.abrirPedidosSupermercado =
        abrirPedidosSupermercado;

    // Remove onclick antigo para evitar chamada duplicada.
    if (btnPedidos) {
        btnPedidos
            .removeAttribute(
                'onclick'
            );

        btnPedidos
            .addEventListener(
                'click',
                function (
                    event
                ) {
                    event
                        .preventDefault();

                    abrirPedidosSupermercado();
                }
            );

        btnPedidos
            .addEventListener(
                'keydown',
                function (
                    event
                ) {
                    if (
                        event.key ===
                            'Enter' ||
                        event.key ===
                            ' '
                    ) {
                        event
                            .preventDefault();

                        abrirPedidosSupermercado();
                    }
                }
            );
    }

    // ======================================================
    // PEDIDOS - ALTERAR STATUS
    // ======================================================

    async function alterarStatusPedido(
        novoStatus
    ) {
        if (!pedidoAtual) {
            return;
        }

        try {
            const resposta =
                await fetch(
                    `/api/pedidos-supermercado/${pedidoAtual.id}/status/`,
                    {
                        method:
                            'PATCH',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                status:
                                    novoStatus
                            })
                    }
                );

            const dados =
                await obterJsonResposta(
                    resposta
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
                throw new Error(
                    dados.erro ||
                    'Não foi possível atualizar o pedido.'
                );
            }

            pedidoAtual.status =
                dados.status;

            const pedidoLista =
                pedidosSupermercado
                    .find(
                        item =>
                            Number(
                                item.id
                            ) ===
                            Number(
                                pedidoAtual
                                    .id
                            )
                    );

            if (pedidoLista) {
                pedidoLista.status =
                    dados.status;
            }

            alert(
                '✅ Status atualizado com sucesso!'
            );

            mostrarPedidoNoModal(
                pedidoAtual
            );

        } catch (erro) {
            console.error(
                erro
            );

            alert(
                erro.message ||
                'Não foi possível atualizar o status.'
            );
        }
    }

    // ======================================================
    // PEDIDOS - AVANÇAR
    // ======================================================

    window.avancarStatus =
        async function () {
            if (!pedidoAtual) {
                return;
            }

            const fluxo = {
                confirmado:
                    'preparando',

                preparando:
                    'enviado',

                enviado:
                    'concluido'
            };

            const proximo =
                fluxo[
                    pedidoAtual.status
                ];

            if (!proximo) {
                alert(
                    'Este pedido não pode avançar para outro status.'
                );

                return;
            }

            await alterarStatusPedido(
                proximo
            );
        };

    // ======================================================
    // PEDIDOS - CANCELAR
    // ======================================================

    window.cancelarPedido =
        async function () {
            if (!pedidoAtual) {
                return;
            }

            const confirmar =
                confirm(
                    `Deseja realmente cancelar o pedido #${pedidoAtual.id}?`
                );

            if (!confirmar) {
                return;
            }

            await alterarStatusPedido(
                'cancelado'
            );
        };

    // ======================================================
    // PEDIDOS - NOTIFICAR
    // ======================================================

    window.notificarCliente =
        function () {
            if (!pedidoAtual) {
                return;
            }

            alert(
                'A função de notificação direta ao cliente será integrada depois.'
            );
        };

    // ======================================================
    // INICIALIZAÇÃO
    // ======================================================

    carregarProdutos();

})();