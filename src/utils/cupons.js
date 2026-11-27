const estadoCupons = {
    termo: "",
    ordenacao: "expira",
    lista: []
};

function escaparHtmlCupom(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function textoCupomNormalizado(texto) {
    return String(texto ?? "")
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function dinheiroCupom(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function ordenarCupons(lista) {
    const resultado = [...lista];
    if (estadoCupons.ordenacao === "nome") {
        resultado.sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
    } else {
        resultado.sort((a, b) => new Date(a.data_fim) - new Date(b.data_fim));
    }
    return resultado;
}

function renderizarCupons() {
    const grid = document.getElementById("couponGrid");
    if (!grid) return;

    const termo = textoCupomNormalizado(estadoCupons.termo);
    const lista = ordenarCupons(estadoCupons.lista.filter(cupom => {
        const pesquisavel = `${cupom.codigo} ${cupom.descricao || ""} ${cupom.supermercado || ""}`;
        return textoCupomNormalizado(pesquisavel).includes(termo);
    }));

    if (!lista.length) {
        grid.innerHTML = '<p class="market-coupon-empty">Nenhum cupom ativo encontrado.</p>';
        return;
    }

    grid.innerHTML = lista.map(cupom => {
        const desconto = cupom.tipo === "percentual"
            ? `${escaparHtmlCupom(cupom.valor)}% de desconto`
            : `${dinheiroCupom(cupom.valor)} de desconto`;
        const minimo = Number(cupom.valor_minimo || 0) > 0
            ? `Compra mínima de ${dinheiroCupom(cupom.valor_minimo)}`
            : "Sem compra mínima";
        const validade = new Date(cupom.data_fim).toLocaleDateString("pt-BR");
        const loja = cupom.supermercado || "Todos os supermercados";

        return `
            <article class="info-card">
                <h3>${escaparHtmlCupom(cupom.codigo)}</h3>
                <p>${escaparHtmlCupom(cupom.descricao || desconto)}</p>
                <p><strong>${desconto}</strong> · ${escaparHtmlCupom(minimo)}</p>
                <p>${escaparHtmlCupom(loja)} · Válido até ${validade}</p>
                <a href="carrinho.html" class="btn-card-link">Usar no carrinho</a>
            </article>`;
    }).join("");
}

async function carregarCuponsPublicos() {
    const grid = document.getElementById("couponGrid");
    try {
        const resposta = await fetch("/api/cupons/");
        if (!resposta.ok) throw new Error("Não foi possível carregar os cupons.");
        estadoCupons.lista = await resposta.json();
        const mercados = new Set(
            estadoCupons.lista.map(cupom => cupom.supermercado_id).filter(Boolean)
        );
        const globais = estadoCupons.lista.filter(cupom => cupom.supermercado_id == null);
        document.getElementById("totalMercados").textContent = mercados.size;
        document.getElementById("totalCupons").textContent = estadoCupons.lista.length;
        document.getElementById("totalCuponsGlobais").textContent = globais.length;
        renderizarCupons();
    } catch (erro) {
        console.error(erro);
        if (grid) grid.innerHTML = '<p class="market-coupon-empty">Não foi possível carregar os cupons agora.</p>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("marketSearchInput")?.addEventListener("input", event => {
        estadoCupons.termo = event.target.value;
        renderizarCupons();
    });
    document.getElementById("marketSortSelect")?.addEventListener("change", event => {
        estadoCupons.ordenacao = event.target.value;
        renderizarCupons();
    });
    carregarCuponsPublicos();
});
