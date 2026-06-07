let carrinho =
JSON.parse(localStorage.getItem("carrinho")) || [];

const container =
document.getElementById("cartProducts");

let total = 0;

function renderizarCarrinho() {

    container.innerHTML = "";
    total = 0;

    if (carrinho.length === 0) {

        container.innerHTML = `
            <div class="empty-cart">
                <h2>
                    Seu carrinho está vazio
                </h2>

                <p>
                    Compare preços e adicione produtos para começar.
                </p>

                <a
                    href="feedproduto.html"
                    class="btn-verde continue-shopping">

                    Explorar Produtos

                </a>

            </div>
        `;

        atualizarResumo();
        return;
    }

    carrinho.forEach(produto => {

        const precoUnitario =
            parseFloat(produto.preco.replace(",", "."));

        const subtotalProduto =
            precoUnitario * produto.quantidade;

        total += subtotalProduto;

        container.innerHTML += `
            <div class="cart-item">

                <img
                    src="${produto.img}"
                    alt="${produto.nome}"
                >

                <div class="cart-info">

                    <h3>${produto.nome}</h3>

                    <span class="item-calculation">
                        ${produto.quantidade} ×
                        ${precoUnitario.toLocaleString(
                            "pt-BR",
                            {
                                style: "currency",
                                currency: "BRL"
                            }
                        )}
                    </span>

                    <strong>
                        ${subtotalProduto.toLocaleString(
                            "pt-BR",
                            {
                                style: "currency",
                                currency: "BRL"
                            }
                        )}
                    </strong>

                    <button class="alert-btn">
                        🔔 Criar alerta
                    </button>

                </div>

                <div class="quantity-control">

                    <button
                        onclick="alterarQuantidade(${produto.id}, -1)">
                        -
                    </button>

                    <span>
                        ${produto.quantidade}
                    </span>

                    <button
                        onclick="alterarQuantidade(${produto.id}, 1)">
                        +
                    </button>

                </div>

            </div>
        `;
    });

    atualizarResumo();
}

function alterarQuantidade(id, valor) {

    const item =
        carrinho.find(p => p.id === id);

    if (!item) return;

    item.quantidade += valor;

    if (item.quantidade <= 0) {

        carrinho =
            carrinho.filter(
                p => p.id !== id
            );
    }

    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );

    renderizarCarrinho();
}

function atualizarResumo() {

    const valor =
        total.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    document.getElementById("subtotal")
        .textContent = valor;

    document.getElementById("total")
        .textContent = valor;
}

function limparCarrinho() {

    localStorage.removeItem("carrinho");

    carrinho = [];

    renderizarCarrinho();
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        renderizarCarrinho();
    }
);