const pedidos = [
  {
    id: 1,
    num: 'SW-482913',
    cliente: 'João Silva',
    hora: '14:32',
    avatar: 'J',
    endereco: 'Rua das Palmeiras, 45 — Centro',
    tel: '(89) 99999-1234',
    statusAtual: 1,
    itens: [
      { nome: 'Feijão Carioca Kicaldo 1kg', qtd: 2, preco: 'R$ 12,98', img: '../assets/feijao-kicaldo.png', separado: false },
      { nome: 'Leite Ninho 1L',             qtd: 1, preco: 'R$ 4,99',  img: '../assets/leite-ninho.png',    separado: false },
      { nome: 'Café 3 Corações 250g',       qtd: 1, preco: 'R$ 9,89',  img: '../assets/cafe-3coracoes.png', separado: false }
    ]
  }
];

const statusProgresso = ['0%', '33%', '66%', '100%'];
let pedidoAtivo = null;

function abrirPedido(id) {
  pedidoAtivo = pedidos.find(function(p) { return p.id === id; });
  if (!pedidoAtivo) return;
  renderizarModal();
  document.getElementById('modalPedidoOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharPedido() {
  document.getElementById('modalPedidoOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function fecharPedidoOverlay(e) {
  if (e.target === document.getElementById('modalPedidoOverlay')) fecharPedido();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') fecharPedido();
});

function renderizarModal() {
  var p = pedidoAtivo;
  var s = p.statusAtual;

  document.getElementById('pedTitulo').textContent    = 'Pedido ' + p.num;
  document.getElementById('pedSubtitulo').textContent = p.cliente + ' • Recebido às ' + p.hora;

  for (var i = 0; i < 4; i++) {
    var el = document.getElementById('step-' + i);
    el.classList.remove('done', 'active');
    if (i < s) el.classList.add('done');
    if (i === s) el.classList.add('active');
  }
  document.getElementById('stepperProgress').style.width = statusProgresso[s];

  document.getElementById('acaoTitulo').textContent = s === 3 ? '✅ Pedido finalizado' : 'Próxima ação:';

  var btnAvancar = document.getElementById('btnAvancar');
  btnAvancar.textContent =
    s === 0 ? '📦 Iniciar separação' :
    s === 1 ? '🚚 Marcar como saiu para entrega' :
    s === 2 ? '✅ Confirmar entrega' : '✔ Concluído';
  btnAvancar.disabled = s === 3;
  document.getElementById('btnCancelar').disabled = s === 3;

  renderizarItens();

  document.getElementById('progressoSep').style.display = s === 1 ? 'flex' : 'none';
  atualizarProgressoSep();

  document.getElementById('clienteAvatar').textContent = p.avatar;
  document.getElementById('clienteNome').textContent   = p.cliente;
  document.getElementById('clienteEndereco').innerHTML = p.endereco + '<br>📱 ' + p.tel;

  var btnN = document.getElementById('btnNotificar');
  btnN.textContent = '🔔 Notificar cliente';
  btnN.classList.remove('enviado');
}

function renderizarItens() {
  var p = pedidoAtivo;
  document.getElementById('itensList').innerHTML = p.itens.map(function(item, i) {
    return '<div class="item-row">' +
      '<div class="item-check ' + (item.separado ? 'checked' : '') + '" onclick="toggleSeparado(' + i + ')">' +
        (item.separado ? '✓' : '') +
      '</div>' +
      '<img class="item-img" src="' + item.img + '" onerror="this.src=\'https://placehold.co/44x44/f4f7f6/777?text=📦\'" alt="' + item.nome + '">' +
      '<div class="item-info"><h4>' + item.nome + '</h4><span>Qtd: ' + item.qtd + '</span></div>' +
      '<div class="item-preco">' + item.preco + '</div>' +
    '</div>';
  }).join('');
}

function toggleSeparado(idx) {
  if (pedidoAtivo.statusAtual !== 1) return;
  pedidoAtivo.itens[idx].separado = !pedidoAtivo.itens[idx].separado;
  renderizarItens();
  atualizarProgressoSep();
}

function atualizarProgressoSep() {
  var p     = pedidoAtivo;
  var total = p.itens.length;
  var sep   = p.itens.filter(function(i) { return i.separado; }).length;
  var pct   = Math.round((sep / total) * 100);
  document.getElementById('sepTexto').textContent    = sep + ' de ' + total + ' separados';
  document.getElementById('sepFill').style.width     = pct + '%';
}

function avancarStatus() {
  var p = pedidoAtivo;
  if (p.statusAtual >= 3) return;

  if (p.statusAtual === 1) {
    var naoSep = p.itens.filter(function(i) { return !i.separado; }).length;
    if (naoSep > 0) {
      mostrarToast('⚠️ Ainda faltam ' + naoSep + ' item(ns) para separar!');
      return;
    }
  }

  p.statusAtual++;
  renderizarModal();

  var msgs = ['', '📦 Separação iniciada!', '🚚 Pedido saiu para entrega!', '✅ Entrega confirmada!'];
  mostrarToast(msgs[p.statusAtual]);
}

function cancelarPedido() {
  if (!confirm('Tem certeza que deseja cancelar o pedido ' + pedidoAtivo.num + '?')) return;
  mostrarToast('❌ Pedido ' + pedidoAtivo.num + ' cancelado.');
  fecharPedido();
}

function notificarCliente() {
  var btn = document.getElementById('btnNotificar');
  btn.textContent = '✅ Notificado!';
  btn.classList.add('enviado');
  var labels = ['Recebido', 'Em separação', 'Saiu para entrega', 'Entregue'];
  mostrarToast('🔔 ' + pedidoAtivo.cliente + ' foi notificado: ' + labels[pedidoAtivo.statusAtual]);
}

function mostrarToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}