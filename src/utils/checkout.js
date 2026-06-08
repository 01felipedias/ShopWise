// Variável global
let subtotal = 17.97; // Valor padrão se não vier nada do carrinho

// Isso roda automaticamente assim que a página de Checkout abre
document.addEventListener("DOMContentLoaded", function() {
    // 1. Vai na memória do navegador e procura o 'shopwiseTotal'
    const valorSalvo = localStorage.getItem('shopwiseTotal');
    
    // 2. Se achar um valor, ele substitui o nosso 17.97 por ele
    if (valorSalvo) {
        subtotal = parseFloat(valorSalvo);
    }
    
    // 3. Atualiza os textos de Subtotal e Total na tela antes de mostrar pro usuário
    toggleAddressConfig();
});

// A função que mostra/esconde os cartões (já tava pronta, só tirei o subtotal daqui de dentro)
function toggleAddressConfig() {
    const isDelivery = document.querySelector('input[value="delivery"]').checked;
    const addressCard = document.getElementById('addressCard');
    const pickupCard = document.getElementById('pickupCard'); 
    const deliveryFeeLine = document.getElementById('deliveryFeeLine');
    const finalTotal = document.getElementById('finalTotal');

    if (isDelivery) {
        // RECEBER EM CASA
        addressCard.style.display = 'block';
        pickupCard.style.display = 'none'; 
        
        deliveryFeeLine.innerHTML = '<span>Taxa de Entrega</span><span>R$ 5,00</span>';
        const valorComTaxa = subtotal + 5.00;
        finalTotal.innerText = `R$ ${valorComTaxa.toFixed(2).replace('.', ',')}`;
    } else {
        // RETIRAR NO MERCADO
        addressCard.style.display = 'none';
        pickupCard.style.display = 'block'; 
        
        deliveryFeeLine.innerHTML = '<span>Retirada na Loja</span><span style="color: #2ECC71;">Grátis</span>';
        finalTotal.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }
}

function finalizarPedido() {
    alert("✅ Pedido criado com sucesso no ShopWise!\n\nAcompanhe o status do seu pedido na aba de Notificações.");
}