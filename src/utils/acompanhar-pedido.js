const pedidosCliente = [
  {
    id: 1,
    num: 'SW-482913',
    mercado: 'Super Quaresma',
    enderecoMercado: 'R. das Flores, 150 — Centro',
    enderecoEntrega: 'Rua das Palmeiras, 45 — Centro',
    hora: '14:32',
    total: 'R$ 22,97',
    pagamento: 'PIX aprovado pelo ShopWise Pay Demo.',
    statusAtual: 1,
    itens: [
      { nome: 'Feijão Carioca Kicaldo 1kg', qtd: 2, preco: 'R$ 12,98', img: '../assets/feijao-kicaldo.png' },
      { nome: 'Leite Ninho 1L',             qtd: 1, preco: 'R$ 4,99',  img: '../assets/leite-ninho.png'    },
      { nome: 'Café 3 Corações 250g',       qtd: 1, preco: 'R$ 9,89',  img: '../assets/cafe-3coracoes.png' }
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

let pedidoAtivoCliente = null;

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
  document.getElementById('acompPagamento').textContent = p.pagamento;
}