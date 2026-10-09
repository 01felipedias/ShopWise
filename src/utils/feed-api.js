(() => {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const mercadosContainer = document.getElementById('storesCarousel');
    const categoriasContainer = document.getElementById('categoryContainer');
    const busca = document.getElementById('searchInput');
    const ordenacao = document.getElementById('sortSelect');
    const modal = document.getElementById('modalOverlay');
    const estado = { produtos: [], precos: [], mercados: [], mercado: null, categoria: 'todos' };
    let bannerAtual = 0;
    const moeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

    function lerCarrinho() {
        try {
            const itens = JSON.parse(localStorage.getItem('carrinho'));
            return Array.isArray(itens) ? itens : [];
        } catch (_) {
            return [];
        }
    }

    function atualizarBadgeCarrinho() {
        const badge = document.querySelector('.cart-badge');
        if (!badge) return;
        const total = lerCarrinho().reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0);
        badge.textContent = String(total);
        badge.hidden = total === 0;
    }

    function adicionarCarrinho(produtoId, ofertaId, botao) {
        const produto = estado.produtos.find((item) => item.id === produtoId);
        const oferta = estado.precos.find((item) => item.id === ofertaId && item.produto === produtoId);
        if (!produto || !oferta || Number(oferta.estoque) <= 0) return;

        const carrinho = lerCarrinho();
        const id = `oferta-${oferta.id}`;
        const existente = carrinho.find((item) => item.id === id);
        const quantidadeAtual = Number(existente?.quantidade) || 0;
        if (quantidadeAtual >= Number(oferta.estoque)) {
            if (botao) botao.textContent = 'Limite do estoque';
            return;
        }

        if (existente) {
            existente.quantidade = quantidadeAtual + 1;
            existente.preco = Number(oferta.valor).toFixed(2).replace('.', ',');
            existente.estoque = Number(oferta.estoque);
            existente.disponivel = true;
        } else {
            carrinho.push({
                id,
                ofertaId: oferta.id,
                produtoId: produto.id,
                supermercadoId: oferta.supermercado,
                supermercadoNome: oferta.supermercado_nome,
                supermercadoEndereco: estado.mercados.find((mercado) => mercado.id === oferta.supermercado)?.endereco || '',
                nome: produto.nome,
                preco: Number(oferta.valor).toFixed(2).replace('.', ','),
                img: (produto.imagem ? `../assets/${produto.imagem}` : ''),
                estoque: Number(oferta.estoque),
                quantidade: 1
            });
        }
        localStorage.setItem('carrinho', JSON.stringify(carrinho));
        atualizarBadgeCarrinho();
        if (botao) {
            const texto = botao.textContent;
            botao.textContent = 'Adicionado!';
            window.setTimeout(() => { botao.textContent = texto; }, 1200);
        }
    }

    function elemento(tag, classe, conteudo) {
        const no = document.createElement(tag);
        if (classe) no.className = classe;
        if (conteudo !== undefined) no.textContent = conteudo;
        return no;
    }

    async function obter(caminho) {
        const resposta = await fetch(caminho);
        if (!resposta.ok) throw new Error('A API não respondeu. Verifique se o servidor está ligado.');
        return resposta.json();
    }

    function ofertas(produto) {
        return estado.precos.filter((preco) => preco.produto === produto.id)
            .sort((a, b) => Number(a.valor) - Number(b.valor));
    }

    function economiaEntreMercados(produto) {
        const lista = ofertas(produto);
        return lista.length < 2 ? 0 : Number(lista.at(-1).valor) - Number(lista[0].valor);
    }

    function moverBanner(indice) {
        const total = document.getElementById('bannerTrack').children.length;
        if (!total) return;
        bannerAtual = (indice + total) % total;
        document.getElementById('bannerTrack').style.transform = `translateX(-${bannerAtual * 100}%)`;
        document.querySelectorAll('#bannerDots .banner-dot').forEach((dot, posicao) => {
            dot.classList.toggle('active', posicao === bannerAtual);
            dot.setAttribute('aria-current', posicao === bannerAtual ? 'true' : 'false');
        });
    }

    function renderizarBanners() {
        const track = document.getElementById('bannerTrack');
        const dots = document.getElementById('bannerDots');
        track.replaceChildren();
        dots.replaceChildren();
        const mercadosAtivos = estado.mercados.filter((mercado) =>
            estado.precos.some((preco) => preco.supermercado === mercado.id)
        );
        for (const mercado of mercadosAtivos) {
            const slide = elemento('div', 'banner-slide api-banner-slide');
            const conteudo = elemento('div', 'api-banner-copy');
            conteudo.append(
                elemento('span', 'banner-badge', 'ShopWise em Floriano'),
                elemento('h2', '', `Compare os preços de ${mercado.nome}`),
                elemento('p', '', 'Veja os produtos disponíveis e escolha as melhores ofertas para o seu carrinho.')
            );
            const botao = elemento('button', 'api-banner-action', 'Ver produtos');
            botao.type = 'button';
            botao.dataset.mercado = mercado.id;
            conteudo.append(botao);
            slide.append(conteudo);
            const logo = /quaresma/i.test(mercado.nome) ? '../assets/quaresma.png' :
                /jorge/i.test(mercado.nome) ? '../assets/jorge-batista.png' : null;
            if (logo) {
                const imagem = elemento('img', 'api-banner-logo');
                imagem.src = logo;
                imagem.alt = `Logo ${mercado.nome}`;
                slide.append(imagem);
            }
            track.append(slide);
        }
        if (!track.children.length) {
            const slide = elemento('div', 'banner-slide api-banner-slide');
            slide.append(elemento('h2', '', 'Compare preços dos supermercados no ShopWise'));
            track.append(slide);
        }
        for (let indice = 0; indice < track.children.length; indice++) {
            const dot = elemento('button', 'banner-dot');
            dot.type = 'button';
            dot.dataset.banner = indice;
            dot.setAttribute('aria-label', `Ir para banner ${indice + 1}`);
            dots.append(dot);
        }
        moverBanner(0);
    }

    function ofertaExibida(produto) {
        const lista = ofertas(produto);
        return estado.mercado === null ? lista[0] :
            lista.find((preco) => preco.supermercado === estado.mercado);
    }

    function renderizarMercados() {
        mercadosContainer.replaceChildren();
        for (const mercado of estado.mercados.filter((item) =>
            estado.precos.some((preco) => preco.supermercado === item.id)
        )) {
            const botao = elemento('button', 'api-store-card', mercado.nome);
            botao.type = 'button';
            botao.dataset.mercado = mercado.id;
            botao.classList.toggle('active', estado.mercado === mercado.id);
            mercadosContainer.append(botao);
        }
        if (!mercadosContainer.children.length) mercadosContainer.append(elemento('p', '', 'Nenhum supermercado com estoque disponível.'));
    }

    function renderizarCategorias() {
        const visiveis = estado.produtos.filter((produto) => estado.mercado === null ||
            ofertas(produto).some((preco) => preco.supermercado === estado.mercado));
        const categorias = ['todos'];
        if (visiveis.some((produto) => economiaEntreMercados(produto) > 0)) categorias.push('economia');
        categorias.push(...new Set(visiveis.map((produto) => produto.categoria || 'Outros')));
        categoriasContainer.replaceChildren();
        for (const categoria of categorias) {
            const total = categoria === 'todos' ? visiveis.length :
                categoria === 'economia' ? visiveis.filter((produto) => economiaEntreMercados(produto) > 0).length :
                    visiveis.filter((produto) => (produto.categoria || 'Outros') === categoria).length;
            const botao = elemento('button', 'cat-btn', categoria === 'todos' ? 'Todos' :
                categoria === 'economia' ? 'Economia' : categoria);
            botao.type = 'button';
            botao.dataset.categoria = categoria;
            botao.classList.toggle('active', estado.categoria === categoria);
            botao.append(elemento('span', 'cat-count', String(total)));
            categoriasContainer.append(botao);
        }
    }

    function renderizarProdutos() {
        const termo = normalizar(busca.value.trim());
        const itens = estado.produtos.filter((produto) => {
            const lista = ofertas(produto);
            return (estado.categoria === 'todos' ||
                    (estado.categoria === 'economia' ? economiaEntreMercados(produto) > 0 :
                        (produto.categoria || 'Outros') === estado.categoria)) &&
                (estado.mercado === null || lista.some((preco) => preco.supermercado === estado.mercado)) &&
                (!termo || normalizar(produto.nome).includes(termo) ||
                    normalizar(produto.categoria).includes(termo));
        });
        itens.sort((a, b) => {
            if (ordenacao.value === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
            if (ordenacao.value === 'maior-economia') return economiaEntreMercados(b) - economiaEntreMercados(a);
            const precoA = ofertaExibida(a);
            const precoB = ofertaExibida(b);
            if (!precoA) return precoB ? 1 : a.nome.localeCompare(b.nome, 'pt-BR');
            if (!precoB) return -1;
            const diferenca = Number(precoA.valor) - Number(precoB.valor);
            return ordenacao.value === 'maior-preco' ? -diferenca : diferenca;
        });

        grid.replaceChildren();
        for (const produto of itens) {
            const menor = ofertaExibida(produto);
            const cartao = elemento('article', 'product-card api-product-card');
            const imagem = elemento('div', 'product-image-wrapper api-product-placeholder');
            const caminhoFoto = (produto.imagem ? `../assets/${produto.imagem}` : null);
            if (caminhoFoto) {
                imagem.classList.add('api-product-photo');
                const foto = elemento('img');
                foto.src = caminhoFoto;
                foto.alt = produto.nome;
                imagem.append(foto);
            } else {
                imagem.textContent = '🛒';
                imagem.setAttribute('aria-hidden', 'true');
            }
            const conteudo = elemento('div', 'product-info');
            conteudo.append(
                elemento('span', 'api-category', produto.categoria || 'Outros'),
                elemento('h3', 'product-name', produto.nome)
            );
            if (menor) {
                conteudo.append(
                    elemento('strong', 'price', moeda(menor.valor)),
                    elemento('span', 'api-market-name', estado.mercado === null ?
                        `Menor preço: ${menor.supermercado_nome}` : `Preço em ${menor.supermercado_nome}`),
                    elemento('span', 'api-stock', menor.estoque === null ? 'Estoque não informado' :
                        menor.estoque === 0 ? 'Sem estoque' : `Estoque: ${menor.estoque} un.`)
                );
                const economia = economiaEntreMercados(produto);
                if (economia > 0 && estado.mercado === null) {
                    conteudo.append(elemento('span', 'api-savings',
                        `Até ${moeda(economia)} de diferença entre mercados`));
                }
                const adicionar = elemento('button', 'btn-add', 'Adicionar ao carrinho');
                adicionar.type = 'button';
                adicionar.dataset.adicionar = menor.id;
                adicionar.dataset.produto = produto.id;
                conteudo.append(adicionar);
                const comparar = elemento('button', 'btn-comparar', 'Comparar preços');
                comparar.type = 'button';
                comparar.dataset.comparar = produto.id;
                conteudo.append(comparar);
            } else {
                conteudo.append(elemento('strong', 'api-no-price', 'Aguardando preço dos mercados'));
            }
            cartao.append(imagem, conteudo);
            grid.append(cartao);
        }
        if (!itens.length) grid.append(elemento('p', 'empty-state', 'Nenhum produto em estoque encontrado para este filtro.'));
        document.getElementById('resultInfo').textContent = `${itens.length} produto(s) encontrado(s)`;
        document.getElementById('activeFilterText').textContent = estado.mercado === null ?
            'Todos os supermercados' : `Supermercado: ${estado.mercados.find((item) => item.id === estado.mercado)?.nome || ''}`;
        document.getElementById('totalProdutos').textContent = String(estado.produtos.length);
        document.getElementById('totalMercados').textContent = String(new Set(
            estado.precos.map((preco) => preco.supermercado)
        ).size);
    }

    async function compararProduto(id) {
        const produto = estado.produtos.find((item) => item.id === id);
        if (!produto) return;
        const corpo = document.getElementById('comparacaoPrecos');
        const destaque = document.getElementById('melhorOferta');
        const grafico = document.getElementById('comparacaoGrafico');
        const locais = document.getElementById('comparacaoLocais');
        document.getElementById('comparacaoTitulo').textContent = produto.nome;
        corpo.replaceChildren(elemento('p', '', 'Carregando preços...'));
        destaque.replaceChildren();
        grafico.replaceChildren();
        locais.replaceChildren();
        selecionarAba('precos');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        try {
            const lista = await obter(`/api/produtos/${id}/comparar/`);
            corpo.replaceChildren();
            if (lista.length) {
                const menor = lista[0];
                const maior = lista.at(-1);
                const economia = Number(maior.valor) - Number(menor.valor);
                const informacao = elemento('div', 'best-pick-info');
                informacao.append(
                    elemento('h4', '', `Melhor opção: ${menor.supermercado_nome}`),
                    elemento('p', '', economia > 0 ?
                        `Economia de ${moeda(economia)} em relação ao maior preço` :
                        'Mesmo preço nos supermercados disponíveis')
                );
                const valor = elemento('div', 'best-pick-price');
                valor.append(elemento('strong', '', moeda(menor.valor)), elemento('span', '', 'menor preço'));
                destaque.append(elemento('div', 'best-pick-icon', '🏆'), informacao, valor);
            }
            for (const [indice, preco] of lista.entries()) {
                const linha = elemento('div', 'api-comparison-row');
                const detalhes = elemento('div');
                detalhes.append(
                    elemento('span', '', `${preco.supermercado_nome}${indice === 0 ? ' · menor preço' : ''}`),
                    elemento('small', 'api-stock', preco.estoque === null ? 'Estoque não informado' :
                        preco.estoque === 0 ? 'Sem estoque' : `Estoque: ${preco.estoque} un.`)
                );
                linha.append(
                    detalhes,
                    elemento('strong', '', moeda(preco.valor))
                );
                const adicionar = elemento('button', 'api-add-offer', 'Adicionar');
                adicionar.type = 'button';
                adicionar.dataset.adicionar = preco.id;
                adicionar.dataset.produto = produto.id;
                linha.append(adicionar);
                corpo.append(linha);

                const grupo = elemento('div', 'bar-group');
                const barra = elemento('div', `bar ${indice === 0 ? 'best-bar' : 'mid-bar'}`);
                barra.style.height = `${Math.max(24, Math.round(Number(preco.valor) / Number(lista.at(-1).valor) * 135))}px`;
                grupo.append(
                    elemento('div', 'bar-value', moeda(preco.valor)),
                    barra,
                    elemento('div', 'bar-label', preco.supermercado_nome)
                );
                grafico.append(grupo);

                const mercado = estado.mercados.find((item) => item.id === preco.supermercado);
                const local = elemento('div', 'distance-row');
                const descricao = elemento('div', 'sm-info');
                descricao.append(
                    elemento('h4', '', preco.supermercado_nome),
                    elemento('span', '', mercado?.endereco || 'Endereço não informado')
                );
                local.append(elemento('span', 'distance-dot'), descricao);
                locais.append(local);
            }
            if (!lista.length) corpo.append(elemento('p', '', 'Ainda não há preços para este produto.'));
        } catch (erro) {
            corpo.replaceChildren(elemento('p', '', erro.message));
        }
    }

    function selecionarAba(aba) {
        document.querySelectorAll('.modal-tabs .tab-btn').forEach((botao) => {
            const ativa = botao.dataset.aba === aba;
            botao.classList.toggle('active', ativa);
            botao.setAttribute('aria-selected', ativa ? 'true' : 'false');
        });
        document.querySelectorAll('.api-comparison-modal .tab-panel').forEach((painel) => {
            painel.classList.toggle('active', painel.id === `tab-${aba}`);
        });
    }

    function fecharModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    function configurarSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const conteudo = document.querySelector('.main-content');
        function alternar() {
            if (window.innerWidth >= 768) {
                sidebar.classList.toggle('pinned');
                conteudo.classList.toggle('sidebar-pinned');
            } else {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            }
        }
        document.getElementById('desktopMenuToggle')?.addEventListener('click', alternar);
        document.getElementById('mobileMenuToggle')?.addEventListener('click', alternar);
        overlay?.addEventListener('click', alternar);
        document.querySelectorAll('.sidebar-nav .nav-item[href="#"]').forEach((link) => {
            link.addEventListener('click', (evento) => evento.preventDefault());
        });
    }

    busca.addEventListener('input', renderizarProdutos);
    ordenacao.addEventListener('change', renderizarProdutos);
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        busca.value = '';
        ordenacao.value = 'menor-preco';
        estado.mercado = null;
        estado.categoria = 'todos';
        renderizarMercados();
        renderizarCategorias();
        renderizarProdutos();
    });
    mercadosContainer.addEventListener('click', (evento) => {
        const id = Number(evento.target.closest('[data-mercado]')?.dataset.mercado);
        if (!id) return;
        estado.mercado = estado.mercado === id ? null : id;
        estado.categoria = 'todos';
        renderizarMercados();
        renderizarCategorias();
        renderizarProdutos();
    });
    categoriasContainer.addEventListener('click', (evento) => {
        const categoria = evento.target.closest('[data-categoria]')?.dataset.categoria;
        if (!categoria) return;
        estado.categoria = categoria;
        renderizarCategorias();
        renderizarProdutos();
    });
    grid.addEventListener('click', (evento) => {
        const botaoAdicionar = evento.target.closest('[data-adicionar]');
        if (botaoAdicionar) {
            adicionarCarrinho(Number(botaoAdicionar.dataset.produto), Number(botaoAdicionar.dataset.adicionar), botaoAdicionar);
            return;
        }
        const id = Number(evento.target.closest('[data-comparar]')?.dataset.comparar);
        if (id) compararProduto(id);
    });
    document.getElementById('comparacaoPrecos').addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-adicionar]');
        if (botao) adicionarCarrinho(Number(botao.dataset.produto), Number(botao.dataset.adicionar), botao);
    });
    document.querySelector('.modal-tabs').addEventListener('click', (evento) => {
        const aba = evento.target.closest('[data-aba]')?.dataset.aba;
        if (aba) selecionarAba(aba);
    });
    document.getElementById('bannerAnterior').addEventListener('click', () => moverBanner(bannerAtual - 1));
    document.getElementById('bannerProximo').addEventListener('click', () => moverBanner(bannerAtual + 1));
    document.getElementById('bannerDots').addEventListener('click', (evento) => {
        const indice = evento.target.closest('[data-banner]')?.dataset.banner;
        if (indice !== undefined) moverBanner(Number(indice));
    });
    document.getElementById('bannerTrack').addEventListener('click', (evento) => {
        const id = Number(evento.target.closest('[data-mercado]')?.dataset.mercado);
        if (!id) return;
        estado.mercado = id;
        estado.categoria = 'todos';
        renderizarMercados();
        renderizarCategorias();
        renderizarProdutos();
        document.getElementById('storesCarousel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('fecharComparacao').addEventListener('click', fecharModal);
    modal.addEventListener('click', (evento) => { if (evento.target === modal) fecharModal(); });
    document.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') fecharModal(); });

    configurarSidebar();
    atualizarBadgeCarrinho();
    window.setInterval(() => {
        if (!document.hidden) moverBanner(bannerAtual + 1);
    }, 5000);

    Promise.all([
        obter('/api/produtos/'), obter('/api/precos/'), obter('/api/supermercados/'),
    ]).then(([produtos, precos, mercados]) => {
        const disponiveis = precos.filter((preco) => Number(preco.estoque) > 0);
        const idsEmEstoque = new Set(disponiveis.map((preco) => preco.produto));
        Object.assign(estado, {
            produtos: produtos.filter((produto) => idsEmEstoque.has(produto.id)),
            precos: disponiveis,
            mercados,
        });
        renderizarBanners();
        renderizarMercados();
        renderizarCategorias();
        renderizarProdutos();
    }).catch((erro) => {
        document.getElementById('resultInfo').textContent = 'Falha ao carregar produtos';
        grid.replaceChildren(elemento('p', 'empty-state', erro.message));
    });
})();
