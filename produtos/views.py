from decimal import Decimal

from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.generics import get_object_or_404

from .models import (
    Supermercado,
    Produto,
    Cliente,
    Cupom,
    Pedido,
    ItemPedido,
    Pagamento,
    AlertaPreco,
    Notificacao,
    Avaliacao,
)

from .mercado_pago import (
    criar_order_pix,
    consultar_order_pix,
    MercadoPagoErro,
)
from .serializers import (
    SupermercadoSerializer,
    ProdutoSerializer,
    ClienteSerializer,
)


class SupermercadoList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        supermercados = Supermercado.objects.all()
        serializer = SupermercadoSerializer(supermercados, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SupermercadoSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class SupermercadoDetalhe(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        supermercado = get_object_or_404(Supermercado, pk=pk)
        serializer = SupermercadoSerializer(supermercado)
        return Response(serializer.data)

    def put(self, request, pk):
        supermercado = get_object_or_404(Supermercado, pk=pk)

        serializer = SupermercadoSerializer(
            supermercado,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        supermercado = get_object_or_404(Supermercado, pk=pk)
        supermercado.delete()
        return Response(status=204)


class ProdutoList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        supermercado_id = request.session.get('supermercado_id')

        if not supermercado_id:
            return Response(
                {'erro': 'Supermercado não autenticado.'},
                status=401
            )

        produtos = Produto.objects.filter(
            supermercado_id=supermercado_id
        )

        serializer = ProdutoSerializer(produtos, many=True)
        return Response(serializer.data)

    def post(self, request):
        supermercado_id = request.session.get('supermercado_id')

        if not supermercado_id:
            return Response(
                {'erro': 'Supermercado não autenticado.'},
                status=401
            )

        dados = request.data.copy()
        dados['supermercado'] = supermercado_id

        serializer = ProdutoSerializer(data=dados)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class ProdutoDetalhe(APIView):
    permission_classes = [AllowAny]

    def obter_produto(self, request, pk):
        supermercado_id = request.session.get('supermercado_id')

        if not supermercado_id:
            return None, Response(
                {'erro': 'Supermercado não autenticado.'},
                status=401
            )

        produto = get_object_or_404(
            Produto,
            pk=pk,
            supermercado_id=supermercado_id
        )

        return produto, None

    def get(self, request, pk):
        produto, erro = self.obter_produto(request, pk)

        if erro is not None:
            return erro

        serializer = ProdutoSerializer(produto)
        return Response(serializer.data)

    def put(self, request, pk):
        produto, erro = self.obter_produto(request, pk)

        if erro is not None:
            return erro

        preco_anterior = produto.preco

        dados = request.data.copy()
        dados['supermercado'] = request.session['supermercado_id']

        serializer = ProdutoSerializer(
            produto,
            data=dados
        )

        if serializer.is_valid():
            with transaction.atomic():
                produto_atualizado = serializer.save()

                preco_baixou = (
                    produto_atualizado.preco < preco_anterior
                )

                if preco_baixou:
                    alertas = (
                        AlertaPreco.objects
                        .select_for_update()
                        .filter(
                            produto=produto_atualizado,
                            ativo=True,
                            atingido=False,
                            preco_alvo__gte=produto_atualizado.preco
                        )
                        .select_related('cliente')
                    )

                    for alerta in alertas:
                        Notificacao.objects.create(
                            cliente=alerta.cliente,
                            alerta=alerta,
                            produto=produto_atualizado,
                            titulo='Preço baixou!',
                            mensagem=(
                                f'O produto {produto_atualizado.nome} '
                                f'chegou a R$ '
                                f'{produto_atualizado.preco:.2f}. '
                                f'Seu preço desejado era R$ '
                                f'{alerta.preco_alvo:.2f}.'
                            )
                        )

                        alerta.atingido = True
                        alerta.ativo = False

                        alerta.save(
                            update_fields=[
                                'atingido',
                                'ativo',
                                'atualizado_em',
                            ]
                        )

            return Response(
                ProdutoSerializer(
                    produto_atualizado
                ).data
            )

        return Response(
            serializer.errors,
            status=400
        )

    def delete(self, request, pk):
        produto, erro = self.obter_produto(request, pk)

        if erro is not None:
            return erro

        produto.delete()
        return Response(status=204)


class LoginSupermercado(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        senha = request.data.get('senha')

        if not email or not senha:
            return Response(
                {'erro': 'E-mail e senha são obrigatórios.'},
                status=400
            )

        supermercado = Supermercado.objects.filter(
            email_comercial__iexact=email
        ).first()

        if (
            not supermercado
            or not supermercado.verificar_senha(senha)
        ):
            return Response(
                {'erro': 'E-mail ou senha inválidos.'},
                status=401
            )

        request.session['supermercado_id'] = supermercado.id

        return Response({
            'mensagem': 'Login realizado com sucesso.',
            'supermercado': {
                'id': supermercado.id,
                'nome': supermercado.nome,
                'email': supermercado.email_comercial
            }
        })


class ClienteList(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        dados = request.data.copy()

        senha = dados.get('senha')
        confirma_senha = dados.pop('confirmasenha', None)

        if not senha:
            return Response(
                {'erro': 'A senha é obrigatória.'},
                status=400
            )

        if confirma_senha is not None and senha != confirma_senha:
            return Response(
                {'erro': 'As senhas não coincidem.'},
                status=400
            )

        serializer = ClienteSerializer(data=dados)

        if serializer.is_valid():
            cliente = serializer.save()

            return Response({
                'mensagem': 'Cliente cadastrado com sucesso.',
                'cliente': {
                    'id': cliente.id,
                    'nome': cliente.nome,
                    'email': cliente.email
                }
            }, status=201)

        return Response(serializer.errors, status=400)


class LoginCliente(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        senha = request.data.get('senha')

        if not email or not senha:
            return Response(
                {'erro': 'E-mail e senha são obrigatórios.'},
                status=400
            )

        cliente = Cliente.objects.filter(
            email__iexact=email
        ).first()

        if not cliente or not cliente.verificar_senha(senha):
            return Response(
                {'erro': 'E-mail ou senha inválidos.'},
                status=401
            )

        request.session['cliente_id'] = cliente.id

        return Response({
            'mensagem': 'Login realizado com sucesso.',
            'cliente': {
                'id': cliente.id,
                'nome': cliente.nome,
                'email': cliente.email
            }
        })


class FeedProdutos(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        produtos = Produto.objects.filter(
            supermercado__isnull=False
        ).select_related('supermercado').order_by('-criado_em')

        dados = []

        for produto in produtos:
            dados.append({
                'id': produto.id,
                'nome': produto.nome,
                'categoria': produto.categoria,
                'preco': str(produto.preco),
                'estoque': produto.estoque,
                'descricao': produto.descricao,
                'supermercado': {
                    'id': produto.supermercado.id,
                    'nome': produto.supermercado.nome,
                    'cidade': produto.supermercado.cidade,
                    'bairro': produto.supermercado.bairro,
                }
            })

        return Response(dados)


class CupomList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        agora = timezone.now()

        cupons = (
            Cupom.objects
            .filter(
                ativo=True,
                data_inicio__lte=agora,
                data_fim__gte=agora
            )
            .filter(
                Q(limite_uso__isnull=True) |
                Q(usos__lt=F('limite_uso'))
            )
            .order_by('data_fim', 'codigo')
        )

        dados = []

        for cupom in cupons:
            usos_restantes = None

            if cupom.limite_uso is not None:
                usos_restantes = max(cupom.limite_uso - cupom.usos, 0)

            dados.append({
                'id': cupom.id,
                'codigo': cupom.codigo,
                'descricao': cupom.descricao,
                'tipo': cupom.tipo,
                'valor': str(cupom.valor),
                'valor_minimo': str(cupom.valor_minimo),
                'data_inicio': cupom.data_inicio,
                'data_fim': cupom.data_fim,
                'usos_restantes': usos_restantes,
            })

        return Response(dados)


class PedidoList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response({'erro': 'Cliente não autenticado.'}, status=401)

        pedidos = (
            Pedido.objects
            .filter(cliente_id=cliente_id)
            .prefetch_related('itens')
            .order_by('-criado_em')
        )

        dados = []
        for pedido in pedidos:
            dados.append({
                'id': pedido.id,
                'tipo_entrega': pedido.tipo_entrega,
                'endereco_entrega': pedido.endereco_entrega,
                'observacoes': pedido.observacoes,
                'forma_pagamento': pedido.forma_pagamento,
                'subtotal': str(pedido.subtotal),
                'desconto': str(pedido.desconto),
                'taxa_entrega': str(pedido.taxa_entrega),
                'total': str(pedido.total),
                'status': pedido.status,
                'criado_em': pedido.criado_em,
                'itens': [
                    {
                        'produto_id': item.produto_id,
                        'nome': item.nome_produto,
                        'preco_unitario': str(item.preco_unitario),
                        'quantidade': item.quantidade,
                        'subtotal': str(item.subtotal),
                        'supermercado_id': item.supermercado_id,
                        'supermercado': item.supermercado.nome,
                    }
                    for item in pedido.itens.select_related('supermercado').all()
                ]
            })

        return Response(dados)

    def post(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response({'erro': 'Cliente não autenticado.'}, status=401)

        itens = request.data.get('itens', [])
        tipo_entrega = request.data.get('tipo_entrega')
        endereco_entrega = request.data.get('endereco_entrega', '').strip()
        observacoes = request.data.get('observacoes', '').strip()
        forma_pagamento = request.data.get('forma_pagamento')
        cupom = request.data.get('cupom', '').strip().upper()

        if not isinstance(itens, list) or not itens:
            return Response(
                {'erro': 'O pedido precisa ter pelo menos um produto.'},
                status=400
            )

        if tipo_entrega not in ['delivery', 'pickup']:
            return Response({'erro': 'Tipo de entrega inválido.'}, status=400)

        if tipo_entrega == 'delivery' and not endereco_entrega:
            return Response(
                {'erro': 'Informe o endereço de entrega.'},
                status=400
            )

        if forma_pagamento not in ['pix', 'credito', 'debito', 'entrega']:
            return Response(
                {'erro': 'Forma de pagamento inválida.'},
                status=400
            )

        try:
            with transaction.atomic():
                cliente = Cliente.objects.get(pk=cliente_id)
                produtos_pedido = []
                subtotal = Decimal('0.00')

                for item in itens:
                    produto_id = item.get('produto_id')
                    quantidade = item.get('quantidade')

                    try:
                        quantidade = int(quantidade)
                    except (TypeError, ValueError):
                        return Response({'erro': 'Quantidade inválida.'}, status=400)

                    if quantidade <= 0:
                        return Response(
                            {'erro': 'A quantidade deve ser maior que zero.'},
                            status=400
                        )

                    try:
                        produto = (
                            Produto.objects
                            .select_for_update()
                            .select_related('supermercado')
                            .get(pk=produto_id, supermercado__isnull=False)
                        )
                    except Produto.DoesNotExist:
                        return Response(
                            {'erro': f'Produto {produto_id} não encontrado.'},
                            status=404
                        )

                    if quantidade > produto.estoque:
                        return Response(
                            {
                                'erro': (
                                    f'Estoque insuficiente para {produto.nome}. '
                                    f'Disponível: {produto.estoque}.'
                                )
                            },
                            status=400
                        )

                    subtotal_item = produto.preco * quantidade
                    subtotal += subtotal_item

                    produtos_pedido.append({
                        'produto': produto,
                        'quantidade': quantidade,
                        'subtotal': subtotal_item,
                    })

                desconto = Decimal('0.00')
                cupom_obj = None

                if cupom:
                    agora = timezone.now()

                    cupom_obj = (
                        Cupom.objects
                        .select_for_update()
                        .filter(codigo__iexact=cupom)
                        .first()
                    )

                    if not cupom_obj:
                        return Response(
                            {'erro': 'Cupom não encontrado.'},
                            status=400
                        )

                    if not cupom_obj.ativo:
                        return Response(
                            {'erro': 'Este cupom está inativo.'},
                            status=400
                        )

                    if agora < cupom_obj.data_inicio:
                        return Response(
                            {'erro': 'Este cupom ainda não está válido.'},
                            status=400
                        )

                    if agora > cupom_obj.data_fim:
                        return Response(
                            {'erro': 'Este cupom expirou.'},
                            status=400
                        )

                    if (
                        cupom_obj.limite_uso is not None
                        and cupom_obj.usos >= cupom_obj.limite_uso
                    ):
                        return Response(
                            {'erro': 'O limite de uso deste cupom foi atingido.'},
                            status=400
                        )

                    if subtotal < cupom_obj.valor_minimo:
                        return Response(
                            {
                                'erro': (
                                    'Este cupom exige compra mínima de '
                                    f'R$ {cupom_obj.valor_minimo}.'
                                )
                            },
                            status=400
                        )

                    if cupom_obj.tipo == 'percentual':
                        desconto = (
                            subtotal
                            * (cupom_obj.valor / Decimal('100'))
                        )
                    else:
                        desconto = cupom_obj.valor

                    desconto = min(desconto, subtotal)

                desconto = desconto.quantize(Decimal('0.01'))
                taxa_entrega = Decimal('0.00')
                total = subtotal - desconto + taxa_entrega

                status_pedido = (
                    'aguardando_pagamento'
                    if forma_pagamento == 'pix'
                    else 'confirmado'
                )

                pedido = Pedido.objects.create(
                    cliente=cliente,
                    tipo_entrega=tipo_entrega,
                    endereco_entrega=(
                        endereco_entrega if tipo_entrega == 'delivery' else ''
                    ),
                    observacoes=observacoes,
                    forma_pagamento=forma_pagamento,
                    subtotal=subtotal,
                    desconto=desconto,
                    taxa_entrega=taxa_entrega,
                    total=total,
                    status=status_pedido
                )

                for item in produtos_pedido:
                    produto = item['produto']
                    quantidade = item['quantidade']

                    ItemPedido.objects.create(
                        pedido=pedido,
                        produto=produto,
                        supermercado=produto.supermercado,
                        nome_produto=produto.nome,
                        preco_unitario=produto.preco,
                        quantidade=quantidade,
                        subtotal=item['subtotal']
                    )

                    produto.estoque -= quantidade
                    produto.save(update_fields=['estoque'])

                if cupom_obj is not None:
                    cupom_obj.usos += 1
                    cupom_obj.save(update_fields=['usos'])

                dados_pagamento = None

                if forma_pagamento == 'pix':
                    primeiro_nome = (
                        cliente.nome.split()[0]
                        if cliente.nome
                        else ''
                    )

                    pix = criar_order_pix(
                        total=pedido.total,
                        referencia=f'SHOPWISE_PEDIDO_{pedido.id}',
                        email=cliente.email,
                        primeiro_nome=primeiro_nome,
                        modo_teste=True
                    )

                    if not pix.get('qr_code'):
                        raise MercadoPagoErro(
                            'O Mercado Pago não retornou o código PIX.'
                        )

                    pagamento = Pagamento.objects.create(
                        pedido=pedido,
                        provedor='mercado_pago',
                        forma_pagamento='pix',
                        order_id=pix.get('order_id'),
                        payment_id=pix.get('payment_id') or '',
                        status=(
                            pix.get('payment_status')
                            or pix.get('status')
                            or 'pendente'
                        ),
                        status_detail=(
                            pix.get('payment_status_detail')
                            or pix.get('status_detail')
                            or ''
                        ),
                        qr_code=pix.get('qr_code') or '',
                        qr_code_base64=pix.get('qr_code_base64') or '',
                        ticket_url=pix.get('ticket_url') or ''
                    )

                    dados_pagamento = {
                        'id': pagamento.id,
                        'order_id': pagamento.order_id,
                        'payment_id': pagamento.payment_id,
                        'status': pagamento.status,
                        'status_detail': pagamento.status_detail,
                        'qr_code': pagamento.qr_code,
                        'qr_code_base64': pagamento.qr_code_base64,
                        'ticket_url': pagamento.ticket_url,
                    }

                resposta = {
                    'mensagem': 'Pedido criado com sucesso.',
                    'pedido': {
                        'id': pedido.id,
                        'status': pedido.status,
                        'subtotal': str(pedido.subtotal),
                        'desconto': str(pedido.desconto),
                        'taxa_entrega': str(pedido.taxa_entrega),
                        'total': str(pedido.total),
                    }
                }

                if dados_pagamento is not None:
                    resposta['pagamento'] = dados_pagamento

                return Response(resposta, status=201)

        except Cliente.DoesNotExist:
            return Response({'erro': 'Cliente não encontrado.'}, status=404)

        except MercadoPagoErro as erro:
            return Response(
                {
                    'erro': (
                        'Não foi possível gerar o PIX: '
                        f'{erro}'
                    )
                },
                status=502
            )


class StatusPagamentoPix(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pedido_id):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        pedido = get_object_or_404(
            Pedido,
            pk=pedido_id,
            cliente_id=cliente_id
        )

        try:
            pagamento = pedido.pagamento
        except Pagamento.DoesNotExist:
            return Response(
                {'erro': 'Pagamento não encontrado.'},
                status=404
            )

        if pagamento.forma_pagamento != 'pix':
            return Response(
                {'erro': 'Este pedido não possui pagamento PIX.'},
                status=400
            )

        if not pagamento.order_id:
            return Response(
                {'erro': 'Order do Mercado Pago não encontrada.'},
                status=400
            )

        try:
            dados_mp = consultar_order_pix(
                pagamento.order_id
            )
        except MercadoPagoErro as erro:
            return Response(
                {
                    'erro': (
                        'Não foi possível consultar o PIX: '
                        f'{erro}'
                    )
                },
                status=502
            )

        status_order = dados_mp.get(
            'status',
            pagamento.status
        )

        detalhe_order = dados_mp.get(
            'status_detail',
            pagamento.status_detail
        )

        pagamentos = (
            dados_mp
            .get('transactions', {})
            .get('payments', [])
        )

        transacao = pagamentos[0] if pagamentos else {}

        status_transacao = transacao.get(
            'status',
            status_order
        )

        detalhe_transacao = transacao.get(
            'status_detail',
            detalhe_order
        )

        pagamento.status = status_transacao
        pagamento.status_detail = detalhe_transacao

        pagamento.save(
            update_fields=[
                'status',
                'status_detail',
                'atualizado_em',
            ]
        )

        pagamento_confirmado = (
            (
                status_order == 'processed'
                and detalhe_order == 'accredited'
            )
            or (
                status_transacao in ['processed', 'approved']
                and detalhe_transacao in [
                    'accredited',
                    'approved'
                ]
            )
        )

        if pagamento_confirmado:
            pedido.status = 'confirmado'
            pedido.save(
                update_fields=['status']
            )

        elif status_order in [
            'canceled',
            'expired',
            'failed'
        ]:
            pedido.status = 'cancelado'
            pedido.save(
                update_fields=['status']
            )

        return Response({
            'pedido_id': pedido.id,
            'pedido_status': pedido.status,
            'pagamento': {
                'status': pagamento.status,
                'status_detail': pagamento.status_detail,
                'order_status': status_order,
                'order_status_detail': detalhe_order,
            }
        })


class AlertaPrecoList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        alertas = (
            AlertaPreco.objects
            .filter(cliente_id=cliente_id)
            .select_related(
                'produto',
                'produto__supermercado'
            )
            .order_by('-criado_em')
        )

        dados = []

        for alerta in alertas:
            produto = alerta.produto

            dados.append({
                'id': alerta.id,
                'preco_alvo': str(alerta.preco_alvo),
                'ativo': alerta.ativo,
                'atingido': alerta.atingido,
                'criado_em': alerta.criado_em,
                'produto': {
                    'id': produto.id,
                    'nome': produto.nome,
                    'categoria': produto.categoria,
                    'preco_atual': str(produto.preco),
                    'estoque': produto.estoque,
                    'supermercado': (
                        produto.supermercado.nome
                        if produto.supermercado
                        else ''
                    ),
                }
            })

        return Response(dados)

    def post(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        produto_id = request.data.get('produto_id')
        preco_alvo = request.data.get('preco_alvo')

        if not produto_id:
            return Response(
                {'erro': 'Informe o produto.'},
                status=400
            )

        if preco_alvo in [None, '']:
            return Response(
                {'erro': 'Informe o preço desejado.'},
                status=400
            )

        try:
            preco_alvo = Decimal(str(preco_alvo))
        except Exception:
            return Response(
                {'erro': 'Preço desejado inválido.'},
                status=400
            )

        if preco_alvo <= 0:
            return Response(
                {
                    'erro': (
                        'O preço desejado deve ser '
                        'maior que zero.'
                    )
                },
                status=400
            )

        produto = get_object_or_404(
            Produto.objects.select_related(
                'supermercado'
            ),
            pk=produto_id
        )

        alerta, criado = AlertaPreco.objects.get_or_create(
            cliente_id=cliente_id,
            produto=produto,
            defaults={
                'preco_alvo': preco_alvo,
                'ativo': True,
                'atingido': False,
            }
        )

        if not criado:
            alerta.preco_alvo = preco_alvo
            alerta.ativo = True
            alerta.atingido = False
            alerta.save(
                update_fields=[
                    'preco_alvo',
                    'ativo',
                    'atingido',
                    'atualizado_em',
                ]
            )

        mensagem = (
            'Alerta criado com sucesso.'
            if criado
            else 'Alerta atualizado com sucesso.'
        )

        return Response(
            {
                'mensagem': mensagem,
                'alerta': {
                    'id': alerta.id,
                    'produto_id': produto.id,
                    'produto': produto.nome,
                    'preco_atual': str(produto.preco),
                    'preco_alvo': str(alerta.preco_alvo),
                    'ativo': alerta.ativo,
                }
            },
            status=201 if criado else 200
        )


class NotificacaoList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        notificacoes = (
            Notificacao.objects
            .filter(cliente_id=cliente_id)
            .select_related(
                'produto',
                'alerta'
            )
            .order_by('-criada_em')
        )

        dados = []

        for notificacao in notificacoes:
            dados.append({
                'id': notificacao.id,
                'titulo': notificacao.titulo,
                'mensagem': notificacao.mensagem,
                'lida': notificacao.lida,
                'criada_em': notificacao.criada_em,
                'produto_id': (
                    notificacao.produto.id
                    if notificacao.produto
                    else None
                ),
                'produto': (
                    notificacao.produto.nome
                    if notificacao.produto
                    else None
                ),
                'alerta_id': (
                    notificacao.alerta.id
                    if notificacao.alerta
                    else None
                ),
            })

        nao_lidas = notificacoes.filter(
            lida=False
        ).count()

        return Response({
            'nao_lidas': nao_lidas,
            'notificacoes': dados,
        })


class NotificacaoMarcarLida(APIView):
    permission_classes = [AllowAny]

    def post(self, request, notificacao_id):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        notificacao = get_object_or_404(
            Notificacao,
            pk=notificacao_id,
            cliente_id=cliente_id
        )

        notificacao.lida = True
        notificacao.save(
            update_fields=['lida']
        )

        return Response({
            'mensagem': 'Notificação marcada como lida.',
            'id': notificacao.id,
            'lida': notificacao.lida,
        })


class AvaliacaoList(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        avaliacoes = (
            Avaliacao.objects
            .filter(cliente_id=cliente_id)
            .select_related(
                'produto',
                'pedido',
                'item_pedido',
                'produto__supermercado'
            )
            .order_by('-criada_em')
        )

        itens_avaliaveis = (
            ItemPedido.objects
            .filter(
                pedido__cliente_id=cliente_id,
                pedido__status='concluido',
                avaliacao__isnull=True
            )
            .select_related(
                'pedido',
                'produto',
                'supermercado'
            )
            .order_by('-pedido__criado_em')
        )

        dados_avaliacoes = []

        for avaliacao in avaliacoes:
            dados_avaliacoes.append({
                'id': avaliacao.id,
                'pedido_id': avaliacao.pedido.id,
                'item_pedido_id': avaliacao.item_pedido.id,
                'produto_id': avaliacao.produto.id,
                'produto': avaliacao.produto.nome,
                'supermercado': (
                    avaliacao.produto.supermercado.nome
                    if avaliacao.produto.supermercado
                    else ''
                ),
                'nota': avaliacao.nota,
                'preco_correto': avaliacao.preco_correto,
                'entrega_ok': avaliacao.entrega_ok,
                'comentario': avaliacao.comentario,
                'criada_em': avaliacao.criada_em,
            })

        dados_itens = []

        for item in itens_avaliaveis:
            dados_itens.append({
                'item_pedido_id': item.id,
                'pedido_id': item.pedido.id,
                'produto_id': item.produto.id,
                'produto': item.nome_produto,
                'quantidade': item.quantidade,
                'preco_unitario': str(
                    item.preco_unitario
                ),
                'supermercado': item.supermercado.nome,
                'pedido_criado_em': item.pedido.criado_em,
            })

        return Response({
            'itens_avaliaveis': dados_itens,
            'avaliacoes': dados_avaliacoes,
        })

    def post(self, request):
        cliente_id = request.session.get('cliente_id')

        if not cliente_id:
            return Response(
                {'erro': 'Cliente não autenticado.'},
                status=401
            )

        item_pedido_id = request.data.get(
            'item_pedido_id'
        )

        nota = request.data.get('nota')

        preco_correto = request.data.get(
            'preco_correto',
            True
        )

        entrega_ok = request.data.get(
            'entrega_ok',
            True
        )

        comentario = request.data.get(
            'comentario',
            ''
        )

        if not item_pedido_id:
            return Response(
                {'erro': 'Informe o item do pedido.'},
                status=400
            )

        try:
            nota = int(nota)
        except (TypeError, ValueError):
            return Response(
                {'erro': 'Nota inválida.'},
                status=400
            )

        if nota < 1 or nota > 5:
            return Response(
                {
                    'erro': (
                        'A nota deve estar entre '
                        '1 e 5 estrelas.'
                    )
                },
                status=400
            )

        item = get_object_or_404(
            ItemPedido.objects.select_related(
                'pedido',
                'produto',
                'supermercado'
            ),
            pk=item_pedido_id,
            pedido__cliente_id=cliente_id
        )

        if item.pedido.status != 'concluido':
            return Response(
                {
                    'erro': (
                        'Só é possível avaliar produtos '
                        'de pedidos concluídos.'
                    )
                },
                status=400
            )

        if Avaliacao.objects.filter(
            item_pedido=item
        ).exists():
            return Response(
                {
                    'erro': (
                        'Este item já foi avaliado.'
                    )
                },
                status=400
            )

        avaliacao = Avaliacao.objects.create(
            cliente_id=cliente_id,
            pedido=item.pedido,
            item_pedido=item,
            produto=item.produto,
            nota=nota,
            preco_correto=bool(preco_correto),
            entrega_ok=bool(entrega_ok),
            comentario=str(comentario).strip()
        )

        return Response(
            {
                'mensagem': (
                    'Avaliação enviada com sucesso.'
                ),
                'avaliacao': {
                    'id': avaliacao.id,
                    'pedido_id': avaliacao.pedido.id,
                    'produto': avaliacao.produto.nome,
                    'nota': avaliacao.nota,
                    'preco_correto': (
                        avaliacao.preco_correto
                    ),
                    'entrega_ok': (
                        avaliacao.entrega_ok
                    ),
                    'comentario': (
                        avaliacao.comentario
                    ),
                }
            },
            status=201
        )
