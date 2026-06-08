// Função para atualizar a tela quando o usuário troca entre "Entrega" e "Retirada"
function toggleAddressConfig() {
    // Capturando os elementos
    const isDelivery = document.querySelector('input[value="delivery"]').checked;
    const addressCard = document.getElementById('addressCard');
    const pickupCard = document.getElementById('pickupCard'); 
    const deliveryFeeLine = document.getElementById('deliveryFeeLine');
    const finalTotal = document.getElementById('finalTotal');
    
    // Valor dos produtos
    const subtotal = 17.97;

    // A MÁGICA: Mostra e esconde os cartões
    if (isDelivery) {
        // RECEBER EM CASA: Mostra input de endereço e esconde o mercado
        addressCard.style.display = 'block';
        pickupCard.style.display = 'none'; 
        
        // Atualiza a taxa e o total
        deliveryFeeLine.innerHTML = '<span>Taxa de Entrega</span><span>R$ 5,00</span>';
        const valorComTaxa = subtotal + 5.00;
        finalTotal.innerText = `R$ ${valorComTaxa.toFixed(2).replace('.', ',')}`;
    } else {
        // RETIRAR NO MERCADO: Esconde input de endereço e mostra o mercado
        addressCard.style.display = 'none';
        pickupCard.style.display = 'block'; 
        
        // Atualiza a taxa para grátis e o total
        deliveryFeeLine.innerHTML = '<span>Retirada na Loja</span><span style="color: var(--primary);">Grátis</span>';
        finalTotal.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }
}

// Função do botão de confirmar a compra
function finalizarPedido() {
    alert("✅ Pedido criado com sucesso no ShopWise!\n\nVocê economizou R$ 4,02 comprando no Super Quaresma. Acompanhe o status do seu pedido na aba de Notificações.");
}