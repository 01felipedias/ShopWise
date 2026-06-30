let bannerAtual = 0;
const totalBanners = 2;
let bannerInterval;
 
function renderizarDots() {
  const dots = document.getElementById('bannerDots');
  dots.innerHTML = '';
  for (let i = 0; i < totalBanners; i++) {
    const dot = document.createElement('button');
    dot.className = 'banner-dot' + (i === bannerAtual ? ' active' : '');
    dot.setAttribute('aria-label', 'Ir para banner ' + (i + 1));
    dot.onclick = () => irParaBanner(i);
    dots.appendChild(dot);
  }
}
 
function atualizarBanner() {
  const track = document.getElementById('bannerTrack');
  track.style.transform = `translateX(-${bannerAtual * 100}%)`;
  renderizarDots();
}
 
function bannerProximo() {
  bannerAtual = (bannerAtual + 1) % totalBanners;
  atualizarBanner();
  reiniciarAutoplay();
}
 
function bannerAnterior() {
  bannerAtual = (bannerAtual - 1 + totalBanners) % totalBanners;
  atualizarBanner();
  reiniciarAutoplay();
}
 
function irParaBanner(i) {
  bannerAtual = i;
  atualizarBanner();
  reiniciarAutoplay();
}
 
function iniciarAutoplay() {
  bannerInterval = setInterval(bannerProximo, 5000);
}
 
function reiniciarAutoplay() {
  clearInterval(bannerInterval);
  iniciarAutoplay();
}
 
renderizarDots();
iniciarAutoplay();