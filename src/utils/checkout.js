const ORDER_VALUES = {
    subtotal: 17.97,
    deliveryFee: 5.00,
    discount: 0.00
};

let currentTotal = ORDER_VALUES.subtotal + ORDER_VALUES.deliveryFee - ORDER_VALUES.discount;

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function getSelectedPaymentMethod() {
    return document.querySelector('input[name="paymentMethod"]:checked')?.value || 'pix';
}

function getPaymentMethodLabel(method) {
    const labels = {
        pix: 'PIX',
        credito: 'Cartão de Crédito',
        debito: 'Cartão de Débito'
    };

    return labels[method] || 'PIX';
}

function updateTotal() {
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
    const deliveryFee = deliveryMethod === 'delivery' ? ORDER_VALUES.deliveryFee : 0;

    currentTotal = ORDER_VALUES.subtotal + deliveryFee - ORDER_VALUES.discount;

    document.getElementById('deliveryFeeValue').textContent = formatCurrency(deliveryFee);
    document.getElementById('finalTotal').textContent = formatCurrency(currentTotal);
    document.getElementById('payButton').textContent = `Pagar ${formatCurrency(currentTotal)}`;

    updateInstallments();
}

function toggleAddressConfig() {
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
    const addressCard = document.getElementById('addressCard');
    const pickupCard = document.getElementById('pickupCard');

    if (deliveryMethod === 'pickup') {
        addressCard.hidden = true;
        pickupCard.hidden = false;
    } else {
        addressCard.hidden = false;
        pickupCard.hidden = true;
    }

    updateTotal();
}

function updatePaymentPanels() {
    const method = getSelectedPaymentMethod();
    const pixPanel = document.getElementById('pixPanel');
    const cardPanel = document.getElementById('cardPanel');
    const installmentGroup = document.getElementById('installmentGroup');

    document.querySelectorAll('.payment-method').forEach((card) => {
        const input = card.querySelector('input');
        card.classList.toggle('active', input.checked);
    });

    if (method === 'pix') {
        pixPanel.hidden = false;
        pixPanel.classList.add('active');
        cardPanel.hidden = true;
        cardPanel.classList.remove('active');
    } else {
        pixPanel.hidden = true;
        pixPanel.classList.remove('active');
        cardPanel.hidden = false;
        cardPanel.classList.add('active');
        installmentGroup.hidden = method !== 'credito';
    }

    setGatewayStatus('Gateway ShopWise Pay pronto para processar a transação.', '');
}

function updateInstallments() {
    const installments = document.getElementById('installments');
    if (!installments) return;

    installments.innerHTML = `
        <option value="1">1x de ${formatCurrency(currentTotal)} sem juros</option>
        <option value="2">2x de ${formatCurrency(currentTotal / 2)} sem juros</option>
        <option value="3">3x de ${formatCurrency(currentTotal / 3)} sem juros</option>
    `;
}

function setGatewayStatus(message, type) {
    const gatewayStatus = document.getElementById('gatewayStatus');

    gatewayStatus.className = 'gateway-status';
    if (type) gatewayStatus.classList.add(type);

    gatewayStatus.textContent = message;
}

function clearCardErrors() {
    document.querySelectorAll('.input-error').forEach((input) => {
        input.classList.remove('input-error');
    });
}

function validateCardFields() {
    clearCardErrors();

    const requiredFields = [
        document.getElementById('cardName'),
        document.getElementById('cardNumber'),
        document.getElementById('cardExpiry'),
        document.getElementById('cardCvv')
    ];

    let isValid = true;

    requiredFields.forEach((field) => {
        if (!field.value.trim()) {
            field.classList.add('input-error');
            isValid = false;
        }
    });

    const onlyDigitsCard = document.getElementById('cardNumber').value.replace(/\D/g, '');
    const onlyDigitsCvv = document.getElementById('cardCvv').value.replace(/\D/g, '');
    const expiry = document.getElementById('cardExpiry').value.trim();

    if (onlyDigitsCard.length < 13) {
        document.getElementById('cardNumber').classList.add('input-error');
        isValid = false;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        document.getElementById('cardExpiry').classList.add('input-error');
        isValid = false;
    }

    if (onlyDigitsCvv.length < 3) {
        document.getElementById('cardCvv').classList.add('input-error');
        isValid = false;
    }

    if (!isValid) {
        setGatewayStatus('Revise os dados do cartão antes de continuar.', 'error');
    }

    return isValid;
}

function buildPaymentPayload() {
    const method = getSelectedPaymentMethod();
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';

    const payload = {
        pedido: generateOrderNumber(),
        metodoPagamento: method,
        metodoRecebimento: deliveryMethod,
        valor: currentTotal,
        observacoes: document.getElementById('orderNotes').value.trim(),
        gateway: 'ShopWise Pay Demo',
        criptografia: 'TLS/tokenização simulada'
    };

    if (method !== 'pix') {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\D/g, '');

        payload.cartao = {
            nome: document.getElementById('cardName').value.trim(),
            final: cardNumber.slice(-4),
            token: `tok_sw_${Math.random().toString(36).slice(2, 12)}`
        };
    }

    return payload;
}

function simulatePaymentGateway(payload) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const method = payload.metodoPagamento;
            let status = 'aprovado';

            // Simulação para testes: cartão terminando em 0 será recusado.
            if (payload.cartao?.final?.endsWith('0')) {
                status = 'recusado';
            }

            // PIX fica aprovado na demo para facilitar apresentação.
            if (method === 'pix') {
                status = 'aprovado';
            }

            resolve({
                status,
                orderNumber: payload.pedido,
                transactionId: `TX-${Date.now().toString().slice(-8)}`,
                method,
                total: payload.valor,
                date: new Date()
            });
        }, 1300);
    });
}

function generateOrderNumber() {
    return `SW-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function finalizarPedido() {
    const payButton = document.getElementById('payButton');
    const method = getSelectedPaymentMethod();

    if (method !== 'pix' && !validateCardFields()) return;

    const payload = buildPaymentPayload();

    payButton.disabled = true;
    payButton.textContent = 'Processando...';
    setGatewayStatus('Enviando transação criptografada para o gateway ShopWise Pay...', 'processing');

    try {
        const response = await simulatePaymentGateway(payload);

        if (response.status === 'aprovado') {
            setGatewayStatus('Pagamento aprovado pelo gateway. Comprovante emitido.', 'success');
            openReceipt(response);
        } else {
            setGatewayStatus('Pagamento recusado pelo gateway. Tente outro cartão ou método.', 'error');
            openReceipt(response);
        }
    } catch (error) {
        setGatewayStatus('Não foi possível processar o pagamento. Verifique a conexão e tente novamente.', 'error');
    } finally {
        payButton.disabled = false;
        payButton.textContent = `Pagar ${formatCurrency(currentTotal)}`;
    }
}

function openReceipt(response) {
    const approved = response.status === 'aprovado';
    const modal = document.getElementById('paymentModal');
    const statusIcon = document.getElementById('receiptStatusIcon');

    statusIcon.textContent = approved ? '✓' : '!';
    statusIcon.classList.toggle('denied', !approved);

    document.getElementById('modalTitle').textContent = approved ? 'Pagamento aprovado!' : 'Pagamento recusado';
    document.getElementById('modalSubtitle').textContent = approved
        ? 'Seu pedido foi confirmado e enviado ao supermercado.'
        : 'A transação não foi autorizada. Tente novamente com outro método.';

    document.getElementById('receiptOrderNumber').textContent = response.orderNumber;
    document.getElementById('receiptTransaction').textContent = response.transactionId;
    document.getElementById('receiptMethod').textContent = getPaymentMethodLabel(response.method);
    document.getElementById('receiptTotal').textContent = formatCurrency(response.total);
    document.getElementById('receiptDate').textContent = response.date.toLocaleString('pt-BR');
    document.getElementById('receiptStatusText').textContent = approved ? 'Pagamento Confirmado' : 'Pagamento Recusado';

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function copyPixCode() {
    const pixCode = document.getElementById('pixCode');
    pixCode.select();
    pixCode.setSelectionRange(0, 99999);

    navigator.clipboard?.writeText(pixCode.value).then(() => {
        setGatewayStatus('Código PIX copiado para a área de transferência.', 'success');
    }).catch(() => {
        document.execCommand('copy');
        setGatewayStatus('Código PIX copiado.', 'success');
    });
}

function applyMasks() {
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');

    cardNumber?.addEventListener('input', () => {
        const digits = cardNumber.value.replace(/\D/g, '').slice(0, 16);
        cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    });

    cardExpiry?.addEventListener('input', () => {
        const digits = cardExpiry.value.replace(/\D/g, '').slice(0, 4);
        cardExpiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    });

    cardCvv?.addEventListener('input', () => {
        cardCvv.value = cardCvv.value.replace(/\D/g, '').slice(0, 4);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
        input.addEventListener('change', updatePaymentPanels);
    });

    document.querySelectorAll('.payment-method').forEach((card) => {
        card.addEventListener('click', () => {
            const input = card.querySelector('input');
            input.checked = true;
            input.dispatchEvent(new Event('change'));
        });
    });

    applyMasks();
    toggleAddressConfig();
    updatePaymentPanels();
});
