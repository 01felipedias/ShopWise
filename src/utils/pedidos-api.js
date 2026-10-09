(() => {
    let auth;
    try { auth = JSON.parse(sessionStorage.getItem('shopwise_auth')); } catch {}
    const mercado = auth?.tipo === 'supermercado';
    const grupos = {recebido: 'listaAndamento', em_preparacao: 'listaEntregue', concluido: 'listaFinalizado'};
    const dinheiro = valor => Number(valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    const numero = id => `SW-${String(id).padStart(6, '0')}`;
    const el = (tag, classe, texto) => {
        const node = document.createElement(tag);
        if (classe) node.className = classe;
        if (texto !== undefined) node.textContent = texto;
        return node;
    };
    let pedidos = [], aberto = null, carregando = false, focoAnterior;
    const aviso = document.getElementById('ordersStatus');
    const atualizar = document.getElementById('refreshOrders');
    if (mercado) {
        document.querySelector('.payment-title').textContent = 'Pedidos recebidos';
        document.querySelector('.page-navbar-title').textContent = 'Pedidos recebidos';
        document.querySelector('.payment-subtitle').textContent = 'Veja os pedidos do seu supermercado e atualize a preparação.';
        const inicio = document.querySelector('.sidebar-nav a');
        inicio.href = 'manter-produtos.html';
        inicio.querySelector('span').textContent = 'Meu supermercado';
    }
    try {
        document.querySelector('.cart-badge').textContent = JSON.parse(localStorage.getItem('carrinho') || '[]').reduce((n, item) => n + Number(item.quantidade || 0), 0);
    } catch {}

    async function requisicao(url, opcoes = {}) {
        const resposta = await fetch(url, {...opcoes, headers: {'Content-Type': 'application/json', Authorization: `Token ${auth.token}`}});
        if (resposta.status === 401) {
            sessionStorage.removeItem('shopwise_auth');
            auth = null;
            document.getElementById(mercado ? 'ordersMarketLogin' : 'ordersLogin').hidden = false;
            throw new Error(ShopWiseMensagens.sessao);
        }
        if (resposta.status >= 500) throw new Error(ShopWiseMensagens.servidor);
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(ShopWiseMensagens.dados(dados, 'Não foi possível atualizar o pedido.'));
        return dados;
    }
    async function carregar() {
        if (carregando) return;
        if (!auth?.token) {
            aviso.textContent = 'Entre na sua conta para consultar seus pedidos.';
            document.getElementById('ordersLogin').hidden = false;
            document.getElementById('ordersMarketLogin').hidden = false;
            atualizar.disabled = true;
            return;
        }
        carregando = true;
        atualizar.disabled = true;
        aviso.textContent = 'Consultando pedidos...';
        try {
            pedidos = await requisicao('/api/pedidos/');
            renderizar();
            aviso.textContent = pedidos.length ? `${pedidos.length} pedido(s). Atualizado às ${new Date().toLocaleTimeString('pt-BR')}.` : 'Você ainda não tem pedidos.';
            if (aberto) mostrarDetalhes(aberto);
        } catch (erro) { aviso.textContent = ShopWiseMensagens.falha(erro); }
        finally { carregando = false; atualizar.disabled = false; }
    }
    async function mudarStatus(pedido, botao) {
        if (!auth?.token) { aviso.textContent = ShopWiseMensagens.sessao; return; }
        botao.disabled = true;
        try {
            await requisicao(`/api/pedidos/${pedido.id}/`, {method: 'PATCH', body: JSON.stringify({status: pedido.status === 'recebido' ? 'em_preparacao' : 'concluido'})});
            await carregar();
        } catch (erro) { aviso.textContent = ShopWiseMensagens.falha(erro); botao.disabled = false; }
    }
    function renderizar() {
        Object.values(grupos).forEach(id => document.getElementById(id).replaceChildren());
        for (const pedido of pedidos) {
            const card = el('article', 'order-card-item');
            const info = el('div', 'order-card-info');
            info.append(el('span', 'order-tag', pedido.status_nome), el('h3', '', pedido.supermercado_nome));
            info.append(el('p', 'order-card-meta', `${numero(pedido.id)} • ${new Date(pedido.criado_em).toLocaleString('pt-BR')}`));
            info.append(el('p', 'order-card-meta', `${mercado ? pedido.cliente_nome + ' • ' : ''}${pedido.recebimento === 'pickup' ? 'Retirada no mercado' : 'Entrega'} • ${pedido.itens.reduce((n, item) => n + item.quantidade, 0)} unidades`));
            const valor = el('div', 'order-card-value');
            valor.append(el('strong', '', dinheiro(pedido.total)));
            const acoes = el('div', 'order-card-actions');
            const detalhes = el('button', 'btn-order-action secondary', 'Ver detalhes');
            detalhes.addEventListener('click', () => abrirAcompanhamento(pedido.id));
            acoes.append(detalhes);
            if (mercado && pedido.status !== 'concluido') {
                const status = el('button', 'btn-order-action primary', pedido.status === 'recebido' ? 'Iniciar preparação' : 'Concluir pedido');
                status.addEventListener('click', () => mudarStatus(pedido, status));
                acoes.append(status);
            }
            if (!mercado && pedido.status === 'concluido') {
                const avaliar = el('a', 'btn-order-action secondary', 'Avaliar');
                avaliar.href = `avaliacao.html?pedido=${pedido.id}`;
                acoes.append(avaliar);
            }
            valor.append(acoes);
            card.append(info, valor);
            document.getElementById(grupos[pedido.status]).append(card);
        }
        for (const id of Object.values(grupos)) {
            const lista = document.getElementById(id);
            if (!lista.children.length) lista.append(el('p', 'orders-empty', 'Nenhum pedido neste status.'));
        }
    }
    function mostrarDetalhes(id) {
        const pedido = pedidos.find(item => item.id === id);
        if (!pedido) return;
        const textos = {
            acompTitulo: `Pedido ${numero(id)}`,
            acompSubtitulo: `${new Date(pedido.criado_em).toLocaleString('pt-BR')} • ${pedido.cliente_nome}`,
            acompStatusLabel: pedido.status_nome,
            acompStatusDesc: {recebido: 'O supermercado recebeu o pedido.', em_preparacao: 'O supermercado está preparando os produtos.', concluido: 'O supermercado concluiu o pedido.'}[pedido.status],
            acompEndereco: pedido.recebimento === 'pickup' ? `Retirada: ${pedido.supermercado_endereco || pedido.supermercado_nome}` : pedido.endereco,
            acompMercado: pedido.supermercado_nome,
            acompTotal: dinheiro(pedido.total),
            acompPagamento: `Subtotal ${dinheiro(pedido.subtotal)} • Entrega ${dinheiro(pedido.taxa_entrega)} • Desconto ${dinheiro(pedido.desconto)}. Pagamento: ${pedido.pagamento} (demonstrativo).${pedido.observacoes ? ' Observações: ' + pedido.observacoes : ''}`
        };
        Object.entries(textos).forEach(([id, texto]) => document.getElementById(id).textContent = texto);
        const etapa = ['recebido', 'em_preparacao', 'concluido'].indexOf(pedido.status);
        for (let i = 0; i < 3; i++) {
            const step = document.getElementById(`acomp-step-${i}`);
            step.classList.toggle('done', i < etapa);
            step.classList.toggle('active', i === etapa);
        }
        document.getElementById('acompProgress').style.width = `${etapa * 33.333}%`;
        const lista = document.getElementById('acompItensList');
        lista.replaceChildren();
        pedido.itens.forEach(item => {
            const linha = el('div', 'order-detail-item');
            linha.append(el('strong', '', item.nome), el('span', '', `${item.quantidade} × ${dinheiro(item.preco_unitario)}`), el('strong', '', dinheiro(item.subtotal)));
            lista.append(linha);
        });
    }
    function abrirAcompanhamento(id) {
        aberto = id;
        focoAnterior = document.activeElement;
        mostrarDetalhes(id);
        document.getElementById('modalAcompOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
        document.querySelector('.modal-close-ped').focus();
    }
    function fecharAcomp() {
        aberto = null;
        document.getElementById('modalAcompOverlay').classList.remove('active');
        document.body.style.overflow = '';
        focoAnterior?.focus();
    }
    window.abrirAcompanhamento = abrirAcompanhamento;
    window.fecharAcomp = fecharAcomp;
    window.fecharAcompOverlay = evento => { if (evento.target.id === 'modalAcompOverlay') fecharAcomp(); };
    document.addEventListener('keydown', evento => {
        if (!aberto) return;
        if (evento.key === 'Escape') fecharAcomp();
        if (evento.key === 'Tab') {
            const botoes = document.querySelectorAll('#modalAcompOverlay button, #modalAcompOverlay a');
            const primeiro = botoes[0], ultimo = botoes[botoes.length - 1];
            if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
            if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
        }
    });
    atualizar.addEventListener('click', carregar);
    carregar();
    setInterval(() => { if (!document.hidden && auth?.token) carregar(); }, 30000);
})();
