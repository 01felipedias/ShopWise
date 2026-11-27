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

    const mpImagem =
        document.getElementById('mpImagem');

    const mpImagemPreview =
        document.getElementById('mpImagemPreview');

    const mpImagemPreviewImg =
        document.getElementById('mpImagemPreviewImg');

    const mpImagemPreviewTexto =
        document.getElementById('mpImagemPreviewTexto');

    const mpImagemNome =
        document.getElementById('mpImagemNome');

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
    let urlImagemTemporaria = null;


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

    function mostrarPreviewImagem(url, texto) {
        if (!mpImagemPreview || !mpImagemPreviewImg) return;
        mpImagemPreviewImg.src = url;
        mpImagemPreviewTexto.textContent = texto || '';
        mpImagemPreview.hidden = false;
    }

    function limparPreviewImagem() {
        if (urlImagemTemporaria) {
            URL.revokeObjectURL(urlImagemTemporaria);
            urlImagemTemporaria = null;
        }
        if (mpImagemPreviewImg) mpImagemPreviewImg.removeAttribute('src');
        if (mpImagemPreviewTexto) mpImagemPreviewTexto.textContent = '';
        if (mpImagemPreview) mpImagemPreview.hidden = true;
        if (mpImagemNome) mpImagemNome.textContent = 'Nenhuma foto selecionada';
    }

    function normalizarTextoProduto(valor) {
        return String(valor ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function obterImagemProduto(produto) {
        if (produto.imagem) return produto.imagem;

        const nome = normalizarTextoProduto(produto.nome);
        const imagens = window.SHOPWISE_PRODUCT_IMAGES || {};
        if (nome.includes('arroz')) return imagens.arroz || '';
        if (nome.includes('suco del valle')) return imagens.suco_del_valle || '';
        if (nome.includes('feijao preto')) return imagens.feijao_preto || '';
        if (nome.includes('feijao')) return imagens.feijao || '';
        if (nome.includes('leite')) return imagens.leite || '';
        if (nome.includes('queijo')) return imagens.queijo || '';
        if (nome.includes('iogurte')) return imagens.iogurte || '';
        if (nome.includes('flocao')) return imagens.flocao || '';
        if (nome.includes('sabao')) return imagens.sabao || '';
        if (nome.includes('cafe')) return imagens.cafe || '';
        if (nome.includes('carne')) return imagens.carne || '';
        if (nome.includes('refrigerante') || nome.includes('coca-cola')) return imagens.refrigerante || '';
        if (nome.includes('detergente')) return imagens.detergente || '';
        return '';
    }

    if (mpImagem) {
        mpImagem.addEventListener('change', function () {
            const arquivo = mpImagem.files?.[0];
            if (!arquivo) return;
            if (!arquivo.type.startsWith('image/')) {
                mpImagem.value = '';
                limparPreviewImagem();
                mostrarFeedback('Arquivo inválido', 'Selecione um arquivo de imagem JPG, PNG ou WebP.');
                return;
            }
            if (arquivo.size > 5 * 1024 * 1024) {
                mpImagem.value = '';
                limparPreviewImagem();
                mostrarFeedback('Imagem muito grande', 'A foto deve ter no máximo 5 MB.');
                return;
            }
            if (urlImagemTemporaria) URL.revokeObjectURL(urlImagemTemporaria);
            urlImagemTemporaria = URL.createObjectURL(arquivo);
            if (mpImagemNome) mpImagemNome.textContent = arquivo.name;
            mostrarPreviewImagem(urlImagemTemporaria, arquivo.name);
        });
    }

    formProduto?.addEventListener('reset', limparPreviewImagem);

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
                        <div class="mp-product-cell">
                            ${obterImagemProduto(produto)
                                ? `<img class="mp-product-thumb" src="${escaparHtml(obterImagemProduto(produto))}" alt="Foto de ${escaparHtml(produto.nome)}" loading="lazy">`
                                : `<span class="mp-product-placeholder" aria-hidden="true">${escaparHtml((produto.nome || 'P').charAt(0).toUpperCase())}</span>`}
                            <div>
                                <strong>${escaparHtml(produto.nome)}</strong>
                                <br>
                                <small style="color:#666;">${escaparHtml(produto.descricao || 'Sem descrição')}</small>
                            </div>
                        </div>
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

        if (mpImagem) mpImagem.value = '';
        if (produto.imagem) {
            mostrarPreviewImagem(produto.imagem, 'Foto atual. Escolha outra para substituir.');
            if (mpImagemNome) mpImagemNome.textContent = 'Foto atual salva';
        } else {
            limparPreviewImagem();
        }

        if (mpFormTitulo) {
            mpFormTitulo.textContent =
                `Editar Produto ${produto.id}`;
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

                const dadosProduto = new FormData();
                dadosProduto.append('supermercado', supermercado.id);
                dadosProduto.append('nome', nome);
                dadosProduto.append('tamanho_embalagem', tamanhoEmbalagem);
                dadosProduto.append('categoria', categoria);
                dadosProduto.append('preco', precoNumero.toFixed(2));
                dadosProduto.append('estoque', estoqueNumero);
                dadosProduto.append('descricao', descricao);
                if (mpImagem?.files?.[0]) {
                    dadosProduto.append('imagem', mpImagem.files[0]);
                }

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

                                body: dadosProduto
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
