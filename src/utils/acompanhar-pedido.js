// ==================================================
// SHOPWISE - HISTÓRICO E ACOMPANHAMENTO DE PEDIDOS
// ==================================================

const pedidosCliente = [
  {
    id: 1,
    num: 'SW-482913',
    status: 'andamento',
    mercado: 'Jorge Batista',
    logo: '../assets/jorge-batista.png',
    enderecoMercado: 'Av. Principal, 900 — Floriano',
    enderecoEntrega: 'Retirada no balcão do mercado',
    tipoEntrega: 'retirada',
    pagamento: 'cartao',
    data: '23/11/2025',
    hora: '14:32',
    qtdItens: 5,
    total: 'R$ 45,99',
    pagamentoDescricao: 'Cartão de crédito aprovado pelo ShopWise Pay Demo.',
    statusAtual: 1,
    itens: [
      { nome: 'Feijão Carioca Kicaldo 1kg', qtd: 2, preco: 'R$ 12,98', img: '../assets/feijao-kicaldo.png' },
      { nome: 'Leite Ninho 1L',             qtd: 1, preco: 'R$ 4,99',  img: '../assets/leite-ninho.png'    },
      { nome: 'Café 3 Corações 250g',       qtd: 1, preco: 'R$ 9,89',  img: '../assets/cafe-3coracoes.png' }
    ]
  },
  {
    id: 2,
    num: 'SW-482920',
    status: 'andamento',
    mercado: 'Mix Mateus',
    logo: '../assets/mix.png',
    enderecoMercado: 'Av. Principal, 580 — Bairro Novo',
    enderecoEntrega: 'Rua das Palmeiras, 45 — Centro',
    tipoEntrega: 'entrega',
    pagamento: 'dinheiro',
    data: '23/11/2025',
    hora: '10:15',
    qtdItens: 30,
    total: 'R$ 150,00',
    pagamentoDescricao: 'Pagamento em dinheiro na entrega.',
    statusAtual: 2,
    itens: [
      { nome: 'Sabão em Pó Omo 800g',       qtd: 3, preco: 'R$ 43,50', img: '../assets/sabao-omo.png'      },
      { nome: 'Detergente Ypê 500ml',       qtd: 5, preco: 'R$ 11,45', img: '../assets/detergente-ype.png' },
      { nome: 'Refrigerante Coca-Cola 2L',  qtd: 4, preco: 'R$ 33,96', img: '../assets/coca-cola.png'      }
    ]
  },
  {
    id: 3,
    num: 'SW-481500',
    status: 'entregue',
    mercado: 'Mix Mateus',
    logo: '../assets/mix.png',
    enderecoMercado: 'Av. Principal, 580 — Bairro Novo',
    enderecoEntrega: 'Rua das Palmeiras, 45 — Centro',
    tipoEntrega: 'entrega',
    pagamento: 'cartao',
    data: '15/11/2025',
    hora: '09:40',
    qtdItens: 15,
    total: 'R$ 89,50',
    pagamentoDescricao: 'Cartão de crédito aprovado pelo ShopWise Pay Demo.',
    statusAtual: 3,
    itens: [
      { nome: 'Queijo Mussarela Itambé 150g', qtd: 2, preco: 'R$ 19,98', img: '../assets/queijo-itambe.png' },
      { nome: 'Iogurte YoPRO 160g',           qtd: 4, preco: 'R$ 35,96', img: '../assets/iogurte-yopro.png' }
    ]
  },
  {
    id: 4,
    num: 'SW-479812',
    status: 'finalizado',
    mercado: 'Super Quaresma',
    logo: '../assets/quaresma.png',
    enderecoMercado: 'R. das Flores, 150 — Centro',
    enderecoEntrega: 'Rua das Palmeiras, 45 — Centro',
    tipoEntrega: 'entrega',
    pagamento: 'cartao',
    data: '20/10/2025',
    hora: '18:05',
    qtdItens: 23,
    total: 'R$ 102,53',
    pagamentoDescricao: 'Cartão de crédito aprovado pelo ShopWise Pay Demo.',
    statusAtual: 3,
    avaliacao: 4,
    itens: [
      { nome: 'Flocão de Milho Nutrivita 500g', qtd: 3, preco: 'R$ 6,57',  img: '../assets/flocao-bsb.png' },
      { nome: 'Feijão Preto Fugini 250g',       qtd: 5, preco: 'R$ 17,45', img: '../assets/feijao-fugini.png' }
    ]
  }
];

const statusProgresso = ['0%', '33%', '66%', '100%'];

const statusInfo = [
  { icone: '✅', label: 'Pedido confirmado!',             desc: 'Seu pedido foi recebido e confirmado pelo mercado.'                              },
  { icone: '📦', label: 'Mercado separando seus produtos', desc: 'Seu pedido está sendo preparado com cuidado. Previsão de entrega: <strong>45 minutos</strong>.' },
  { icone: '🚚', label: 'Pedido saiu para entrega!',      desc: 'O entregador está a caminho. Fique de olho!'                                    },
  { icone: '🏠', label: 'Pedido entregue!',               desc: 'Seu pedido foi entregue com sucesso. Bom proveito! 😊'                          }
];

const tipoEntregaInfo = {
  retirada: { icone: '🛒', label: 'Retirada' },
  entrega:  { icone: '🚚', label: 'Entrega'  }
};

const pagamentoInfo = {
  cartao:   { icone: '💳', label: 'Cartão'   },
  dinheiro: { icone: '💵', label: 'Dinheiro' },
  pix:      { icone: '⚡', label: 'PIX'      }
};

let pedidoAtivoCliente = null;

// ==================================================
// RENDERIZAÇÃO DA LISTA DE PEDIDOS (AGRUPADA)
// ==================================================

function criarHtmlCardPedido(pedido) {
  const entrega = tipoEntregaInfo[pedido.tipoEntrega] || tipoEntregaInfo.entrega;
  const pagamento = pagamentoInfo[pedido.pagamento] || pagamentoInfo.cartao;

  let acaoHtml = '';

  if (pedido.status === 'andamento') {
    acaoHtml = `
      <button class="btn-order-action primary" onclick="abrirAcompanhamento(${pedido.id})">
        📋 Rastrear pedido
      </button>
    `;
  } else if (pedido.status === 'entregue') {
    acaoHtml = `
      <div class="order-action-group">
        <button class="btn-order-action secondary" onclick="abrirAcompanhamento(${pedido.id})">Ver detalhes</button>
        <a href="avaliacao.html" class="btn-order-action primary">⭐ Avaliar pedido</a>
      </div>
    `;
  } else {
    const estrelas = '★'.repeat(pedido.avaliacao || 0) + '☆'.repeat(5 - (pedido.avaliacao || 0));
    acaoHtml = `
      <div class="order-final-rating" aria-label="${pedido.avaliacao || 0} de 5 estrelas">${estrelas}</div>
      <button class="btn-order-action secondary" onclick="abrirAcompanhamento(${pedido.id})">Ver detalhes</button>
    `;
  }

  return `
    <article class="order-card-item">
      <div class="order-card-logo">
        <img src="${pedido.logo}" alt="${pedido.mercado}" onerror="this.onerror=null; this.src='https://placehold.co/56x56/e8faf2/00b978?text=Loja';">
      </div>

      <div class="order-card-info">
        <div class="order-tag-row">
          <span class="order-tag">${entrega.icone} ${entrega.label}</span>
          <span class="order-tag">${pagamento.icone} ${pagamento.label}</span>
        </div>
        <h3>${pedido.mercado}</h3>
        <span class="order-card-meta">${pedido.data} • ${pedido.qtdItens} itens</span>
      </div>

      <div class="order-card-value">
        <strong>${pedido.total}</strong>
        <div class="order-card-actions">${acaoHtml}</div>
      </div>
    </article>
  `;
}

function renderizarListaPedidos() {
  const grupos = {
    andamento: document.getElementById('listaAndamento'),
    entregue: document.getElementById('listaEntregue'),
    finalizado: document.getElementById('listaFinalizado')
  };

  Object.keys(grupos).forEach((status) => {
    const container = grupos[status];
    if (!container) return;

    const pedidosDoGrupo = pedidosCliente.filter((pedido) => pedido.status === status);

    if (pedidosDoGrupo.length === 0) {
      container.innerHTML = `<p class="orders-empty">Nenhum pedido nesta categoria no momento.</p>`;
      return;
    }

    container.innerHTML = pedidosDoGrupo.map(criarHtmlCardPedido).join('');
  });
}

// ==================================================
// MODAL DE ACOMPANHAMENTO (DETALHE DE 1 PEDIDO)
// ==================================================

function abrirAcompanhamento(id) {
  pedidoAtivoCliente = pedidosCliente.find(function(p) { return p.id === id; });
  if (!pedidoAtivoCliente) return;
  renderizarAcomp();
  document.getElementById('modalAcompOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharAcomp() {
  document.getElementById('modalAcompOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function fecharAcompOverlay(e) {
  if (e.target === document.getElementById('modalAcompOverlay')) fecharAcomp();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') fecharAcomp();
});

function renderizarAcomp() {
  var p = pedidoAtivoCliente;
  var s = p.statusAtual;

  // Header
  document.getElementById('acompTitulo').textContent   = 'Pedido ' + p.num;
  document.getElementById('acompSubtitulo').textContent = 'Realizado às ' + p.hora + ' • ' + p.mercado;

  // Stepper
  for (var i = 0; i < 4; i++) {
    var el = document.getElementById('acomp-step-' + i);
    el.classList.remove('done', 'active');
    if (i < s) el.classList.add('done');
    if (i === s) el.classList.add('active');
  }
  document.getElementById('acompProgress').style.width = statusProgresso[s];

  // Mensagem de status
  var info = statusInfo[s];
  document.getElementById('acompStatusIcone').textContent  = info.icone;
  document.getElementById('acompStatusLabel').textContent  = info.label;
  document.getElementById('acompStatusDesc').innerHTML     = info.desc;

  // Itens (somente leitura, sem checkbox)
  document.getElementById('acompItensList').innerHTML = p.itens.map(function(item) {
    return '<div class="item-row">' +
      '<img class="item-img" src="' + item.img + '" onerror="this.src=\'https://placehold.co/44x44/f4f7f6/777?text=📦\'" alt="' + item.nome + '">' +
      '<div class="item-info"><h4>' + item.nome + '</h4><span>Qtd: ' + item.qtd + '</span></div>' +
      '<div class="item-preco">' + item.preco + '</div>' +
    '</div>';
  }).join('');

  // Endereço e mercado
  document.getElementById('acompEndereco').textContent = p.enderecoEntrega;
  document.getElementById('acompMercado').textContent  = p.mercado + ' • ' + p.enderecoMercado;

  // Total
  document.getElementById('acompTotal').textContent    = p.total;
  document.getElementById('acompPagamento').textContent = p.pagamentoDescricao || p.pagamento;
}

document.addEventListener('DOMContentLoaded', renderizarListaPedidos);