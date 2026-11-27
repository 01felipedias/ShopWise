(() => {
    'use strict';

    const listElement = document.getElementById('ordersList');
    const detailElement = document.getElementById('orderDetail');
    const searchInput = document.getElementById('orderSearch');
    const filterSelect = document.getElementById('orderFilter');
    const labels = {
        pendente: 'Pendente', aguardando_pagamento: 'Aguardando pagamento',
        confirmado: 'Confirmado', preparando: 'Em preparação', enviado: 'Saiu para entrega',
        concluido: 'Concluído', cancelado: 'Cancelado'
    };
    const progression = ['confirmado', 'preparando', 'enviado', 'concluido'];
    let orders = [];
    let selectedId = null;

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
    const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
    const statusLabel = value => labels[value] || value || 'Em andamento';

    function updateSummary() {
        document.getElementById('allCount').textContent = orders.length;
        document.getElementById('activeCount').textContent = orders.filter(order => !['concluido', 'cancelado'].includes(order.status)).length;
        document.getElementById('doneCount').textContent = orders.filter(order => order.status === 'concluido').length;
    }

    function visibleOrders() {
        const term = searchInput.value.trim().toLocaleLowerCase('pt-BR');
        const filter = filterSelect.value;
        return orders.filter(order => {
            const matchesFilter = filter === 'todos'
                || (filter === 'ativos' && !['concluido', 'cancelado'].includes(order.status))
                || order.status === filter;
            const matchesTerm = !term || String(order.id).includes(term)
                || String(order.cliente?.nome || '').toLocaleLowerCase('pt-BR').includes(term);
            return matchesFilter && matchesTerm;
        });
    }

    function renderList() {
        const visible = visibleOrders();
        document.getElementById('visibleCount').textContent = `${visible.length} ${visible.length === 1 ? 'pedido' : 'pedidos'}`;
        if (!visible.length) {
            listElement.innerHTML = `<p class="orders-empty">${orders.length ? 'Nenhum pedido corresponde à busca ou ao filtro.' : 'Sua loja ainda não recebeu pedidos.'}</p>`;
            if (selectedId && !orders.some(order => order.id === selectedId)) renderDetail(null);
            return;
        }
        listElement.innerHTML = visible.map(order => {
            const selected = Number(order.id) === Number(selectedId);
            return `<button class="orders-list-item${selected ? ' selected' : ''}" type="button" data-order-id="${escapeHtml(order.id)}" aria-pressed="${selected}">
                <span class="orders-row-top"><strong class="orders-number">Pedido ${String(order.id).padStart(5, '0')}</strong><span class="orders-date">${dateTime(order.criado_em)}</span></span>
                <span class="orders-row-bottom"><span class="orders-customer">${escapeHtml(order.cliente?.nome || 'Cliente')}</span><span class="orders-badge status-${escapeHtml(order.status)}">${escapeHtml(statusLabel(order.status))}</span></span>
                <span class="orders-row-bottom"><span class="orders-customer">${Number(order.itens?.length || 0)} produto(s)</span><strong class="orders-amount">${money(order.subtotal_supermercado)}</strong></span>
            </button>`;
        }).join('');
        listElement.querySelectorAll('[data-order-id]').forEach(button => button.addEventListener('click', () => {
            selectedId = Number(button.dataset.orderId);
            renderList();
            renderDetail(orders.find(order => Number(order.id) === selectedId));
        }));
    }

    function renderDetail(order) {
        if (!order) {
            detailElement.innerHTML =
                '<div class="orders-empty order-detail-empty">Selecione um pedido para ver os detalhes.</div>';
            return;
        }

        const statusIndex = progression.indexOf(order.status);

        const steps = [
            ['confirmado', 'Recebido', '✅'],
            ['preparando', 'Preparando', '📦'],
            ['enviado', 'Em entrega', '🚚'],
            ['concluido', 'Concluído', '🏠']
        ];

        const stepper = order.status === 'cancelado'
            ? '<p class="order-payment-note">Este pedido foi cancelado.</p>'
            : `
                <div class="order-status-steps">
                    ${steps.map(([key, title, icon], index) => {
                        let classe = '';

                        if (index < statusIndex) {
                            classe = ' complete';
                        } else if (index === statusIndex) {
                            classe = ' active';
                        }

                        return `
                            <div class="order-status-step${classe}">
                                <i>${icon}</i>
                                <span>${title}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

        const paymentPending =
            order.status === 'aguardando_pagamento' ||
            order.pagamento_status === 'pending';

        const canUpdate =
            !paymentPending &&
            !['cancelado', 'concluido'].includes(order.status);

        const nextStatus = {
            confirmado: 'preparando',
            preparando: 'enviado',
            enviado: 'concluido'
        }[order.status];

        const nextText = {
            preparando: 'Avançar para preparação',
            enviado: 'Marcar como saiu para entrega',
            concluido: 'Concluir pedido'
        }[nextStatus];

        const items = Array.isArray(order.itens)
            ? order.itens
            : [];

        const address =
            order.tipo_entrega === 'pickup'
                ? 'Retirada no supermercado'
                : (order.endereco_entrega || 'Endereço não informado');

        const payment = {
            pix: 'PIX',
            cartao: 'Cartão',
            dinheiro: 'Dinheiro'
        }[order.forma_pagamento] || order.forma_pagamento || '—';

        detailElement.innerHTML = `
            <header class="order-detail-header">
                <div>
                    <h2>Pedido ${String(order.id).padStart(5, '0')}</h2>
                    <p>
                        Recebido em ${dateTime(order.criado_em)}
                        · ${items.length} produto(s)
                    </p>
                </div>

                <strong class="order-detail-total">
                    ${money(order.subtotal_supermercado)}
                </strong>
            </header>

            ${stepper}

            ${paymentPending
                ? `
                    <p class="order-payment-note">
                        Aguardando a confirmação do pagamento.
                        As ações de preparo ficam disponíveis após a confirmação.
                    </p>
                `
                : ''
            }

            <section class="order-section">
                <h3>Produtos</h3>

                ${
                    items.length
                        ? items.map(item => `
                            <div class="order-item">
                                <span>
                                    ${escapeHtml(item.quantidade)}×
                                    ${escapeHtml(item.nome)}
                                </span>

                                <strong>
                                    ${money(item.subtotal)}
                                </strong>
                            </div>
                        `).join('')
                        : '<p class="orders-empty">Este pedido não possui itens.</p>'
                }
            </section>

            <section class="order-section">
                <h3>Dados do pedido</h3>

                <div class="order-meta">

                    <div>
                        <span>Cliente</span>
                        <strong>
                            ${escapeHtml(order.cliente?.nome || '—')}
                        </strong>
                    </div>

                    <div>
                        <span>Pagamento</span>
                        <strong>
                            ${escapeHtml(payment)}
                            ${
                                order.pagamento_status
                                    ? ` · ${escapeHtml(order.pagamento_status)}`
                                    : ''
                            }
                        </strong>
                    </div>

                    <div>
                        <span>Recebimento</span>
                        <strong>
                            ${
                                order.tipo_entrega === 'pickup'
                                    ? 'Retirada'
                                    : 'Entrega'
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            ${
                                order.tipo_entrega === 'pickup'
                                    ? 'Loja'
                                    : 'Endereço'
                            }
                        </span>

                        <strong>
                            ${escapeHtml(address)}
                        </strong>
                    </div>

                    <div>
                        <span>E-mail</span>
                        <strong>
                            ${escapeHtml(order.cliente?.email || '—')}
                        </strong>
                    </div>

                    <div>
                        <span>CEP do cliente</span>
                        <strong>
                            ${escapeHtml(order.cliente?.cep || '—')}
                        </strong>
                    </div>

                </div>

                ${
                    order.observacoes
                        ? `
                            <p class="order-notes">
                                <strong>Observações:</strong>
                                ${escapeHtml(order.observacoes)}
                            </p>
                        `
                        : ''
                }
            </section>

            <div class="order-actions">

                ${
                    canUpdate && nextStatus
                        ? `
                            <button
                                class="order-action-button"
                                type="button"
                                id="advanceOrder"
                            >
                                ${nextText}
                            </button>
                        `
                        : ''
                }

                ${
                    canUpdate
                        ? `
                            <button
                                class="order-action-button secondary"
                                type="button"
                                id="cancelOrder"
                            >
                                Cancelar pedido
                            </button>
                        `
                        : ''
                }

            </div>
        `;

        document
            .getElementById('advanceOrder')
            ?.addEventListener(
                'click',
                () => updateStatus(order, nextStatus)
            );

        document
            .getElementById('cancelOrder')
            ?.addEventListener('click', async () => {

                const confirmed = await window.showConfirm(
                    `O pedido ${order.id} será cancelado. Essa ação não pode ser desfeita.`,
                    {
                        title: 'Cancelar pedido?',
                        confirmText: 'Cancelar pedido',
                        danger: true
                    }
                );

                if (confirmed) {
                    await updateStatus(order, 'cancelado');
                }
            });
    }

    async function updateStatus(order, status) {
        const buttons = detailElement.querySelectorAll('button');
        buttons.forEach(button => { button.disabled = true; });
        try {
            const response = await shopwiseFetch(`/api/pedidos-supermercado/${order.id}/status/`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
            });
            const data = await response.json().catch(() => ({}));
            if (response.status === 401 || response.status === 403) {
                window.location.replace('login-supermercado.html');
                return;
            }
            if (!response.ok) throw new Error(data.erro || 'Não foi possível atualizar o pedido.');
            order.status = data.status;
            updateSummary();
            renderList();
            renderDetail(order);
        } catch (error) {
            buttons.forEach(button => { button.disabled = false; });
            window.showToast(error.message || 'Falha ao atualizar o pedido.', 'error');
        }
    }

    async function loadOrders() {
        try {
            const response = await shopwiseFetch('/api/pedidos-supermercado/');
            if (response.status === 401 || response.status === 403) {
                window.location.replace('login-supermercado.html');
                return;
            }
            const data = await response.json().catch(() => []);
            if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar os pedidos.');
            orders = Array.isArray(data) ? data : [];
            updateSummary();
            if (!orders.some(order => Number(order.id) === Number(selectedId))) selectedId = orders.length ? Number(orders[0].id) : null;
            renderList();
            renderDetail(orders.find(order => Number(order.id) === Number(selectedId)) || null);
        } catch (error) {
            listElement.innerHTML = '<p class="orders-empty">Não foi possível carregar os pedidos. Atualize a página para tentar novamente.</p>';
            window.showToast(error.message, 'error');
        }
    }

    searchInput.addEventListener('input', renderList);
    filterSelect.addEventListener('change', renderList);
    loadOrders();
})();
