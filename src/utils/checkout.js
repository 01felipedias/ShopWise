const ORDER_VALUES = {
    subtotal: 0,
    deliveryFee: 5.00,
    discount: 0.00
};

let carrinho =
    JSON.parse(localStorage.getItem("carrinho")) || [];


const VALID_COUPONS = {
    SHOPWISE10: 0.10,
    ECONOMIA5: 0.05
};
function carregarResumoPedido() {

    const container =
        document.getElementById("checkoutPedidos");

    if (!container) return;

    container.innerHTML = "";

    let subtotal = 0;

    carrinho.forEach(produto => {

        const preco =
            typeof produto.preco === "number"
                ? produto.preco
                : Number(
                    produto.preco
                        .replace("R$", "")
                        .replace(",", ".")
                );

        const totalProduto =
            preco * produto.quantidade;

        subtotal += totalProduto;

        container.innerHTML += `
            <div class="summary-item">
                <span>
                    ${produto.nome} (x${produto.quantidade})
                </span>

                <span>
                    ${totalProduto.toLocaleString(
                        "pt-BR",
                        {
                            style: "currency",
                            currency: "BRL"
                        }
                    )}
                </span>
            </div>
        `;
    });

    ORDER_VALUES.subtotal = subtotal;

    document.getElementById("subtotalValue")
        .textContent = subtotal.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    updateTotal();
}
let currentTotal = ORDER_VALUES.subtotal + ORDER_VALUES.deliveryFee - ORDER_VALUES.discount;
let pixTimerInterval = null;
let pixSeconds = 10 * 60;

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
        debito: 'Cartão de Débito à vista',
        entrega: 'Pagamento na entrega'
    };

    return labels[method] || 'PIX';
}

function updateCheckoutReview() {
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
    const method = getSelectedPaymentMethod();

    const summaryDeliveryMethod = document.getElementById('summaryDeliveryMethod');
    const summaryDeliveryTime = document.getElementById('summaryDeliveryTime');
    const summaryPaymentMethod = document.getElementById('summaryPaymentMethod');

    if (summaryDeliveryMethod) {
        summaryDeliveryMethod.textContent = deliveryMethod === 'delivery'
            ? 'Entrega em casa'
            : 'Retirada no mercado';
    }

    if (summaryDeliveryTime) {
        summaryDeliveryTime.textContent = deliveryMethod === 'delivery'
            ? 'Até 2h'
            : 'Disponível em até 45 min';
    }

    if (summaryPaymentMethod) {
        summaryPaymentMethod.textContent = getPaymentMethodLabel(method);
    }
}

function updatePayButtonText() {
    const payButton = document.getElementById('payButton');
    const mobilePayButton = document.getElementById('mobilePayButton');
    const mobileTotal = document.getElementById('mobileTotal');
    const method = getSelectedPaymentMethod();

    const labels = {
        pix: `Gerar pagamento PIX - ${formatCurrency(currentTotal)}`,
        credito: `Pagar com cartão de crédito - ${formatCurrency(currentTotal)}`,
        debito: `Pagar à vista no débito - ${formatCurrency(currentTotal)}`,
        entrega: `Confirmar pedido - ${formatCurrency(currentTotal)}`
    };

    const shortLabels = {
        pix: `Gerar PIX`,
        credito: `Pagar no crédito`,
        debito: `Pagar no débito`,
        entrega: `Confirmar pedido`
    };

    if (payButton) payButton.textContent = labels[method] || labels.pix;
    if (mobilePayButton) mobilePayButton.textContent = shortLabels[method] || shortLabels.pix;
    if (mobileTotal) mobileTotal.textContent = formatCurrency(currentTotal);

    updateCheckoutReview();
}

function updateTotal() {

    const deliveryMethod =
        document.querySelector(
            'input[name="deliveryMethod"]:checked'
        )?.value || "delivery";

    const deliveryFee =
        deliveryMethod === "delivery"
            ? ORDER_VALUES.deliveryFee
            : 0;

    currentTotal = Math.max(
        0,
        ORDER_VALUES.subtotal +
        deliveryFee -
        ORDER_VALUES.discount
    );

    document.getElementById("deliveryFeeValue")?.textContent =
        formatCurrency(deliveryFee);

    document.getElementById("discountValue")?.textContent =
        `- ${formatCurrency(ORDER_VALUES.discount)}`;

    document.getElementById("finalTotal")?.textContent =
        formatCurrency(currentTotal);

    const marketDeliveryInfo =
        document.getElementById("marketDeliveryInfo");

    if (marketDeliveryInfo) {
        marketDeliveryInfo.textContent =
            deliveryMethod === "delivery"
                ? `Entrega em até 2h • Taxa ${formatCurrency(deliveryFee)}`
                : "Retirada no mercado • Sem taxa de entrega";
    }

    updateInstallments();
    updatePayButtonText();
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
    const deliveryPaymentPanel = document.getElementById('deliveryPaymentPanel');
    const installmentGroup = document.getElementById('installmentGroup');
    const debitInfo = document.getElementById('debitInfo');
    const installments = document.getElementById('installments');

    document.querySelectorAll('.payment-method').forEach((card) => {
        const input = card.querySelector('input');
        card.classList.toggle('active', input.checked);
    });

    if (pixPanel) {
        pixPanel.hidden = method !== 'pix';
        pixPanel.classList.toggle('active', method === 'pix');
    }

    if (cardPanel) {
        const isCard = method === 'credito' || method === 'debito';
        cardPanel.hidden = !isCard;
        cardPanel.classList.toggle('active', isCard);
    }

    if (deliveryPaymentPanel) {
        deliveryPaymentPanel.hidden = method !== 'entrega';
        deliveryPaymentPanel.classList.toggle('active', method === 'entrega');
    }

    if (installmentGroup) {
        const showInstallments = method === 'credito';
        installmentGroup.hidden = !showInstallments;
        installmentGroup.style.display = showInstallments ? '' : 'none';
    }

    if (debitInfo) {
        const showDebitInfo = method === 'debito';
        debitInfo.hidden = !showDebitInfo;
        debitInfo.style.display = showDebitInfo ? '' : 'none';
    }

    // Débito é sempre à vista: força 1x e nunca exibe opções de parcelamento.
    if (method === 'debito' && installments) {
        installments.value = '1';
    }

    const gatewayMessage = method === 'entrega'
        ? 'Pedido será confirmado sem cobrança online. Pagamento será feito na entrega.'
        : 'Gateway ShopWise Pay pronto para processar a transação.';

    setGatewayStatus(gatewayMessage, '');
    clearCardErrors();
    updatePayButtonText();
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

function applyCoupon() {
    const couponInput = document.getElementById('couponCode');
    const feedback = document.getElementById('couponFeedback');
    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
        ORDER_VALUES.discount = 0;
        feedback.textContent = 'Digite um cupom para aplicar.';
        feedback.className = 'coupon-feedback-error';
        updateTotal();
        return;
    }

    if (!VALID_COUPONS[code]) {
        ORDER_VALUES.discount = 0;
        feedback.textContent = 'Cupom inválido ou expirado.';
        feedback.className = 'coupon-feedback-error';
        updateTotal();
        return;
    }

    ORDER_VALUES.discount = ORDER_VALUES.subtotal * VALID_COUPONS[code];
    feedback.textContent = `Cupom ${code} aplicado com sucesso.`;
    feedback.className = 'coupon-feedback-success';
    updateTotal();

    if (window.showToast) window.showToast('Cupom aplicado com sucesso!', 'success');
}

function setGatewayStatus(message, type) {
    const gatewayStatus = document.getElementById('gatewayStatus');
    if (!gatewayStatus) return;

    gatewayStatus.className = 'gateway-status';
    if (type) gatewayStatus.classList.add(type);

    gatewayStatus.textContent = message;
}

function getFieldErrorElement(field) {
    if (!field) return null;

    const wrapper = field.closest('.checkout-input-group') || field.parentElement;
    if (!wrapper) return null;

    let message = wrapper.querySelector('.field-error-message');
    if (!message) {
        message = document.createElement('small');
        message.className = 'field-error-message';
        wrapper.appendChild(message);
    }

    return message;
}

function setFieldError(field, message) {
    if (!field) return;

    field.classList.add('input-error');
    const messageElement = getFieldErrorElement(field);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
    }
}

function clearFieldError(field) {
    if (!field) return;

    field.classList.remove('input-error');
    const messageElement = getFieldErrorElement(field);
    if (messageElement) {
        messageElement.textContent = '';
        messageElement.style.display = 'none';
    }
}

function clearCardErrors() {
    document.querySelectorAll('.input-error').forEach((input) => {
        clearFieldError(input);
    });
}

function validateDeliveryData() {
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
    const addressInput = document.getElementById('deliveryAddress');

    clearFieldError(addressInput);

    if (deliveryMethod === 'delivery' && addressInput && !addressInput.value.trim()) {
        setFieldError(addressInput, 'Informe o endereço de entrega.');
        setGatewayStatus('Informe o endereço de entrega antes de continuar.', 'error');
        if (window.showToast) window.showToast('Informe o endereço de entrega antes de continuar.', 'error');
        addressInput.focus();
        return false;
    }

    return true;
}

function validateCardFields() {
    clearCardErrors();

    const cardName = document.getElementById('cardName');
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');
    const fields = [cardName, cardNumber, cardExpiry, cardCvv];
    let isValid = true;
    let firstInvalid = null;

    fields.forEach((field) => clearFieldError(field));

    if (!cardName?.value.trim()) {
        setFieldError(cardName, 'Digite o nome impresso no cartão.');
        firstInvalid = firstInvalid || cardName;
        isValid = false;
    }

    const onlyDigitsCard = cardNumber?.value.replace(/\D/g, '') || '';
    if (!onlyDigitsCard) {
        setFieldError(cardNumber, 'Digite o número do cartão.');
        firstInvalid = firstInvalid || cardNumber;
        isValid = false;
    } else if (onlyDigitsCard.length < 13) {
        setFieldError(cardNumber, 'Digite um número de cartão válido.');
        firstInvalid = firstInvalid || cardNumber;
        isValid = false;
    }

    const expiry = cardExpiry?.value.trim() || '';
    if (!expiry) {
        setFieldError(cardExpiry, 'Digite a validade do cartão.');
        firstInvalid = firstInvalid || cardExpiry;
        isValid = false;
    } else if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        setFieldError(cardExpiry, 'Use o formato MM/AA.');
        firstInvalid = firstInvalid || cardExpiry;
        isValid = false;
    }

    const onlyDigitsCvv = cardCvv?.value.replace(/\D/g, '') || '';
    if (!onlyDigitsCvv) {
        setFieldError(cardCvv, 'Digite o CVV.');
        firstInvalid = firstInvalid || cardCvv;
        isValid = false;
    } else if (onlyDigitsCvv.length < 3) {
        setFieldError(cardCvv, 'Digite um CVV válido.');
        firstInvalid = firstInvalid || cardCvv;
        isValid = false;
    }

    if (!isValid) {
        setGatewayStatus('Revise os campos destacados antes de continuar.', 'error');
        firstInvalid?.focus();
    }

    return isValid;
}

function buildPaymentPayload() {
    const method = getSelectedPaymentMethod();
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
    const installments = method === 'credito'
        ? Number(document.getElementById('installments')?.value || 1)
        : 1;

    const payload = {
        pedido: generateOrderNumber(),
        metodoPagamento: method,
        metodoRecebimento: deliveryMethod,
        valor: currentTotal,
        desconto: ORDER_VALUES.discount,
        parcelas: installments,
        observacoes: document.getElementById('orderNotes').value.trim(),
        gateway: method === 'entrega' ? 'Sem cobrança online' : 'ShopWise Pay Demo',
        criptografia: method === 'entrega' ? 'Não se aplica a cartão' : 'TLS/tokenização simulada'
    };

    if (method === 'credito' || method === 'debito') {
        const cardNumber = document.getElementById('cardNumber').value.replace(/\D/g, '');

        payload.cartao = {
            nome: document.getElementById('cardName').value.trim(),
            final: cardNumber.slice(-4),
            token: `tok_sw_${Math.random().toString(36).slice(2, 12)}`,
            tipo: method === 'credito' ? 'Crédito' : 'Débito à vista'
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

            // PIX e pagamento na entrega ficam aprovados na demo para facilitar apresentação.
            if (method === 'pix' || method === 'entrega') {
                status = 'aprovado';
            }

            resolve({
                status,
                orderNumber: payload.pedido,
                transactionId: method === 'entrega' ? 'PAGAMENTO-NA-ENTREGA' : `TX-${Date.now().toString().slice(-8)}`,
                method,
                total: payload.valor,
                installments: payload.parcelas,
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
    const mobilePayButton = document.getElementById('mobilePayButton');
    const method = getSelectedPaymentMethod();

    if (!validateDeliveryData()) return;
    if ((method === 'credito' || method === 'debito') && !validateCardFields()) {
        if (window.showToast) window.showToast('Revise os dados do cartão antes de continuar.', 'error');
        return;
    }

    const payload = buildPaymentPayload();

    if (payButton) payButton.disabled = true;
    if (mobilePayButton) mobilePayButton.disabled = true;

    const loadingTexts = {
        pix: 'Gerando PIX...',
        credito: 'Processando crédito...',
        debito: 'Processando débito à vista...',
        entrega: 'Confirmando pedido...'
    };

    if (payButton) payButton.textContent = loadingTexts[method] || 'Processando...';
    if (mobilePayButton) mobilePayButton.textContent = 'Aguarde...';

    const processingMessage = method === 'entrega'
        ? 'Enviando pedido ao supermercado para pagamento na entrega...'
        : 'Enviando transação criptografada para o gateway ShopWise Pay...';

    setGatewayStatus(processingMessage, 'processing');

    try {
        const response = await simulatePaymentGateway(payload);

        if (response.status === 'aprovado') {
            const successMessage = method === 'entrega'
                ? 'Pedido confirmado. Pagamento será realizado na entrega.'
                : 'Pagamento aprovado pelo gateway. Comprovante emitido.';

            setGatewayStatus(successMessage, 'success');
            if (window.showToast) window.showToast(successMessage, 'success');
            openReceipt(response);
        } else {
            setGatewayStatus('Pagamento recusado pelo gateway. Tente outro cartão ou método.', 'error');
            if (window.showToast) window.showToast('Pagamento recusado. Tente outro método.', 'error');
            openReceipt(response);
        }
    } catch (error) {
        setGatewayStatus('Não foi possível processar o pedido. Verifique a conexão e tente novamente.', 'error');
        if (window.showToast) window.showToast('Falha de conexão ao processar pedido.', 'error');
    } finally {
        if (payButton) payButton.disabled = false;
        if (mobilePayButton) mobilePayButton.disabled = false;
        updatePayButtonText();
    }
}

function openReceipt(response) {
    const approved = response.status === 'aprovado';
    const isDeliveryPayment = response.method === 'entrega';
    const modal = document.getElementById('paymentModal');
    const statusIcon = document.getElementById('receiptStatusIcon');

    statusIcon.textContent = approved ? '✓' : '!';
    statusIcon.classList.toggle('denied', !approved);

    document.getElementById('modalTitle').textContent = approved
        ? (isDeliveryPayment ? 'Pedido confirmado!' : 'Pagamento aprovado!')
        : 'Pagamento recusado';

    document.getElementById('modalSubtitle').textContent = approved
        ? (isDeliveryPayment
            ? 'Seu pedido foi enviado ao supermercado. O pagamento será feito na entrega.'
            : 'Seu pedido foi confirmado e enviado ao supermercado.')
        : 'A transação não foi autorizada. Tente novamente com outro método.';

    document.getElementById('receiptOrderNumber').textContent = response.orderNumber;
    document.getElementById('receiptTransaction').textContent = response.transactionId;
    document.getElementById('receiptMethod').textContent = getPaymentMethodLabel(response.method);
    document.getElementById('receiptTotal').textContent = formatCurrency(response.total);
    document.getElementById('receiptDate').textContent = response.date.toLocaleString('pt-BR');
    document.getElementById('receiptStatusText').textContent = approved
        ? (isDeliveryPayment ? 'Pedido Confirmado' : 'Pagamento Confirmado')
        : 'Pagamento Recusado';

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
        if (window.showToast) window.showToast('Código PIX copiado!', 'success');
    }).catch(() => {
        document.execCommand('copy');
        setGatewayStatus('Código PIX copiado.', 'success');
        if (window.showToast) window.showToast('Código PIX copiado!', 'success');
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

function startPixTimer() {
    const timer = document.getElementById('pixTimer');
    if (!timer) return;

    window.clearInterval(pixTimerInterval);
    pixSeconds = 10 * 60;

    pixTimerInterval = window.setInterval(() => {
        const minutes = Math.floor(pixSeconds / 60).toString().padStart(2, '0');
        const seconds = (pixSeconds % 60).toString().padStart(2, '0');
        timer.textContent = `Código válido por ${minutes}:${seconds}`;

        if (pixSeconds <= 0) {
            window.clearInterval(pixTimerInterval);
            timer.textContent = 'Código expirado. Atualize a tela para gerar outro PIX.';
            timer.classList.add('expired');
        }

        pixSeconds -= 1;
    }, 1000);
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

    document.getElementById('couponCode')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyCoupon();
        }
    });

    ['deliveryAddress', 'cardName', 'cardNumber', 'cardExpiry', 'cardCvv'].forEach((id) => {
        const field = document.getElementById(id);
        field?.addEventListener('input', () => clearFieldError(field));
    });

    applyMasks();
    startPixTimer();
    toggleAddressConfig();
    updatePaymentPanels();
    updateCheckoutReview();
    function carregarResumoPedido() {

        carrinho =
            JSON.parse(localStorage.getItem("carrinho")) || [];

        const container =
            document.getElementById("checkoutProducts");

        if (!container) return;

        container.innerHTML = "";

        if (carrinho.length === 0) {

            container.innerHTML = `
                <div class="summary-item">
                    <span>Carrinho vazio</span>
                    <span>R$ 0,00</span>
                </div>
            `;

            ORDER_VALUES.subtotal = 0;

            const subtotalElement =
                document.getElementById("subtotalValue");

            if (subtotalElement) {
                subtotalElement.textContent = "R$ 0,00";
            }

            updateTotal();
            return;
        }

        let subtotal = 0;

        carrinho.forEach(produto => {

            const preco = Number(
                String(produto.preco)
                    .replace("R$", "")
                    .replace(/\s/g, "")
                    .replace(",", ".")
            );

            const quantidade =
                Number(produto.quantidade || 1);

            const totalProduto =
                preco * quantidade;

            subtotal += totalProduto;

            container.innerHTML += `
                <div class="summary-item">
                    <span>
                        ${produto.nome} (x${quantidade})
                    </span>

                    <span>
                        ${totalProduto.toLocaleString(
                            "pt-BR",
                            {
                                style: "currency",
                                currency: "BRL"
                            }
                        )}
                    </span>
                </div>
            `;
        });

        ORDER_VALUES.subtotal = subtotal;

        document.getElementById("subtotalValue")?.textContent =
            subtotal.toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );

        updateTotal();
    }
});
