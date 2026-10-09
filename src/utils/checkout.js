const ORDER_VALUES = {
    subtotal: 0,
    deliveryFee: 5.00,
    discount: 0.00
};

let carrinho = [];
let checkoutPronto = false;
let enviandoPedido = false;
let pedidoEnviado = false;
let appliedCouponCode = '';

function autenticacaoCheckout() {
    try { return JSON.parse(sessionStorage.getItem('shopwise_auth')); } catch { return null; }
}

async function conferirCheckout() {
    checkoutPronto = false;
    updatePayButtonText();
    const aviso = document.getElementById('checkoutNotice');
    aviso.hidden = false;
    const login = document.getElementById('checkoutLoginLink');
    login.hidden = true;
    const mercadoId = Number(sessionStorage.getItem('shopwise_checkout_mercado'));
    const itens = getCartItems();
    if (!itens.length || !mercadoId || itens.some((item) => Number(item.supermercadoId) !== mercadoId || !item.produtoId)) {
        aviso.textContent = 'Volte ao carrinho e escolha um supermercado com todos os produtos antes de confirmar.';
        return;
    }
    aviso.textContent = 'Conferindo preços e estoque do supermercado escolhido...';
    try {
        const resposta = await fetch('/api/carrinho/comparar/', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({itens: itens.map((item) => ({produto: item.produtoId, quantidade: item.quantidade}))})
        });
        if (!resposta.ok) throw new Error('Não foi possível conferir os preços. Atualize a página para tentar novamente.');
        const dados = await resposta.json();
        const mercado = dados.supermercados.find((item) => item.supermercado === mercadoId);
        if (!mercado?.completo) throw new Error('O supermercado não tem mais estoque suficiente. Volte ao carrinho e compare novamente.');
        for (const item of itens) {
            const atual = mercado.itens.find((produto) => produto.produto === Number(item.produtoId));
            item.preco = atual.preco_unitario;
            item.estoque = atual.estoque;
            item.supermercadoNome = mercado.supermercado_nome;
            item.supermercadoEndereco = mercado.supermercado_endereco;
        }
        localStorage.setItem('carrinho', JSON.stringify(itens));
        carregarResumoPedido();
        const auth = autenticacaoCheckout();
        if (auth?.tipo !== 'usuario' || !auth.token) {
            aviso.textContent = 'Entre como cliente para confirmar o pedido. Sua escolha e seu carrinho serão mantidos.';
            login.hidden = false;
            return;
        }
        checkoutPronto = true;
        aviso.textContent = '';
        aviso.hidden = true;
    } catch (erro) {
        aviso.textContent = ShopWiseMensagens.falha(erro);
    } finally {
        updatePayButtonText();
    }
}

const VALID_COUPONS = {
    SHOPWISE10: 0.10,
    ECONOMIA5: 0.05
};

let currentTotal = ORDER_VALUES.subtotal + ORDER_VALUES.deliveryFee - ORDER_VALUES.discount;
let pixTimerInterval = null;
let pixSeconds = 10 * 60;

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function parsePrice(value) {
    if (typeof value === "number") {
        return value;
    }

    const priceText = String(value || "")
        .replace("R$", "")
        .replace(/\s/g, "")
        .trim();

    const normalizedValue = priceText.includes(",")
        ? priceText.replace(/\./g, "").replace(",", ".")
        : priceText;

    return Number(normalizedValue) || 0;
}

function getCartItems() {
    try {
        const savedCart = JSON.parse(localStorage.getItem("carrinho"));
        return Array.isArray(savedCart) ? savedCart : [];
    } catch (error) {
        return [];
    }
}

function carregarResumoPedido() {
    carrinho = getCartItems();
    const summaryList = document.getElementById("checkoutPedidos");

    if (!summaryList) return;

    const mercados = [...new Set(carrinho.map((produto) => produto.supermercadoNome).filter(Boolean))];
    const nomesMercados = mercados.length ? mercados.join(' e ') : 'Supermercado';
    const descricaoRetirada = mercados.length > 1
        ? 'Grátis - retirada em cada supermercado'
        : `Grátis - ${nomesMercados}`;
    document.getElementById('pickupMarketDescription').textContent = descricaoRetirada;
    document.getElementById('pickupMarketName').textContent = nomesMercados;
    document.getElementById('reviewMarketName').textContent = nomesMercados;
    const enderecos = [...new Set(carrinho.map((produto) => produto.supermercadoEndereco).filter(Boolean))];
    document.getElementById('pickupMarketAddress').textContent = enderecos.length
        ? enderecos.join(' • ')
        : 'Consulte o endereço do supermercado cadastrado.';

    summaryList.replaceChildren();
    let subtotal = 0;

    if (carrinho.length === 0) {
        const linhaVazia = document.createElement('div');
        linhaVazia.className = 'summary-item';
        const mensagem = document.createElement('span');
        mensagem.textContent = 'Carrinho vazio';
        const valorVazio = document.createElement('span');
        valorVazio.textContent = formatCurrency(0);
        linhaVazia.append(mensagem, valorVazio);
        summaryList.append(linhaVazia);
        ORDER_VALUES.subtotal = 0;

        const subtotalValue = document.getElementById("subtotalValue");
        if (subtotalValue) {
            subtotalValue.textContent = formatCurrency(0);
        }
        updateTotal();
        return;
    }

    carrinho.forEach(produto => {
        const preco = parsePrice(produto.preco);
        const quantidade = Number(produto.quantidade) || 1;
        const totalItem = preco * quantidade;
        subtotal += totalItem;

        const linha = document.createElement('div');
        linha.className = 'summary-item product-summary';
        const info = document.createElement('div');
        info.className = 'product-summary-info';
        if (produto.img) {
            const imagem = document.createElement('img');
            imagem.src = produto.img;
            imagem.alt = produto.nome || 'Produto';
            imagem.className = 'product-summary-image';
            info.append(imagem);
        }
        const texto = document.createElement('div');
        const nome = document.createElement('strong');
        nome.textContent = produto.nome || 'Produto';
        const quantidadeTexto = document.createElement('small');
        quantidadeTexto.textContent = `Quantidade: ${quantidade}`;
        texto.append(nome, quantidadeTexto);
        info.append(texto);
        const valor = document.createElement('span');
        valor.textContent = formatCurrency(totalItem);
        linha.append(info, valor);
        summaryList.append(linha);
    });

    ORDER_VALUES.subtotal = subtotal;

    const subtotalValue = document.getElementById("subtotalValue");
    if (subtotalValue) {
        subtotalValue.textContent = formatCurrency(subtotal);
    }

    updateTotal();
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

    const labels = Object.fromEntries(['pix', 'credito', 'debito', 'entrega'].map((nome) =>
        [nome, `Confirmar pedido - ${formatCurrency(currentTotal)}`]));

    if (payButton) payButton.textContent = enviandoPedido ? 'Confirmando pedido...' : (labels[method] || labels.pix);
    if (mobilePayButton) mobilePayButton.textContent = 'Confirmar pedido';
    if (payButton) payButton.disabled = !checkoutPronto || enviandoPedido || pedidoEnviado;
    if (mobilePayButton) mobilePayButton.disabled = !checkoutPronto || enviandoPedido || pedidoEnviado;
    if (mobileTotal) mobileTotal.textContent = formatCurrency(currentTotal);

    updateCheckoutReview();
}

function updateTotal() {
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || "delivery";
    const deliveryFee = deliveryMethod === "delivery" ? ORDER_VALUES.deliveryFee : 0;

    const subtotalCentavos = Math.round(ORDER_VALUES.subtotal * 100);
    ORDER_VALUES.discount = appliedCouponCode ? Math.round(subtotalCentavos * VALID_COUPONS[appliedCouponCode]) / 100 : 0;
    currentTotal = (subtotalCentavos + Math.round(deliveryFee * 100) - Math.round(ORDER_VALUES.discount * 100)) / 100;

    const deliveryFeeValue = document.getElementById("deliveryFeeValue");
    const discountValue = document.getElementById("discountValue");
    const finalTotal = document.getElementById("finalTotal");

    if (deliveryFeeValue) {
        deliveryFeeValue.textContent = formatCurrency(deliveryFee);
    }
    if (discountValue) {
        discountValue.textContent = `- ${formatCurrency(ORDER_VALUES.discount)}`;
    }
    if (finalTotal) {
        finalTotal.textContent = formatCurrency(currentTotal);
    }

    const marketDeliveryInfo = document.getElementById("marketDeliveryInfo");
    if (marketDeliveryInfo) {
        marketDeliveryInfo.textContent = deliveryMethod === "delivery"
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
        : 'Pagamento demonstrativo para a apresentação do ShopWise.';

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

function applyCoupon(successMessage) {
    const couponInput = document.getElementById('couponCode');
    const feedback = document.getElementById('couponFeedback');

    if (!couponInput || !feedback) return false;

    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
        appliedCouponCode = '';
        ORDER_VALUES.discount = 0;
        feedback.textContent = 'Digite um cupom para aplicar.';
        feedback.className = 'coupon-feedback-error';
        updateTotal();
        return false;
    }

    if (!VALID_COUPONS[code]) {
        appliedCouponCode = '';
        ORDER_VALUES.discount = 0;
        feedback.textContent = 'Cupom inválido ou expirado.';
        feedback.className = 'coupon-feedback-error';
        updateTotal();
        return false;
    }

    appliedCouponCode = code;
    ORDER_VALUES.discount = Math.round(Math.round(ORDER_VALUES.subtotal * 100) * VALID_COUPONS[code]) / 100;

    feedback.textContent = successMessage || `Cupom ${code} aplicado com sucesso.`;
    feedback.className = 'coupon-feedback-success';

    updateTotal();

    if (window.showToast) {
        window.showToast(feedback.textContent, 'success');
    }

    return true;
}

function openCouponModal() {
    const modal = document.getElementById('couponModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function selectCoupon(code) {
    const couponInput = document.getElementById('couponCode');
    if (couponInput) {
        couponInput.value = code;
    }
    const applied = applyCoupon('Cupom adicionado com sucesso.');
    if (applied) {
        closeCouponModal();
    }
}

function closeCouponModal() {
    const modal = document.getElementById('couponModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
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

async function finalizarPedido() {
    if (!checkoutPronto || enviandoPedido || pedidoEnviado || !validateDeliveryData()) return;
    const auth = autenticacaoCheckout();
    if (!auth?.token || auth.tipo !== 'usuario') return;
    const payload = {
        supermercado: Number(sessionStorage.getItem('shopwise_checkout_mercado')),
        itens: carrinho.map(item => ({produto: Number(item.produtoId), quantidade: item.quantidade})),
        total_esperado: currentTotal.toFixed(2),
        recebimento: document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery',
        pagamento: getSelectedPaymentMethod(),
        endereco: document.getElementById('deliveryAddress').value.trim(),
        observacoes: document.getElementById('orderNotes').value.trim(),
        cupom: appliedCouponCode
    };
    const assinatura = JSON.stringify(payload);
    let tentativa;
    try { tentativa = JSON.parse(sessionStorage.getItem('shopwise_pedido_tentativa')); } catch {}
    if (tentativa?.assinatura !== assinatura) tentativa = {assinatura, chave: crypto.randomUUID()};
    sessionStorage.setItem('shopwise_pedido_tentativa', JSON.stringify(tentativa));
    payload.chave = tentativa.chave;
    enviandoPedido = true;
    updatePayButtonText();
    setGatewayStatus('Conferindo preços e estoque e salvando o pedido...', 'processing');
    try {
        const resposta = await fetch('/api/pedidos/', {
            method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Token ${auth.token}`},
            body: JSON.stringify(payload)
        });
        if (resposta.status >= 500) throw new Error(ShopWiseMensagens.servidor);
        const dados = await resposta.json();
        if (!resposta.ok) {
            if (resposta.status === 409) await conferirCheckout();
            if (resposta.status === 401) {
                checkoutPronto = false;
                sessionStorage.removeItem('shopwise_auth');
                document.getElementById('checkoutLoginLink').hidden = false;
                document.getElementById('checkoutNotice').hidden = false;
                document.getElementById('checkoutNotice').textContent = 'Sua sessão foi encerrada. Entre novamente para continuar. Seu carrinho foi mantido.';
                throw new Error('Entre novamente para confirmar o pedido. Seu carrinho foi mantido.');
            }
            throw new Error(ShopWiseMensagens.dados(dados, 'Revise os dados do pedido e tente novamente.'));
        }
        pedidoEnviado = true;
        localStorage.setItem('carrinho', '[]');
        sessionStorage.removeItem('shopwise_checkout_mercado');
        sessionStorage.removeItem('shopwise_pedido_tentativa');
        clearInterval(pixTimerInterval);
        setGatewayStatus('Pedido salvo e enviado ao supermercado. O pagamento é demonstrativo.', 'success');
        openReceipt(dados);
    } catch (erro) {
        setGatewayStatus(ShopWiseMensagens.falha(erro), 'error');
    } finally {
        enviandoPedido = false;
        updatePayButtonText();
    }
}

function openReceipt(pedido) {
    document.getElementById('receiptStatusIcon').textContent = '✓';
    document.getElementById('modalTitle').textContent = 'Pedido confirmado!';
    document.getElementById('modalSubtitle').textContent = `Enviado para ${pedido.supermercado_nome}. Acompanhe em Meus pedidos.`;
    document.getElementById('receiptOrderNumber').textContent = `SW-${String(pedido.id).padStart(6, '0')}`;
    document.getElementById('receiptTransaction').textContent = 'Demonstrativo — sem cobrança online';
    document.getElementById('receiptMethod').textContent = getPaymentMethodLabel(pedido.pagamento);
    document.getElementById('receiptTotal').textContent = formatCurrency(Number(pedido.total));
    document.getElementById('receiptDate').textContent = new Date(pedido.criado_em).toLocaleString('pt-BR');
    document.getElementById('receiptStatusText').textContent = pedido.status_nome;
    const modal = document.getElementById('paymentModal');
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
    document.getElementById('couponModal')?.addEventListener('click', (event) => {
        if (event.target.id === 'couponModal') {
            closeCouponModal();
        }
    });

    ['deliveryAddress', 'cardName', 'cardNumber', 'cardExpiry', 'cardCvv'].forEach((id) => {
        const field = document.getElementById(id);
        field?.addEventListener('input', () => clearFieldError(field));
    });
    carregarResumoPedido();
    applyMasks();
    startPixTimer();
    toggleAddressConfig();
    updatePaymentPanels();
    updateCheckoutReview();
    conferirCheckout();
});
