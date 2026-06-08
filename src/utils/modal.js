function openModal() {
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(animateBars, 200);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  resetBars();
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(function(p) {
    p.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');
  if (tabId === 'grafico') setTimeout(animateBars, 50);
}

const maxPrice = 8.99;
const prices = { 1: 6.49, 2: 7.39, 3: 7.99, 4: 8.99 };
const maxH = 170;

function animateBars() {
  for (let i = 1; i <= 4; i++) {
    const h = Math.round((prices[i] / maxPrice) * maxH);
    document.getElementById('chartBar' + i).style.height = h + 'px';
  }
}

function resetBars() {
  for (let i = 1; i <= 4; i++) {
    document.getElementById('chartBar' + i).style.height = '0px';
  }
}

function addToCart() {
  const btn = document.querySelector('.btn-add-modal');
  btn.textContent = '✅ Adicionado!';
  setTimeout(function() { closeModal(); }, 1500);
}