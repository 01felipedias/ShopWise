// Feed público: produtos e preços vêm da API do ShopWise.
(() => {
    const estado = {
        produtos: [],
        supermercados: [],
        precos: [],
        categoria: 'todos',
        mercadoId: null,
        termo: '',
        ordenacao: 'menor-preco',
        carregando: true,
        erro: false,
    };

    const dinheiro = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    function escapar(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[caractere]);
    }

    function normalizar(valor) {
        return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function iniciais(nome) {
        return String(nome).split(/\s+/).filter(Boolean).slice(0, 2)
            .map((parte) => parte[0].toUpperCase()).join('');
    }

    function ofertasDoProduto(id) {
        return estado.precos.filter((preco) => preco.produto === id)
            .sort((a, b) => Number(a.valor) - Number(b.valor));
    }

    function precoMaisBarato(produto) {
        const ofertas = ofertasDoProduto(produto.id);
        return (estado.mercadoId === null
            ? ofertas[0]
            : ofertas.find((preco) => preco.supermercado === estado.mercadoId)) || null;
    }

    async function buscar(url) {
        const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao consultar ${url}`);
        return resposta.json();
    }

    function renderizarResumo() {
        document.getElementById('totalOfertas').textContent = estado.precos.length;
        document.getElementById('totalMercados').textContent = estado.supermercados.length;
    }

    function renderizarCategorias() {
        const categorias = [...new Set(estado.produtos.map((produto) => produto.categoria).filter(Boolean))];
        const container = document.getElementById('categoryContainer');
        container.innerHTML = [
            `<button class="cat-btn ${estado.categoria === 'todos' ? 'active' : ''}" type="button" data-categoria="todos">Todos <span class="cat-count">${estado.produtos.length}</span></button>`,
            ...categorias.map((categoria) => {
                const total = estado.produtos.filter((produto) => produto.categoria === categoria).length;
                return `<button class="cat-btn ${estado.categoria === categoria ? 'active' : ''}" type="button" data-categoria="${escapar(categoria)}">${escapar(categoria)} <span class="cat-count">${total}</span></button>`;
            }),
        ].join('');
    }

    function renderizarMercados() {
        const container = document.getElementById('storesCarousel');
        container.innerHTML = estado.supermercados.map((mercado) => {
            const total = estado.precos.filter((preco) => preco.supermercado === mercado.id).length;
            return `<button type="button" class="store-item ${estado.mercadoId === mercado.id ? 'active' : ''}" data-mercado-id="${mercado.id}">
                <span class="store-logo store-initials">${escapar(iniciais(mercado.nome))}</span>
                <span class="store-text"><span class="store-name">${escapar(mercado.nome)}</span>
                <span class="store-offer">${total} ${total === 1 ? 'preço' : 'preços'}</span></span>
            </button>`;
        }).join('');
    }

    function produtosFiltrados() {
        const termo = normalizar(estado.termo.trim());
        return estado.produtos.filter((produto) => {
            const ofertas = ofertasDoProduto(produto.id);
            const correspondeMercado = estado.mercadoId === null ||
                ofertas.some((preco) => preco.supermercado === estado.mercadoId);
            const correspondeCategoria = estado.categoria === 'todos' || produto.categoria === estado.categoria;
            const correspondeTermo = !termo || normalizar([
                produto.nome, produto.categoria,
                ...ofertas.map((preco) => preco.supermercado_nome),
            ].join(' ')).includes(termo);
            return correspondeMercado && correspondeCategoria && correspondeTermo;
        }).sort((a, b) => {
            if (estado.ordenacao === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
            const aValor = Number(precoMaisBarato(a)?.valor ?? Infinity);
            const bValor = Number(precoMaisBarato(b)?.valor ?? Infinity);
            return estado.ordenacao === 'maior-preco' ? bValor - aValor : aValor - bValor;
        });
    }

    function cartaoProduto(produto) {
        const oferta = precoMaisBarato(produto);
        const preco = oferta ? dinheiro.format(Number(oferta.valor)) : 'Sem preço cadastrado';
        const mercado = oferta ? oferta.supermercado_nome : '';
        return `<article class="product-card">
            <div class="product-image-wrapper product-placeholder" aria-label="Produto sem foto cadastrada">🛒<span>Foto não cadastrada</span></div>
            <div class="product-info">
                <div class="price-row"><span class="price">${preco}</span>
                    ${oferta ? `<span class="market-logo store-initials" title="${escapar(mercado)}">${escapar(iniciais(mercado))}</span>` : ''}
                </div>
                ${oferta ? `<div class="savings-text">Menor preço em ${escapar(mercado)}</div>` : ''}
                <h3 class="product-name">${escapar(produto.nome)}</h3>
                <button class="btn-add" type="button" data-acao="adicionar" data-produto-id="${produto.id}" ${oferta ? '' : 'disabled'}>Adicionar</button>
                <button class="btn-comparar" type="button" data-acao="comparar" data-produto-id="${produto.id}">📊 Comparar preços</button>
            </div>
        </article>`;
    }

    function renderizarProdutos() {
        const grid = document.getElementById('productGrid');
        const resumo = document.getElementById('resultInfo');
        const filtro = document.getElementById('activeFilterText');

        if (estado.carregando) {
            resumo.textContent = 'Carregando produtos...';
            grid.innerHTML = '';
            return;
        }
        if (estado.erro) {
            resumo.textContent = 'Não foi possível carregar os produtos';
            filtro.textContent = 'Confira se o servidor da API está ligado e atualize a página.';
            grid.innerHTML = '';
            return;
        }

        const produtos = produtosFiltrados();
        resumo.textContent = `${produtos.length} ${produtos.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
        const mercado = estado.supermercados.find((item) => item.id === estado.mercadoId);
        filtro.textContent = mercado ? `Mercado: ${mercado.nome}` : 'Todos os supermercados';
        grid.innerHTML = produtos.length
            ? produtos.map(cartaoProduto).join('')
            : '<div class="empty-state"><h2>Nenhum produto encontrado</h2><p>Experimente limpar os filtros.</p></div>';
    }

    function tokenUsuario() {
        try {
            return JSON.parse(sessionStorage.getItem('shopwise_auth') || 'null')?.token || null;
        } catch {
            return null;
        }
    }

    async function atualizarCarrinho() {
        const badge = document.querySelector('.cart-badge');
        const token = tokenUsuario();
        if (!token) {
            badge.textContent = '0';
            return;
        }

        try {
            const resposta = await fetch('/api/carrinho/', {
                headers: { Authorization: `Token ${token}`, Accept: 'application/json' },
            });
            if (resposta.status === 401) {
                sessionStorage.removeItem('shopwise_auth');
                badge.textContent = '0';
                return;
            }
            if (!resposta.ok) throw new Error('Não foi possível consultar o carrinho.');
            const dados = await resposta.json();
            badge.textContent = dados.itens.reduce(
                (total, item) => total + item.quantidade, 0
            );
        } catch {
            badge.textContent = '0';
        }
    }

    async function adicionarCarrinho(id, botao) {
        const produto = estado.produtos.find((item) => item.id === id);
        const oferta = produto && precoMaisBarato(produto);
        if (!oferta) return;

        const token = tokenUsuario();
        if (!token) {
            window.alert('Entre na sua conta para adicionar produtos ao carrinho.');
            window.location.assign('login.html');
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Adicionando...';
        let adicionado = false;
        try {
            const resposta = await fetch('/api/carrinho/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({ preco: oferta.id, quantidade: 1 }),
            });
            if (resposta.status === 401) {
                sessionStorage.removeItem('shopwise_auth');
                window.alert('Sua sessão terminou. Entre novamente.');
                window.location.assign('login.html');
                return;
            }
            if (!resposta.ok) throw new Error('Não foi possível adicionar o produto.');
            adicionado = true;
            await atualizarCarrinho();
        } catch {
            window.alert('Não foi possível adicionar ao carrinho. Tente novamente.');
        } finally {
            botao.disabled = false;
            botao.textContent = adicionado ? 'Adicionado ✓' : 'Adicionar';
            if (adicionado) {
                window.setTimeout(() => {
                    if (botao.isConnected) botao.textContent = 'Adicionar';
                }, 1500);
            }
        }
    }

    function fecharComparacao() {
        document.getElementById('modalOverlay').classList.remove('active');
        document.body.style.overflow = '';
    }

    async function abrirComparacao(id) {
        const produto = estado.produtos.find((item) => item.id === id);
        if (!produto) return;

        document.getElementById('modalProductName').textContent = produto.nome;
        document.getElementById('modalCount').textContent = 'Consultando preços...';
        document.getElementById('bestPickBanner').hidden = true;
        document.getElementById('comparisonList').textContent = 'Carregando preços...';
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';

        try {
            const precos = await buscar(`/api/produtos/${id}/comparar/`);
            precos.sort((a, b) => Number(a.valor) - Number(b.valor));
            document.getElementById('modalCount').textContent = `${precos.length} ${precos.length === 1 ? 'supermercado' : 'supermercados'} com preço cadastrado`;

            const lista = document.getElementById('comparisonList');
            if (!precos.length) {
                lista.textContent = 'Ainda não há preços cadastrados para este produto.';
                return;
            }

            const menor = Number(precos[0].valor);
            const maior = Number(precos[precos.length - 1].valor);
            const banner = document.getElementById('bestPickBanner');
            banner.hidden = false;
            banner.innerHTML = `<div class="best-pick-icon">🏆</div>
                <div class="best-pick-info"><h4>Melhor preço: ${escapar(precos[0].supermercado_nome)}</h4>
                <p>${precos.length > 1 ? `Diferença de ${dinheiro.format(maior - menor)} para o maior preço` : 'Único supermercado com preço cadastrado'}</p></div>
                <div class="best-pick-price"><strong>${dinheiro.format(menor)}</strong><span>menor preço</span></div>`;
            lista.innerHTML = precos.map((preco, indice) => {
                const valor = Number(preco.valor);
                const melhor = indice === 0;
                return `<div class="supermarket-row ${melhor ? 'best' : ''}">
                    ${melhor ? '<div class="best-tag">✓ Melhor preço</div>' : ''}
                    <div class="sm-logo"><span class="modal-market-text">${escapar(iniciais(preco.supermercado_nome))}</span></div>
                    <div class="sm-info"><h4>${escapar(preco.supermercado_nome)}</h4></div>
                    <div class="sm-price-area"><div class="sm-price ${melhor ? 'best-price' : ''}">${dinheiro.format(valor)}</div>
                    ${melhor ? '<div class="sm-savings">Mais barato</div>' : `<div class="sm-higher">${valor === menor ? 'Mesmo preço' : `+ ${dinheiro.format(valor - menor)}`}</div>`}</div>
                </div>`;
            }).join('');
        } catch {
            document.getElementById('modalCount').textContent = 'Erro na consulta';
            document.getElementById('comparisonList').textContent = 'Não foi possível carregar os preços. Tente novamente.';
        }
    }

    function configurarSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const conteudo = document.querySelector('.main-content');
        const alternar = () => {
            if (window.innerWidth >= 768) {
                sidebar.classList.toggle('pinned');
                conteudo.classList.toggle('sidebar-pinned');
            } else {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            }
        };
        document.getElementById('desktopMenuToggle').addEventListener('click', alternar);
        document.getElementById('mobileMenuToggle').addEventListener('click', alternar);
        overlay.addEventListener('click', alternar);
    }

    async function iniciar() {
        atualizarCarrinho();
        configurarSidebar();
        document.getElementById('searchInput').addEventListener('input', (evento) => {
            estado.termo = evento.target.value;
            renderizarProdutos();
        });
        document.getElementById('sortSelect').addEventListener('change', (evento) => {
            estado.ordenacao = evento.target.value;
            renderizarProdutos();
        });
        document.getElementById('categoryContainer').addEventListener('click', (evento) => {
            const botao = evento.target.closest('[data-categoria]');
            if (!botao) return;
            estado.categoria = botao.dataset.categoria;
            renderizarCategorias();
            renderizarProdutos();
        });
        document.getElementById('storesCarousel').addEventListener('click', (evento) => {
            const botao = evento.target.closest('[data-mercado-id]');
            if (!botao) return;
            const id = Number(botao.dataset.mercadoId);
            estado.mercadoId = estado.mercadoId === id ? null : id;
            renderizarMercados();
            renderizarProdutos();
        });
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            estado.categoria = 'todos';
            estado.mercadoId = null;
            estado.termo = '';
            estado.ordenacao = 'menor-preco';
            document.getElementById('searchInput').value = '';
            document.getElementById('sortSelect').value = 'menor-preco';
            renderizarCategorias();
            renderizarMercados();
            renderizarProdutos();
        });
        document.getElementById('productGrid').addEventListener('click', (evento) => {
            const botao = evento.target.closest('[data-acao]');
            if (!botao) return;
            const id = Number(botao.dataset.produtoId);
            if (botao.dataset.acao === 'comparar') abrirComparacao(id);
            if (botao.dataset.acao === 'adicionar') adicionarCarrinho(id, botao);
        });
        document.getElementById('modalClose').addEventListener('click', fecharComparacao);
        document.getElementById('modalFooterClose').addEventListener('click', fecharComparacao);
        document.getElementById('modalOverlay').addEventListener('click', (evento) => {
            if (evento.target.id === 'modalOverlay') fecharComparacao();
        });
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape') fecharComparacao();
        });

        renderizarProdutos();
        try {
            const [produtos, supermercados, precos] = await Promise.all([
                buscar('/api/produtos/'),
                buscar('/api/supermercados/'),
                buscar('/api/precos/'),
            ]);
            estado.produtos = produtos;
            estado.supermercados = supermercados;
            estado.precos = precos;
        } catch {
            estado.erro = true;
        } finally {
            estado.carregando = false;
            renderizarResumo();
            renderizarCategorias();
            renderizarMercados();
            renderizarProdutos();
        }
    }

    document.addEventListener('DOMContentLoaded', iniciar);
})();
