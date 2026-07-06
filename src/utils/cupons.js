// ==================================================
// SHOPWISE - CUPONS E CASHBACK POR MERCADO
// ==================================================

const mercadosCashback = [
    { nome: "Super Quaresma", logo: "../assets/quaresma.png", cashback: 3, cupons: 4 },
    { nome: "Mix Mateus", logo: "../assets/mix.png", cashback: 2, cupons: 3 },
    { nome: "Jorge Batista", logo: "../assets/jorge-batista.png", cashback: 0, cupons: 5 },
    { nome: "Carvalho", logo: "../assets/carvalho.png", cashback: 0, cupons: 2 }
];

const estadoCupons = {
    termo: "",
    filtro: "todos",
    ordenacao: "relevantes"
};

function normalizarTextoCupom(texto) {
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function filtrarMercados() {
    const termoNormalizado = normalizarTextoCupom(estadoCupons.termo);

    let lista = mercadosCashback.filter((mercado) => {
        const correspondeTermo =
            termoNormalizado === "" ||
            normalizarTextoCupom(mercado.nome).includes(termoNormalizado);

        const correspondeFiltro =
            estadoCupons.filtro === "todos" ||
            (estadoCupons.filtro === "com-cashback" && mercado.cashback > 0) ||
            (estadoCupons.filtro === "sem-cashback" && mercado.cashback === 0);

        return correspondeTermo && correspondeFiltro;
    });

    lista = [...lista];

    switch (estadoCupons.ordenacao) {
        case "maior-cashback":
            lista.sort((a, b) => b.cashback - a.cashback);
            break;
        case "mais-cupons":
            lista.sort((a, b) => b.cupons - a.cupons);
            break;
        case "nome":
            lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
            break;
        default:
            lista.sort((a, b) => (b.cashback + b.cupons) - (a.cashback + a.cupons));
    }

    return lista;
}

function criarHtmlMercadoCupom(mercado) {
    const tagCashback = mercado.cashback > 0
        ? `<span class="market-cashback-tag positive">💰 ${mercado.cashback}% de volta</span>`
        : `<span class="market-cashback-tag neutral">Sem cashback</span>`;

    return `
        <a href="feedproduto.html" class="market-coupon-card">
            <div class="market-coupon-logo">
                <img src="${mercado.logo}" alt="${mercado.nome}" onerror="this.onerror=null; this.src='https://placehold.co/60x60/e8faf2/00b978?text=Loja';">
            </div>
            <div class="market-coupon-info">
                <h3>${mercado.nome}</h3>
                ${tagCashback}
                <span class="market-coupon-count">${mercado.cupons} cupom(ns) disponível(is)</span>
            </div>
            <span class="market-coupon-arrow" aria-hidden="true">›</span>
        </a>
    `;
}

function atualizarResumoMercados(listaCompleta) {
    const totalMercados = document.getElementById("totalMercados");
    const totalCupons = document.getElementById("totalCupons");

    if (totalMercados) totalMercados.textContent = listaCompleta.length;

    if (totalCupons) {
        const soma = listaCompleta.reduce((acc, mercado) => acc + mercado.cupons, 0);
        totalCupons.textContent = soma;
    }
}

function renderizarMercadosCupom() {
    const grid = document.getElementById("marketCouponGrid");
    if (!grid) return;

    const lista = filtrarMercados();

    if (lista.length === 0) {
        grid.innerHTML = `
            <div class="market-coupon-empty">
                Nenhum supermercado encontrado com esse filtro. Tente ajustar a busca.
            </div>
        `;
        return;
    }

    grid.innerHTML = lista.map(criarHtmlMercadoCupom).join("");
}

function configurarToolbarCupons() {
    const searchInput = document.getElementById("marketSearchInput");
    const filterGroup = document.getElementById("marketFilterGroup");
    const sortSelect = document.getElementById("marketSortSelect");

    if (searchInput) {
        searchInput.addEventListener("input", (event) => {
            estadoCupons.termo = event.target.value;
            renderizarMercadosCupom();
        });
    }

    if (filterGroup) {
        filterGroup.querySelectorAll(".cat-btn").forEach((botao) => {
            botao.addEventListener("click", function () {
                filterGroup.querySelectorAll(".cat-btn").forEach((item) => item.classList.remove("active"));
                this.classList.add("active");
                estadoCupons.filtro = this.dataset.filtro || "todos";
                renderizarMercadosCupom();
            });
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", function () {
            estadoCupons.ordenacao = this.value;
            renderizarMercadosCupom();
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarResumoMercados(mercadosCashback);
    configurarToolbarCupons();
    renderizarMercadosCupom();
});