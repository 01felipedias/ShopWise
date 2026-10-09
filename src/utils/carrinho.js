const container = document.getElementById('cartProducts');
const statusCarrinho = document.getElementById('cartStatus');
const botaoCheckout = document.getElementById('checkoutButton');
const moeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
let carrinho = lerCarrinho();
let estoqueConferido = false;
const resultadosComparacao = document.getElementById('cartComparisonResults');
const statusComparacao = document.getElementById('cartComparisonStatus');
const botaoComparar = document.getElementById('compareCartButton');
const modalComparacao = document.getElementById('cartComparisonOverlay');
const botaoFecharComparacao = document.getElementById('closeCartComparison');
const botaoAtualizarComparacao = document.getElementById('refreshCartComparison');
let rolagemAnterior = '';
let consultaComparacao = null;
let esperaComparacao = null;
let comparacaoAtual = null;

function lerCarrinho() {
    try {
        const itens = JSON.parse(localStorage.getItem('carrinho'));
        return Array.isArray(itens) ? itens : [];
    } catch (_) {
        return [];
    }
}

function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

function precoNumero(valor) {
    return Number(String(valor || '0').replace(',', '.')) || 0;
}

function normalizarNome(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function renderizarCarrinho() {
    container.replaceChildren();
    let total = 0;
    const indisponiveis = carrinho.some((item) => item.disponivel === false);

    if (!carrinho.length) {
        const vazio = criarElemento('div', 'empty-cart');
        const link = criarElemento('a', 'btn-verde continue-shopping', 'Explorar Produtos');
        link.href = 'feedproduto.html';
        vazio.append(
            criarElemento('h2', '', 'Seu carrinho está vazio'),
            criarElemento('p', '', 'Compare preços e adicione produtos para começar.'),
            link
        );
        container.append(vazio);
    }

    for (const item of carrinho) {
        const quantidade = Math.max(1, Number(item.quantidade) || 1);
        const subtotal = precoNumero(item.preco) * quantidade;
        if (item.disponivel !== false) total += subtotal;

        const linha = criarElemento('div', 'cart-item');
        if (item.disponivel === false) linha.classList.add('cart-item-unavailable');
        if (item.img) {
            const imagem = criarElemento('img');
            imagem.src = item.img;
            imagem.alt = item.nome || 'Produto';
            linha.append(imagem);
        } else {
            linha.append(criarElemento('span', 'cart-image-placeholder', '🛒'));
        }

        const info = criarElemento('div', 'cart-info');
        info.append(criarElemento('h3', '', item.nome || 'Produto'));
        if (item.supermercadoNome) info.append(criarElemento('span', '', item.supermercadoNome));
        info.append(criarElemento('span', 'item-calculation', `${quantidade} × ${moeda(precoNumero(item.preco))}`));
        info.append(criarElemento('strong', '', moeda(subtotal)));
        if (item.disponivel === false) {
            info.append(criarElemento('span', 'cart-unavailable-text', 'Oferta indisponível. Remova o item e escolha outra oferta no feed.'));
        } else {
            const alerta = criarElemento('a', 'alert-btn', '🔔 Criar alerta');
            alerta.href = 'AlertaPreco.html';
            info.append(alerta);
        }
        linha.append(info);

        const controles = criarElemento('div', 'quantity-control');
        const menos = criarElemento('button', '', '−');
        menos.type = 'button';
        menos.dataset.acao = 'diminuir';
        menos.dataset.id = String(item.id);
        menos.setAttribute('aria-label', `Diminuir quantidade de ${item.nome}`);
        const mais = criarElemento('button', '', '+');
        mais.type = 'button';
        mais.dataset.acao = 'aumentar';
        mais.dataset.id = String(item.id);
        mais.disabled = item.disponivel === false || quantidade >= Number(item.estoque);
        mais.setAttribute('aria-label', `Aumentar quantidade de ${item.nome}`);
        controles.append(menos, criarElemento('span', '', String(quantidade)), mais);
        linha.append(controles);
        container.append(linha);
    }

    document.getElementById('subtotal').textContent = moeda(total);
    document.getElementById('total').textContent = moeda(total);
    botaoCheckout.disabled = !estoqueConferido || !carrinho.length || indisponiveis;
    agendarComparacao();
}

function agendarComparacao() {
    window.clearTimeout(esperaComparacao);
    consultaComparacao?.abort();
    resultadosComparacao.replaceChildren();
    comparacaoAtual = null;
    botaoComparar.disabled = !estoqueConferido || !carrinho.length;
    if (!modalComparacao.classList.contains('active')) return;
    if (!carrinho.length) {
        statusComparacao.textContent = 'Adicione produtos ao carrinho para comparar os supermercados.';
        return;
    }
    if (!estoqueConferido) {
        statusComparacao.textContent = 'A comparação ficará disponível após conferir o carrinho.';
        return;
    }
    statusComparacao.textContent = 'Atualizando comparação...';
    esperaComparacao = window.setTimeout(compararCarrinho, 250);
}

async function compararCarrinho() {
    window.clearTimeout(esperaComparacao);
    consultaComparacao?.abort();
    resultadosComparacao.replaceChildren();
    if (!carrinho.length) return;
    if (carrinho.some((item) => !Number.isInteger(Number(item.produtoId)) || Number(item.produtoId) <= 0)) {
        statusComparacao.textContent = 'Há um item antigo sem produto identificado. Remova-o e adicione o produto novamente pelo feed para comparar.';
        return;
    }
    const consulta = new AbortController();
    consultaComparacao = consulta;
    statusComparacao.textContent = 'Consultando preços e estoque de cada supermercado...';
    botaoComparar.disabled = true;
    botaoAtualizarComparacao.disabled = true;
    try {
        const resposta = await fetch('/api/carrinho/comparar/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: carrinho.map((item) => ({
                produto: Number(item.produtoId), quantidade: Number(item.quantidade) || 1
            })) }),
            signal: consulta.signal
        });
        if (!resposta.ok) throw new Error(resposta.status === 400
            ? 'Não foi possível comparar estes produtos. Atualize o carrinho e confira se ainda existem no catálogo.'
            : 'Não foi possível consultar a comparação. Tente novamente.');
        const dados = await resposta.json();
        if (consulta.signal.aborted) return;
        renderizarComparacao(dados);
    } catch (erro) {
        if (erro.name !== 'AbortError') statusComparacao.textContent = erro instanceof TypeError || erro instanceof SyntaxError
            ? 'Não foi possível conectar. Confira se o servidor está funcionando e clique em Atualizar preços para tentar novamente.'
            : erro.message;
    } finally {
        if (consultaComparacao === consulta) {
            botaoComparar.disabled = !carrinho.length;
            botaoAtualizarComparacao.disabled = !carrinho.length;
        }
    }
}

function renderizarComparacao(dados) {
    comparacaoAtual = dados;
    resultadosComparacao.replaceChildren();
    statusComparacao.textContent = !dados.supermercados.length
        ? 'Nenhum supermercado cadastrado para comparar.'
        : dados.menor_total === null
            ? 'Nenhum supermercado tem estoque suficiente para o carrinho completo.'
            : 'Menor total para o carrinho completo: ' + moeda(dados.menor_total) + '.';
    for (const mercado of dados.supermercados) {
        const melhor = mercado.completo && mercado.total === dados.menor_total;
        const card = criarElemento('article', 'cart-market-comparison' + (melhor ? ' cart-market-best' : ''));
        const cabecalho = criarElemento('div', 'cart-market-heading');
        cabecalho.append(criarElemento('h3', '', mercado.supermercado_nome));
        cabecalho.append(criarElemento('span', 'cart-market-badge', mercado.completo
            ? melhor ? 'Menor total' : 'Carrinho completo'
            : 'Carrinho incompleto'));
        card.append(cabecalho);
        card.append(criarElemento('strong', 'cart-market-total', mercado.completo
            ? moeda(mercado.total) : 'Total completo indisponível'));
        if (mercado.completo && Number(mercado.economia) > 0) {
            card.append(criarElemento('p', 'cart-market-saving',
                'Economia de ' + moeda(mercado.economia) + ' em relação ao maior total completo.'));
        }
        const detalhes = criarElemento('div');
        detalhes.append(criarElemento('h4', 'cart-market-items-title', 'Produtos do carrinho'));
        const lista = criarElemento('ul', 'cart-market-items');
        for (const item of mercado.itens) {
            const linha = criarElemento('li', item.disponivel ? '' : 'cart-market-missing');
            linha.append(criarElemento('strong', '', `${item.quantidade} × ${item.nome}`));
            linha.append(criarElemento('span', '', item.disponivel
                ? `${moeda(item.preco_unitario)} cada · ${moeda(item.subtotal)}`
                : `${item.motivo}${item.estoque !== null ? ` Disponível: ${item.estoque} un.` : ''}`));
            lista.append(linha);
        }
        detalhes.append(lista);
        card.append(detalhes);
        if (!mercado.completo) {
            const faltantes = mercado.itens.filter((item) => !item.disponivel).map((item) => item.nome);
            card.append(criarElemento('p', 'cart-market-missing', 'Falta disponibilidade para: ' + faltantes.join(', ') + '.'));
        }
        const comprar = criarElemento('button', 'cart-compare-button cart-buy-market',
            mercado.completo ? 'Comprar neste supermercado' : 'Carrinho incompleto');
        comprar.type = 'button';
        comprar.disabled = !mercado.completo;
        comprar.dataset.comprarMercado = mercado.supermercado;
        card.append(comprar);
        resultadosComparacao.append(card);
    }
}

function alterarQuantidade(id, valor) {
    const item = carrinho.find((produto) => String(produto.id) === String(id));
    if (!item) return;
    const novaQuantidade = (Number(item.quantidade) || 1) + valor;
    if (novaQuantidade <= 0) {
        carrinho = carrinho.filter((produto) => String(produto.id) !== String(id));
    } else if (item.disponivel !== false && novaQuantidade <= Number(item.estoque)) {
        item.quantidade = novaQuantidade;
    }
    salvarCarrinho();
    statusCarrinho.textContent = carrinho.some((produto) => produto.disponivel === false)
        ? 'Uma oferta não está mais disponível. Remova-a para continuar.'
        : '';
    renderizarCarrinho();
}

function irParaCheckout() {
    if (botaoCheckout.disabled) return;
    abrirComparacao();
}

function escolherSupermercado(id) {
    const mercado = comparacaoAtual?.supermercados.find((item) => item.supermercado === Number(id));
    if (!mercado?.completo) return;
    carrinho = mercado.itens.map((item) => {
        const anterior = carrinho.find((produto) => Number(produto.produtoId) === item.produto);
        return {
            id: `oferta-${item.oferta}`, ofertaId: item.oferta, produtoId: item.produto,
            nome: item.nome, quantidade: item.quantidade, preco: item.preco_unitario.replace('.', ','),
            estoque: item.estoque, disponivel: true, img: anterior?.img || '',
            supermercadoId: mercado.supermercado, supermercadoNome: mercado.supermercado_nome,
            supermercadoEndereco: mercado.supermercado_endereco
        };
    });
    salvarCarrinho();
    sessionStorage.setItem('shopwise_checkout_mercado', String(mercado.supermercado));
    window.location.assign('checkout.html');
}

async function conferirEstoque() {
    if (!carrinho.length) {
        estoqueConferido = true;
        renderizarCarrinho();
        return;
    }
    statusCarrinho.textContent = 'Conferindo preços e estoque dos supermercados...';
    try {
        const precisaMigrar = carrinho.some((item) => !item.ofertaId);
        const [resposta, respostaProdutos] = await Promise.all([
            fetch('/api/precos/'),
            precisaMigrar ? fetch('/api/produtos/') : Promise.resolve(null)
        ]);
        if (!resposta.ok || (respostaProdutos && !respostaProdutos.ok)) {
            throw new Error('Não foi possível consultar a API.');
        }
        const precos = await resposta.json();
        const produtos = respostaProdutos ? await respostaProdutos.json() : [];
        for (const item of carrinho) {
            if (!item.ofertaId) {
                const produto = produtos.find((candidato) =>
                    candidato.id === Number(item.id) &&
                    normalizarNome(item.nome).includes(normalizarNome(candidato.nome))
                );
                const correspondencias = produto ? precos.filter((preco) =>
                    preco.produto === produto.id &&
                    Number(preco.estoque) > 0 &&
                    Number(preco.valor) === precoNumero(item.preco)
                ) : [];
                if (correspondencias.length === 1) {
                    const encontrada = correspondencias[0];
                    item.id = `oferta-${encontrada.id}`;
                    item.ofertaId = encontrada.id;
                    item.produtoId = produto.id;
                    item.supermercadoId = encontrada.supermercado;
                    item.supermercadoNome = encontrada.supermercado_nome;
                    item.nome = produto.nome;
                    item.img = (produto.imagem ? `../assets/${produto.imagem}` : item.img);
                }
            }
            const oferta = precos.find((preco) => preco.id === Number(item.ofertaId));
            item.disponivel = Boolean(oferta && Number(oferta.estoque) > 0);
            if (oferta) {
                item.preco = Number(oferta.valor).toFixed(2).replace('.', ',');
                item.estoque = Number(oferta.estoque);
                item.supermercadoNome = oferta.supermercado_nome;
                if (item.disponivel && Number(item.quantidade) > item.estoque) item.quantidade = item.estoque;
            }
        }
        const agrupados = new Map();
        for (const item of carrinho) {
            const anterior = agrupados.get(String(item.id));
            if (anterior) {
                anterior.quantidade = Math.min(
                    Number(anterior.estoque) || Infinity,
                    Number(anterior.quantidade) + Number(item.quantidade)
                );
            } else {
                agrupados.set(String(item.id), item);
            }
        }
        carrinho = [...agrupados.values()];
        salvarCarrinho();
        estoqueConferido = true;
        statusCarrinho.textContent = carrinho.some((item) => !item.disponivel)
            ? 'Uma oferta não está mais disponível. Remova-a para continuar.'
            : '';
    } catch (_) {
        statusCarrinho.textContent = 'Não foi possível conferir o estoque agora. Atualize a página quando a API estiver disponível.';
    }
    renderizarCarrinho();
}

container.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-acao]');
    if (!botao) return;
    alterarQuantidade(botao.dataset.id, botao.dataset.acao === 'aumentar' ? 1 : -1);
});

function abrirComparacao() {
    modalComparacao.classList.add('active');
    modalComparacao.setAttribute('aria-hidden', 'false');
    rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelector('.app-layout').inert = true;
    botaoFecharComparacao.focus();
    compararCarrinho();
}

function fecharComparacao() {
    window.clearTimeout(esperaComparacao);
    consultaComparacao?.abort();
    modalComparacao.classList.remove('active');
    modalComparacao.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = rolagemAnterior;
    document.querySelector('.app-layout').inert = false;
    botaoComparar.disabled = !estoqueConferido || !carrinho.length;
    botaoComparar.focus();
}

botaoComparar.addEventListener('click', abrirComparacao);
botaoFecharComparacao.addEventListener('click', fecharComparacao);
botaoAtualizarComparacao.addEventListener('click', compararCarrinho);
resultadosComparacao.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-comprar-mercado]');
    if (botao && !botao.disabled) escolherSupermercado(botao.dataset.comprarMercado);
});
modalComparacao.addEventListener('click', (evento) => {
    if (evento.target === modalComparacao) fecharComparacao();
});
document.addEventListener('keydown', (evento) => {
    if (!modalComparacao.classList.contains('active')) return;
    if (evento.key === 'Escape') fecharComparacao();
    if (evento.key === 'Tab') {
        const focaveis = [...modalComparacao.querySelectorAll('button:not(:disabled)')];
        const ultimo = focaveis.at(-1) || botaoFecharComparacao;
        if (evento.shiftKey && document.activeElement === botaoFecharComparacao) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            botaoFecharComparacao.focus();
        }
    }
});
renderizarCarrinho();
conferirEstoque();
