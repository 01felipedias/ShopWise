const container = document.getElementById('cartProducts');
const botaoCheckout = document.querySelector('.cart-summary .btn-verde');
const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let carrinho = { itens: [], total: '0.00' };

function tokenUsuario() {
    try {
        return JSON.parse(sessionStorage.getItem('shopwise_auth') || 'null')?.token || null;
    } catch {
        return null;
    }
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function lerCarrinhoAntigo() {
    try {
        const itens = JSON.parse(localStorage.getItem('carrinho') || '[]');
        return Array.isArray(itens) ? itens : [];
    } catch {
        return [];
    }
}

function atualizarResumo() {
    const valor = dinheiro.format(Number(carrinho.total) || 0);
    document.getElementById('subtotal').textContent = valor;
    document.getElementById('total').textContent = valor;
    botaoCheckout.disabled = carrinho.itens.length === 0;
}

function mostrarEstado(titulo, mensagem, link, textoLink) {
    container.replaceChildren();
    const bloco = criarElemento('div', 'empty-cart');
    bloco.append(
        criarElemento('h2', '', titulo),
        criarElemento('p', '', mensagem)
    );
    if (link) {
        const acao = criarElemento('a', 'btn-verde continue-shopping', textoLink);
        acao.href = link;
        bloco.append(acao);
    }
    container.append(bloco);
    atualizarResumo();
}

async function requisitarCarrinho(url, opcoes = {}) {
    const token = tokenUsuario();
    if (!token) throw new Error('Entre na sua conta para acessar o carrinho.');

    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            Accept: 'application/json',
            Authorization: 'Token ' + token,
            ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
            ...opcoes.headers,
        },
    });
    if (resposta.status === 401) {
        sessionStorage.removeItem('shopwise_auth');
        throw new Error('Sua sessão terminou. Entre novamente.');
    }
    if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        const detalhe = dados.detail || Object.values(dados).flat().join(' ');
        throw new Error(detalhe || 'Não foi possível atualizar o carrinho.');
    }
    return resposta.status === 204 ? null : resposta.json();
}

function renderizarCarrinho() {
    container.replaceChildren();

    const antigos = lerCarrinhoAntigo();
    if (antigos.length) {
        const aviso = criarElemento('div', 'cart-legacy-notice');
        aviso.append(
            criarElemento('strong', '', 'Itens antigos neste navegador'),
            criarElemento('p', '', 'Eles ainda não estão na sua conta. Importe-os para usar o carrinho sincronizado com os preços atuais.')
        );
        const botao = criarElemento('button', 'btn-verde', 'Importar itens antigos');
        botao.type = 'button';
        botao.dataset.acao = 'importar';
        aviso.append(botao);
        container.append(aviso);
    }

    if (carrinho.itens.length === 0) {
        const vazio = criarElemento('div', 'empty-cart');
        vazio.append(
            criarElemento('h2', '', 'Seu carrinho está vazio'),
            criarElemento('p', '', 'Compare preços e adicione produtos para começar.')
        );
        const explorar = criarElemento('a', 'btn-verde continue-shopping', 'Explorar Produtos');
        explorar.href = 'feedproduto.html';
        vazio.append(explorar);
        container.append(vazio);
        atualizarResumo();
        return;
    }

    carrinho.itens.forEach((item) => {
        const card = criarElemento('div', 'cart-item');
        const imagem = criarElemento('img');
        imagem.src = '../assets/img/logoshopwise.png';
        imagem.alt = item.produto_nome;

        const info = criarElemento('div', 'cart-info');
        info.append(
            criarElemento('h3', '', item.produto_nome),
            criarElemento('span', '', item.supermercado_nome),
            criarElemento('span', 'item-calculation',
                item.quantidade + ' × ' + dinheiro.format(Number(item.valor_unitario))),
            criarElemento('strong', '', dinheiro.format(Number(item.subtotal)))
        );
        const remover = criarElemento('button', 'btn-cart-remove', 'Remover');
        remover.type = 'button';
        remover.dataset.acao = 'remover';
        remover.dataset.itemId = item.id;
        const alerta = criarElemento('button', 'alert-btn', '🔔 Criar alerta');
        alerta.type = 'button';
        info.append(alerta, remover);

        const controle = criarElemento('div', 'quantity-control');
        const menos = criarElemento('button', '', '−');
        menos.type = 'button';
        menos.setAttribute('aria-label', 'Diminuir quantidade de ' + item.produto_nome);
        menos.dataset.acao = 'diminuir';
        menos.dataset.itemId = item.id;
        const mais = criarElemento('button', '', '+');
        mais.type = 'button';
        mais.setAttribute('aria-label', 'Aumentar quantidade de ' + item.produto_nome);
        mais.dataset.acao = 'aumentar';
        mais.dataset.itemId = item.id;
        controle.append(menos, criarElemento('span', '', String(item.quantidade)), mais);
        card.append(imagem, info, controle);
        container.append(card);
    });
    atualizarResumo();
}

async function carregarCarrinho() {
    if (!tokenUsuario()) {
        carrinho = { itens: [], total: '0.00' };
        mostrarEstado('Entre na sua conta', 'O carrinho é salvo na sua conta para aparecer em outros acessos.', 'login.html', 'Entrar');
        return;
    }

    container.textContent = 'Carregando carrinho...';
    try {
        carrinho = await requisitarCarrinho('/api/carrinho/');
        renderizarCarrinho();
    } catch (erro) {
        carrinho = { itens: [], total: '0.00' };
        mostrarEstado('Não foi possível carregar o carrinho', erro.message,
            tokenUsuario() ? 'carrinho.html' : 'login.html',
            tokenUsuario() ? 'Tentar novamente' : 'Entrar');
    }
}

async function alterarQuantidade(item, diferenca) {
    const quantidade = item.quantidade + diferenca;
    if (quantidade < 1) {
        await requisitarCarrinho('/api/carrinho/' + item.id + '/', { method: 'DELETE' });
    } else {
        await requisitarCarrinho('/api/carrinho/' + item.id + '/', {
            method: 'PUT',
            body: JSON.stringify({ quantidade }),
        });
    }
    await carregarCarrinho();
}

async function importarCarrinhoAntigo() {
    const antigos = lerCarrinhoAntigo();
    const resposta = await fetch('/api/precos/', { headers: { Accept: 'application/json' } });
    if (!resposta.ok) throw new Error('Não foi possível consultar os preços para importar.');
    const precos = await resposta.json();
    const normalizar = (texto) => String(texto || '').trim().toLocaleLowerCase('pt-BR');
    const restantes = [];
    let importados = 0;

    for (const antigo of antigos) {
        const oferta = precos.find((preco) =>
            Number(preco.produto) === Number(antigo.id) &&
            normalizar(preco.supermercado_nome) === normalizar(antigo.mercado)
        );
        const quantidade = Number(antigo.quantidade);
        if (!oferta || !Number.isInteger(quantidade) || quantidade < 1) {
            restantes.push(antigo);
            continue;
        }
        try {
            await requisitarCarrinho('/api/carrinho/', {
                method: 'POST',
                body: JSON.stringify({ preco: oferta.id, quantidade }),
            });
            importados += 1;
        } catch {
            restantes.push(antigo);
        }
    }

    if (restantes.length) {
        localStorage.setItem('carrinho', JSON.stringify(restantes));
    } else {
        localStorage.removeItem('carrinho');
    }
    await carregarCarrinho();
    if (restantes.length) {
        window.alert(importados + ' item(ns) importado(s). ' + restantes.length +
            ' item(ns) não encontraram uma oferta correspondente e continuam salvos neste navegador.');
    } else {
        window.alert(importados + ' item(ns) importado(s) para sua conta.');
    }
}

container.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('[data-acao]');
    if (!botao) return;
    botao.disabled = true;
    try {
        if (botao.dataset.acao === 'importar') {
            await importarCarrinhoAntigo();
            return;
        }
        const item = carrinho.itens.find((atual) => atual.id === Number(botao.dataset.itemId));
        if (!item) return;
        if (botao.dataset.acao === 'remover') {
            await requisitarCarrinho('/api/carrinho/' + item.id + '/', { method: 'DELETE' });
            await carregarCarrinho();
        } else {
            await alterarQuantidade(item, botao.dataset.acao === 'aumentar' ? 1 : -1);
        }
    } catch (erro) {
        window.alert(erro.message || 'Não foi possível atualizar o carrinho.');
    } finally {
        botao.disabled = false;
    }
});

function irParaCheckout() {
    if (carrinho.itens.length === 0) return;
    window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', carregarCarrinho);
