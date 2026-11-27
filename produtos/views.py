from django.middleware.csrf import rotate_token
from .csrf import assinatura_sessao

from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q, F, Avg, Count
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import get_object_or_404
from rest_framework.authtoken.models import Token
from rest_framework.authentication import (
    TokenAuthentication,
    SessionAuthentication,
)

from .permissions import (
    SupermercadoAutenticado,
    ClienteAutenticado,
)

from .models import (
    Supermercado,
    Produto,
    Cliente,
    Cupom,
    Pedido,
    ItemPedido,
    PedidoPorSupermercado,
    Pagamento,
    AlertaPreco,
    Notificacao,
    Avaliacao,
    AvaliacaoSupermercado,
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
        supermercados = Supermercado.objects.values(
            'id',
            'nome',
            'cidade',
            'estado',
            'bairro'
        )

        return Response(list(supermercados))

    def post(self, request):
        serializer = SupermercadoSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class SupermercadoDetalhe(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def obter_supermercado(self, request, pk):
        usuario_esperado = f'supermercado_{pk}'

        if request.user.username != usuario_esperado:
            return None, Response(
                {
                    'erro': 'Você não tem permissão para acessar este supermercado.'
                },
                status=403
            )

        supermercado = get_object_or_404(
            Supermercado,
            pk=pk
        )

        return supermercado, None

    def get(self, request, pk):
        supermercado, erro = self.obter_supermercado(
            request,
            pk
        )

        if erro is not None:
            return erro

        serializer = SupermercadoSerializer(
            supermercado
        )

        return Response(serializer.data)

    def put(self, request, pk):
        supermercado, erro = self.obter_supermercado(
            request,
            pk
        )

        if erro is not None:
            return erro

        serializer = SupermercadoSerializer(
            supermercado,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data
            )

        return Response(
            serializer.errors,
            status=400
        )

    def delete(self, request, pk):
        supermercado, erro = self.obter_supermercado(
            request,
            pk
        )

        if erro is not None:
            return erro

        supermercado.delete()

        return Response(
            status=204
        )




class ProdutoList(APIView):
    authentication_classes = [
        TokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [SupermercadoAutenticado]

    def get(self, request):
        supermercado_id = request.supermercado_id

        produtos = Produto.objects.filter(
            supermercado_id=supermercado_id
        )

        serializer = ProdutoSerializer(produtos, many=True)

        return Response(serializer.data)

    def post(self, request):
        supermercado_id = request.supermercado_id

        dados = request.data.copy()
        dados['supermercado'] = supermercado_id

        serializer = ProdutoSerializer(data=dados)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)



class ProdutoDetalhe(APIView):
    authentication_classes = [
        TokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [SupermercadoAutenticado]

    def obter_produto(self, request, pk):
        supermercado_id = request.supermercado_id

        produto = get_object_or_404(
            Produto,
            pk=pk,
            supermercado_id=supermercado_id
        )

        return produto

    def get(self, request, pk):
        produto = self.obter_produto(request, pk)

        serializer = ProdutoSerializer(produto)

        return Response(serializer.data)

    def put(self, request, pk):
        produto = self.obter_produto(request, pk)

        preco_anterior = produto.preco

        dados = request.data.copy()
        dados['supermercado'] = request.supermercado_id

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
        produto = self.obter_produto(request, pk)

        produto.delete()

        return Response(status=204)


class LoginSupermercado(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        senha = request.data.get('senha')

        if not email or not senha:
            return Response(
                {
                    'erro': 'E-mail e senha são obrigatórios.'
                },
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
                {
                    'erro': 'E-mail ou senha inválidos.'
                },
                status=401
            )

        # Mantém a autenticação por sessão que já existia
        if getattr(request, 'shopwise_browser_login', False):
            request.session.flush()
            request.session['supermercado_id'] = supermercado.id
            request.session['shopwise_auth_hash'] = assinatura_sessao('supermercado', supermercado)
            rotate_token(request._request)

        # Cria um usuário do Django para representar
        # este supermercado no sistema de AuthToken
        usuario_token, criado = User.objects.get_or_create(
            username=f'supermercado_{supermercado.id}',
            defaults={
                'email': supermercado.email_comercial
            }
        )

        if criado:
            usuario_token.set_unusable_password()
            usuario_token.save()

        # Cria o token caso ainda não exista
        token, _ = Token.objects.get_or_create(
            user=usuario_token
        )

        return Response({
            'mensagem': 'Login realizado com sucesso.',
            'token': token.key,
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
                {
                    'erro': 'A senha é obrigatória.'
                },
                status=400
            )

        if (
            confirma_senha is not None
            and senha != confirma_senha
        ):
            return Response(
                {
                    'erro': 'As senhas não coincidem.'
                },
                status=400
            )

        serializer = ClienteSerializer(data=dados)

        if serializer.is_valid():
            cliente = serializer.save()

            return Response(
                {
                    'mensagem': 'Cliente cadastrado com sucesso.',
                    'cliente': {
                        'id': cliente.id,
                        'nome': cliente.nome,
                        'email': cliente.email
                    }
                },
                status=201
            )

        return Response(
            serializer.errors,
            status=400
        )


class LoginCliente(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        senha = request.data.get('senha')

        if not email or not senha:
            return Response(
                {
                    'erro': 'E-mail e senha são obrigatórios.'
                },
                status=400
            )

        cliente = Cliente.objects.filter(
            email__iexact=email
        ).first()

        if (
            not cliente
            or not cliente.verificar_senha(senha)
        ):
            return Response(
                {
                    'erro': 'E-mail ou senha inválidos.'
                },
                status=401
            )

        # Mantém a autenticação por sessão
        if getattr(request, 'shopwise_browser_login', False):
            request.session.flush()
            request.session['cliente_id'] = cliente.id
            request.session['shopwise_auth_hash'] = assinatura_sessao('cliente', cliente)
            rotate_token(request._request)

        # Cria um usuário Django para representar o cliente
        usuario_token, criado = User.objects.get_or_create(
            username=f'cliente_{cliente.id}',
            defaults={
                'email': cliente.email
            }
        )

        if criado:
            usuario_token.set_unusable_password()
            usuario_token.save()

        # Cria ou recupera o AuthToken
        token, _ = Token.objects.get_or_create(
            user=usuario_token
        )

        return Response({
            'mensagem': 'Login realizado com sucesso.',
            'token': token.key,
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
        ).select_related('supermercado').annotate(
            media_avaliacoes=Avg('avaliacoes__nota'),
            total_avaliacoes=Count('avaliacoes')
        ).order_by('-criado_em')

        avaliacoes_lojas = {
            item['supermercado_id']: item
            for item in AvaliacaoSupermercado.objects
            .values('supermercado_id')
            .annotate(media=Avg('nota'), total=Count('id'))
        }

        dados = []

        for produto in produtos:
            dados.append({
                'id': produto.id,
                'nome': produto.nome,
                'tamanho_embalagem': produto.tamanho_embalagem,
                'categoria': produto.categoria,
                'preco': str(produto.preco),
                'estoque': produto.estoque,
                'descricao': produto.descricao,
                'media_avaliacoes': (
                    round(produto.media_avaliacoes, 2)
                    if produto.media_avaliacoes is not None
                    else None
                ),
                'total_avaliacoes': produto.total_avaliacoes,
                'supermercado': {
                    'id': produto.supermercado.id,
                    'nome': produto.supermercado.nome,
                    'cidade': produto.supermercado.cidade,
                    'bairro': produto.supermercado.bairro,
                    'media_avaliacoes': (
                        round(avaliacoes_lojas[produto.supermercado_id]['media'], 2)
                        if produto.supermercado_id in avaliacoes_lojas
                        else None
                    ),
                    'total_avaliacoes': avaliacoes_lojas.get(
                        produto.supermercado_id, {}
                    ).get('total', 0),
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
            .select_related('supermercado')
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
                'supermercado_id': cupom.supermercado_id,
                'supermercado': (
                    cupom.supermercado.nome
                    if cupom.supermercado
                    else None
                ),
            })

        return Response(dados)


def serializar_cupom(cupom):
    usos_restantes = None
    if cupom.limite_uso is not None:
        usos_restantes = max(cupom.limite_uso - cupom.usos, 0)

    return {
        'id': cupom.id,
        'codigo': cupom.codigo,
        'descricao': cupom.descricao,
        'tipo': cupom.tipo,
        'valor': str(cupom.valor),
        'valor_minimo': str(cupom.valor_minimo),
        'data_inicio': cupom.data_inicio,
        'data_fim': cupom.data_fim,
        'ativo': cupom.ativo,
        'limite_uso': cupom.limite_uso,
        'usos': cupom.usos,
        'usos_restantes': usos_restantes,
        'supermercado_id': cupom.supermercado_id,
    }


class CupomGerenciamento(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [SupermercadoAutenticado]

    campos = (
        'codigo',
        'descricao',
        'tipo',
        'valor',
        'valor_minimo',
        'data_inicio',
        'data_fim',
        'ativo',
        'limite_uso',
    )

    def get_queryset(self, request):
        return Cupom.objects.filter(
            supermercado_id=request.supermercado_id
        ).order_by('-criado_em', 'codigo')

    def get(self, request):
        return Response([
            serializar_cupom(cupom)
            for cupom in self.get_queryset(request)
        ])

    def post(self, request):
        return self._salvar(request)

    def put(self, request, cupom_id):
        return self._salvar(request, cupom_id=cupom_id)

    def patch(self, request, cupom_id):
        return self._salvar(request, cupom_id=cupom_id)

    def delete(self, request, cupom_id):
        cupom = get_object_or_404(
            self.get_queryset(request),
            pk=cupom_id
        )
        cupom.ativo = False
        cupom.save(update_fields=['ativo'])
        return Response({
            'mensagem': 'Cupom desativado com sucesso.',
            'id': cupom.id,
            'ativo': False,
        })

    def _salvar(self, request, cupom_id=None):
        if not hasattr(request.data, 'items'):
            return Response({'erro': 'Envie os dados do cupom em um objeto.'}, status=400)

        cupom = None
        if cupom_id is not None:
            cupom = get_object_or_404(
                self.get_queryset(request),
                pk=cupom_id
            )

        valores = {
            campo: getattr(cupom, campo, None)
            for campo in self.campos
        }
        valores.update(request.data)

        codigo = str(valores.get('codigo') or '').strip().upper()
        descricao = str(valores.get('descricao') or '').strip()
        tipo = str(valores.get('tipo') or 'percentual').strip()

        if not codigo:
            return Response({'erro': 'Informe o código do cupom.'}, status=400)
        if len(codigo) > 50:
            return Response({'erro': 'O código pode ter até 50 caracteres.'}, status=400)
        if tipo not in dict(Cupom.TIPO_CHOICES):
            return Response({'erro': 'Tipo de desconto inválido.'}, status=400)

        try:
            valor = Decimal(str(valores.get('valor')))
            valor_minimo = Decimal(str(valores.get('valor_minimo') or '0'))
        except (InvalidOperation, ValueError, TypeError):
            return Response({'erro': 'Informe valores numéricos válidos.'}, status=400)

        if not valor.is_finite() or not valor_minimo.is_finite():
            return Response({'erro': 'Informe valores numéricos válidos.'}, status=400)
        if valor <= 0:
            return Response({'erro': 'O desconto deve ser maior que zero.'}, status=400)
        if valor_minimo < 0:
            return Response({'erro': 'A compra mínima não pode ser negativa.'}, status=400)
        if valor >= Decimal('100000000') or valor_minimo >= Decimal('100000000'):
            return Response({'erro': 'Os valores devem ser inferiores a R$ 100.000.000,00.'}, status=400)
        try:
            if valor != valor.quantize(Decimal('0.01')) or valor_minimo != valor_minimo.quantize(Decimal('0.01')):
                return Response({'erro': 'Os valores devem ter no máximo duas casas decimais.'}, status=400)
        except InvalidOperation:
            return Response({'erro': 'Informe valores numéricos válidos.'}, status=400)
        if tipo == 'percentual' and valor > 100:
            return Response({'erro': 'O desconto percentual deve ser de até 100%.'}, status=400)

        inicio_raw = valores.get('data_inicio')
        fim_raw = valores.get('data_fim')
        try:
            inicio = parse_datetime(str(inicio_raw)) if inicio_raw else None
            fim = parse_datetime(str(fim_raw)) if fim_raw else None
        except (TypeError, ValueError):
            inicio = fim = None
        if inicio is None or fim is None:
            return Response({'erro': 'Informe datas de início e fim válidas.'}, status=400)
        if timezone.is_naive(inicio):
            inicio = timezone.make_aware(inicio, timezone.get_current_timezone())
        if timezone.is_naive(fim):
            fim = timezone.make_aware(fim, timezone.get_current_timezone())
        if fim <= inicio:
            return Response({'erro': 'A data final deve ser posterior à data inicial.'}, status=400)

        limite_raw = valores.get('limite_uso')
        if limite_raw in (None, ''):
            limite_uso = None
        else:
            try:
                limite_uso = int(limite_raw)
            except (TypeError, ValueError):
                return Response({'erro': 'O limite de uso deve ser um número inteiro.'}, status=400)
            if limite_uso < 1:
                return Response({'erro': 'O limite de uso deve ser maior que zero.'}, status=400)

        ativo_raw = valores.get('ativo')
        if ativo_raw is None:
            ativo_raw = True
        if isinstance(ativo_raw, bool):
            ativo = ativo_raw
        elif str(ativo_raw).lower() in ('true', '1', 'sim'):
            ativo = True
        elif str(ativo_raw).lower() in ('false', '0', 'nao', 'não'):
            ativo = False
        else:
            return Response({'erro': 'O estado ativo do cupom é inválido.'}, status=400)

        duplicado = Cupom.objects.filter(codigo__iexact=codigo)
        if cupom is not None:
            duplicado = duplicado.exclude(pk=cupom.pk)
        if duplicado.exists():
            return Response({'erro': 'Já existe um cupom com esse código.'}, status=400)

        campos_atualizados = {
            'codigo': codigo,
            'descricao': descricao,
            'tipo': tipo,
            'valor': valor,
            'valor_minimo': valor_minimo,
            'data_inicio': inicio,
            'data_fim': fim,
            'ativo': ativo,
            'limite_uso': limite_uso,
        }

        if cupom is None:
            cupom = Cupom.objects.create(
                supermercado_id=request.supermercado_id,
                **campos_atualizados
            )
            status = 201
        else:
            for campo, valor_campo in campos_atualizados.items():
                setattr(cupom, campo, valor_campo)
            cupom.save(update_fields=list(campos_atualizados.keys()))
            status = 200

        return Response(serializar_cupom(cupom), status=status)


def resumo_status_pedido(status_pagamento, subpedidos):
    status_lojas = [subpedido.status for subpedido in subpedidos]
    if not status_lojas:
        return status_pagamento

    if status_pagamento == 'aguardando_pagamento':
        return status_pagamento

    if len(set(status_lojas)) == 1:
        return status_lojas[0]

    finais = {'concluido', 'cancelado'}
    if all(status in finais for status in status_lojas):
        return 'parcialmente_finalizado'

    return 'em_andamento'


class PedidoList(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def get(self, request):
        cliente_id = request.cliente_id

        pedidos = (
            Pedido.objects
            .filter(cliente_id=cliente_id)
            .prefetch_related(
                'itens__supermercado',
                'subpedidos__supermercado'
            )
            .order_by('-criado_em')
        )

        pedidos_lista = list(pedidos)
        avaliacoes_enviadas = set(
            AvaliacaoSupermercado.objects
            .filter(cliente_id=cliente_id)
            .values_list('pedido_id', 'supermercado_id')
        )

        dados = []
        for pedido in pedidos_lista:
            subpedidos = list(pedido.subpedidos.all())
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
                'status': resumo_status_pedido(pedido.status, subpedidos),
                'status_pagamento': pedido.status,
                'criado_em': pedido.criado_em,
                'supermercados': [
                    {
                        'id': subpedido.supermercado_id,
                        'nome': subpedido.supermercado.nome,
                        'status': subpedido.status,
                        'avaliado': (
                            pedido.id,
                            subpedido.supermercado_id
                        ) in avaliacoes_enviadas,
                        'subtotal': str(sum(
                            (
                                item.subtotal
                                for item in pedido.itens.all()
                                if item.supermercado_id == subpedido.supermercado_id
                            ),
                            Decimal('0.00')
                        )),
                    }
                    for subpedido in subpedidos
                ],
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
        cliente_id = request.cliente_id

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
                subtotais_por_supermercado = {}

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
                    subtotais_por_supermercado[produto.supermercado_id] = (
                        subtotais_por_supermercado.get(
                            produto.supermercado_id,
                            Decimal('0.00')
                        ) + subtotal_item
                    )

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

                    subtotal_elegivel = subtotal
                    if cupom_obj.supermercado_id is not None:
                        subtotal_elegivel = subtotais_por_supermercado.get(
                            cupom_obj.supermercado_id,
                            Decimal('0.00')
                        )
                        if subtotal_elegivel <= 0:
                            return Response(
                                {'erro': 'Este cupom não se aplica aos produtos do carrinho.'},
                                status=400
                            )

                    if subtotal_elegivel < cupom_obj.valor_minimo:
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
                            subtotal_elegivel
                            * (cupom_obj.valor / Decimal('100'))
                        )
                    else:
                        desconto = cupom_obj.valor

                    desconto = min(desconto, subtotal_elegivel)

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

                PedidoPorSupermercado.objects.bulk_create([
                    PedidoPorSupermercado(
                        pedido=pedido,
                        supermercado_id=supermercado_id,
                        status=status_pedido
                    )
                    for supermercado_id in subtotais_por_supermercado
                ])

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
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def get(self, request, pedido_id):
        cliente_id = request.cliente_id

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
            PedidoPorSupermercado.objects.filter(
                pedido=pedido,
                status='aguardando_pagamento'
            ).update(status='confirmado')
            pedido.status = 'confirmado'
            pedido.save(
                update_fields=['status']
            )

        elif status_order in [
            'canceled',
            'expired',
            'failed'
        ]:
            PedidoPorSupermercado.objects.filter(
                pedido=pedido
            ).update(status='cancelado')
            pedido.status = 'cancelado'
            pedido.save(
                update_fields=['status']
            )

        return Response({
            'pedido_id': pedido.id,
            'pedido_status': resumo_status_pedido(
                pedido.status,
                list(pedido.subpedidos.all())
            ),
            'status_pagamento': pedido.status,
            'pagamento': {
                'status': pagamento.status,
                'status_detail': pagamento.status_detail,
                'order_status': status_order,
                'order_status_detail': detalhe_order,
            }
        })


class AlertaPrecoList(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def get(self, request):
        cliente_id = request.cliente_id

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
        cliente_id = request.cliente_id

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

    def put(self, request, alerta_id):
        return self._atualizar(request, alerta_id)

    def patch(self, request, alerta_id):
        return self._atualizar(request, alerta_id)

    def delete(self, request, alerta_id):
        alerta = get_object_or_404(
            AlertaPreco,
            pk=alerta_id,
            cliente_id=request.cliente_id
        )
        alerta.ativo = False
        alerta.save(update_fields=['ativo', 'atualizado_em'])
        return Response({
            'mensagem': 'Alerta desativado com sucesso.',
            'id': alerta.id,
            'ativo': False,
        })

    def _atualizar(self, request, alerta_id):
        alerta = get_object_or_404(
            AlertaPreco,
            pk=alerta_id,
            cliente_id=request.cliente_id
        )

        if 'preco_alvo' in request.data:
            try:
                preco_alvo = Decimal(str(request.data.get('preco_alvo')))
            except (InvalidOperation, ValueError, TypeError):
                return Response({'erro': 'Preço desejado inválido.'}, status=400)
            if not preco_alvo.is_finite() or preco_alvo <= 0:
                return Response({'erro': 'O preço desejado deve ser maior que zero.'}, status=400)
            if preco_alvo >= Decimal('100000000'):
                return Response({'erro': 'O preço desejado é muito alto.'}, status=400)
            try:
                if preco_alvo != preco_alvo.quantize(Decimal('0.01')):
                    return Response({'erro': 'O preço deve ter no máximo duas casas decimais.'}, status=400)
            except InvalidOperation:
                return Response({'erro': 'Preço desejado inválido.'}, status=400)
            alerta.preco_alvo = preco_alvo
            alerta.atingido = False
            alerta.ativo = True

        if 'ativo' in request.data:
            ativo_raw = request.data.get('ativo')
            if isinstance(ativo_raw, bool):
                alerta.ativo = ativo_raw
            elif str(ativo_raw).lower() in ('true', '1', 'sim'):
                alerta.ativo = True
            elif str(ativo_raw).lower() in ('false', '0', 'nao', 'não'):
                alerta.ativo = False
            else:
                return Response({'erro': 'Estado do alerta inválido.'}, status=400)

        alerta.save(update_fields=['preco_alvo', 'ativo', 'atingido', 'atualizado_em'])
        return Response({
            'mensagem': 'Alerta atualizado com sucesso.',
            'id': alerta.id,
            'preco_alvo': str(alerta.preco_alvo),
            'ativo': alerta.ativo,
            'atingido': alerta.atingido,
        })


class NotificacaoList(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def get(self, request):
        cliente_id = request.cliente_id

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
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def post(self, request, notificacao_id):
        cliente_id = request.cliente_id

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
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def get(self, request):
        cliente_id = request.cliente_id

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
                pedido__subpedidos__supermercado_id=F('supermercado_id'),
                pedido__subpedidos__status='concluido',
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
        cliente_id = request.cliente_id

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

        loja_concluida = PedidoPorSupermercado.objects.filter(
            pedido=item.pedido,
            supermercado=item.supermercado,
            status='concluido'
        ).exists()
        if not loja_concluida:
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


class AvaliacaoSupermercadoList(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [ClienteAutenticado]

    def get(self, request):
        cliente_id = request.cliente_id
        avaliacoes = (
            AvaliacaoSupermercado.objects
            .filter(cliente_id=cliente_id)
            .select_related('pedido', 'supermercado')
            .order_by('-criada_em')
        )
        ids_avaliados = set(
            avaliacoes.values_list('pedido_id', 'supermercado_id')
        )
        subpedidos = (
            PedidoPorSupermercado.objects
            .filter(pedido__cliente_id=cliente_id, status='concluido')
            .select_related('pedido', 'supermercado')
            .prefetch_related('pedido__itens')
            .order_by('-pedido__criado_em')
        )
        lojas_avaliaveis = []
        for subpedido in subpedidos:
            chave = (subpedido.pedido_id, subpedido.supermercado_id)
            if chave in ids_avaliados:
                continue
            lojas_avaliaveis.append({
                'pedido_id': subpedido.pedido_id,
                'supermercado_id': subpedido.supermercado_id,
                'pedido_criado_em': subpedido.pedido.criado_em,
                'supermercado': subpedido.supermercado.nome,
                'produtos': [
                    {
                        'nome': item.nome_produto,
                        'quantidade': item.quantidade,
                        'subtotal': str(item.subtotal),
                    }
                    for item in subpedido.pedido.itens.all()
                    if item.supermercado_id == subpedido.supermercado_id
                ],
            })

        return Response({
            'lojas_avaliaveis': lojas_avaliaveis,
            'avaliacoes': [
                {
                    'id': avaliacao.id,
                    'pedido_id': avaliacao.pedido_id,
                    'supermercado_id': avaliacao.supermercado_id,
                    'supermercado': avaliacao.supermercado.nome,
                    'nota': avaliacao.nota,
                    'nota_produtos': avaliacao.nota_produtos,
                    'nota_entrega': avaliacao.nota_entrega,
                    'preco_correto': avaliacao.preco_correto,
                    'entrega_ok': avaliacao.entrega_ok,
                    'comentario': avaliacao.comentario,
                    'criada_em': avaliacao.criada_em,
                }
                for avaliacao in avaliacoes
            ],
        })

    def post(self, request):
        try:
            pedido_id = int(request.data.get('pedido_id'))
            supermercado_id = int(request.data.get('supermercado_id'))
            nota = int(request.data.get('nota'))
            nota_produtos = int(request.data.get('nota_produtos'))
            nota_entrega = int(request.data.get('nota_entrega'))
        except (TypeError, ValueError):
            return Response(
                {
                    'erro': (
                        'Pedido, supermercado e as três notas '
                        'são obrigatórios.'
                    )
                },
                status=400
            )

        if any(valor < 1 or valor > 5 for valor in (
            nota_produtos, nota_entrega, nota
        )):
            return Response(
                {'erro': 'Todas as notas devem estar entre 1 e 5 estrelas.'},
                status=400
            )

        subpedido = get_object_or_404(
            PedidoPorSupermercado.objects.select_related(
                'pedido', 'supermercado'
            ),
            pedido_id=pedido_id,
            supermercado_id=supermercado_id,
            pedido__cliente_id=request.cliente_id
        )
        if subpedido.status != 'concluido':
            return Response(
                {'erro': 'Só é possível avaliar uma loja após a conclusão do pedido.'},
                status=400
            )

        if AvaliacaoSupermercado.objects.filter(
            pedido_id=pedido_id,
            supermercado_id=supermercado_id
        ).exists():
            return Response(
                {'erro': 'Esta loja deste pedido já foi avaliada.'},
                status=400
            )

        avaliacao = AvaliacaoSupermercado.objects.create(
            cliente_id=request.cliente_id,
            pedido=subpedido.pedido,
            supermercado=subpedido.supermercado,
            nota=nota,
            nota_produtos=nota_produtos,
            nota_entrega=nota_entrega,
            preco_correto=nota_produtos >= 3,
            entrega_ok=nota_entrega >= 3,
            comentario=str(request.data.get('comentario', '')).strip(),
        )

        return Response({
            'mensagem': 'Avaliação do supermercado enviada com sucesso.',
            'avaliacao': {
                'id': avaliacao.id,
                'pedido_id': avaliacao.pedido_id,
                'supermercado_id': avaliacao.supermercado_id,
                'supermercado': avaliacao.supermercado.nome,
                'nota': avaliacao.nota,
                'nota_produtos': avaliacao.nota_produtos,
                'nota_entrega': avaliacao.nota_entrega,
                'preco_correto': avaliacao.preco_correto,
                'entrega_ok': avaliacao.entrega_ok,
                'comentario': avaliacao.comentario,
            }
        }, status=201)


class AvaliacoesPublicas(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        produto_id = request.query_params.get('produto_id')
        if not produto_id or not str(produto_id).isdigit():
            return Response(
                {'erro': 'Informe um produto válido.'},
                status=400
            )

        produto = get_object_or_404(
            Produto.objects.select_related('supermercado'),
            pk=int(produto_id)
        )
        avaliacoes = Avaliacao.objects.filter(
            produto_id=produto.id
        ).order_by('-criada_em')
        resumo = avaliacoes.aggregate(
            media=Avg('nota'),
            total=Count('id')
        )

        return Response({
            'produto_id': produto.id,
            'produto': produto.nome,
            'supermercado': (
                produto.supermercado.nome
                if produto.supermercado
                else ''
            ),
            'media': (
                round(resumo['media'], 2)
                if resumo['media'] is not None
                else None
            ),
            'total': resumo['total'],
            'avaliacoes': [
                {
                    'nota': avaliacao.nota,
                    'preco_correto': avaliacao.preco_correto,
                    'entrega_ok': avaliacao.entrega_ok,
                    'comentario': avaliacao.comentario,
                    'criada_em': avaliacao.criada_em,
                }
                for avaliacao in avaliacoes[:20]
            ],
        })


class PerfilCliente(APIView):
    authentication_classes = [
        TokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [ClienteAutenticado]

    def get(self, request):
        cliente_id = request.cliente_id

        cliente = get_object_or_404(
            Cliente,
            pk=cliente_id
        )

        pedidos = Pedido.objects.filter(
            cliente=cliente
        )

        alertas_ativos = AlertaPreco.objects.filter(
            cliente=cliente,
            ativo=True
        ).count()

        total_economizado = sum(
            pedido.desconto
            for pedido in pedidos
        )

        return Response({
            'id': cliente.id,
            'nome': cliente.nome,
            'cpf': cliente.cpf,
            'email': cliente.email,
            'cep': cliente.cep,
            'criado_em': cliente.criado_em,
            'estatisticas': {
                'pedidos': pedidos.count(),
                'alertas_ativos': alertas_ativos,
                'economizado': str(total_economizado),
            }
        })

    def put(self, request):
        cliente_id = request.cliente_id

        cliente = get_object_or_404(
            Cliente,
            pk=cliente_id
        )

        nome = request.data.get(
            'nome',
            cliente.nome
        ).strip()

        email = request.data.get(
            'email',
            cliente.email
        ).strip().lower()

        cep = request.data.get(
            'cep',
            cliente.cep
        ).strip()

        if not nome:
            return Response(
                {'erro': 'Informe o nome.'},
                status=400
            )

        if not email:
            return Response(
                {'erro': 'Informe o e-mail.'},
                status=400
            )

        email_em_uso = Cliente.objects.filter(
            email=email
        ).exclude(
            pk=cliente.id
        ).exists()

        if email_em_uso:
            return Response(
                {'erro': 'Este e-mail já está em uso.'},
                status=400
            )

        cliente.nome = nome
        cliente.email = email
        cliente.cep = cep

        cliente.save(
            update_fields=[
                'nome',
                'email',
                'cep',
            ]
        )

        return Response({
            'mensagem': 'Perfil atualizado com sucesso.',
            'cliente': {
                'id': cliente.id,
                'nome': cliente.nome,
                'cpf': cliente.cpf,
                'email': cliente.email,
                'cep': cliente.cep,
            }
        })


class LogoutCliente(APIView):
    authentication_classes = [
        TokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [ClienteAutenticado]

    def post(self, request):
        conta_id = request.cliente_id

        Token.objects.filter(
            user__username=f'cliente_{conta_id}'
        ).delete()

        if request.session.get('cliente_id') == conta_id:
            request.session.flush()

        return Response({
            'mensagem': 'Logout realizado com sucesso.'
        })


class PedidosSupermercadoList(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [SupermercadoAutenticado]

    def get(self, request):
        supermercado_id = request.supermercado_id
        status_por_pedido = dict(
            PedidoPorSupermercado.objects
            .filter(supermercado_id=supermercado_id)
            .values_list('pedido_id', 'status')
        )

        itens = (
            ItemPedido.objects
            .filter(
                supermercado_id=supermercado_id
            )
            .select_related(
                'pedido',
                'pedido__cliente',
                'produto',
                'supermercado'
            )
            .order_by(
                '-pedido__criado_em',
                'id'
            )
        )

        pedidos = {}

        for item in itens:
            pedido = item.pedido

            if pedido.id not in pedidos:

                pagamento_status = None

                try:
                    pagamento_status = (
                        pedido.pagamento.status
                    )
                except Pagamento.DoesNotExist:
                    pagamento_status = None

                pedidos[pedido.id] = {
                    'id': pedido.id,

                    'cliente': {
                        'id': pedido.cliente.id,
                        'nome': pedido.cliente.nome,
                        'email': pedido.cliente.email,
                        'cep': pedido.cliente.cep,
                    },

                    'tipo_entrega':
                        pedido.tipo_entrega,

                    'endereco_entrega':
                        pedido.endereco_entrega,

                    'observacoes':
                        pedido.observacoes,

                    'forma_pagamento':
                        pedido.forma_pagamento,

                    'pagamento_status':
                        pagamento_status,

                    'status': status_por_pedido.get(
                        pedido.id,
                        pedido.status
                    ),

                    'criado_em':
                        pedido.criado_em,

                    'itens': [],

                    'subtotal_supermercado':
                        Decimal('0.00'),
                }

            pedidos[pedido.id]['itens'].append({
                'item_id': item.id,
                'produto_id': item.produto_id,
                'nome': item.nome_produto,
                'preco_unitario': str(
                    item.preco_unitario
                ),
                'quantidade': item.quantidade,
                'subtotal': str(item.subtotal),
            })

            pedidos[pedido.id][
                'subtotal_supermercado'
            ] += item.subtotal

        resultado = []

        for pedido in pedidos.values():

            pedido[
                'subtotal_supermercado'
            ] = str(
                pedido[
                    'subtotal_supermercado'
                ]
            )

            resultado.append(pedido)

        return Response(resultado)


class StatusPedidoSupermercado(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [SupermercadoAutenticado]

    def patch(self, request, pedido_id):
        supermercado_id = request.supermercado_id

        pedido = get_object_or_404(
            Pedido.objects.distinct(),
            pk=pedido_id,
            itens__supermercado_id=supermercado_id
        )

        subpedido = get_object_or_404(
            PedidoPorSupermercado,
            pedido=pedido,
            supermercado_id=supermercado_id
        )

        novo_status = request.data.get(
            'status'
        )

        status_permitidos = [
            'confirmado',
            'preparando',
            'enviado',
            'concluido',
            'cancelado',
        ]

        if novo_status not in status_permitidos:
            return Response(
                {
                    'erro':
                    'Status de pedido inválido.'
                },
                status=400
            )

        if pedido.status == 'aguardando_pagamento':
            return Response(
                {
                    'erro': (
                        'O pagamento deste pedido '
                        'ainda não foi confirmado.'
                    )
                },
                status=400
            )

        if subpedido.status in [
            'concluido',
            'cancelado'
        ]:
            return Response(
                {
                    'erro': (
                        'Este pedido já foi finalizado '
                        'e não pode ser alterado.'
                    )
                },
                status=400
            )

        fluxo = {
            'confirmado': 'preparando',
            'preparando': 'enviado',
            'enviado': 'concluido',
        }

        if novo_status != 'cancelado':

            status_esperado = fluxo.get(
                subpedido.status
            )

            if novo_status != status_esperado:
                return Response(
                    {
                        'erro': (
                            'A alteração de status deve '
                            'seguir a ordem: confirmado, '
                            'preparando, enviado e concluído.'
                        )
                    },
                    status=400
                )

        status_anterior = subpedido.status
        subpedido.status = novo_status
        subpedido.save(
            update_fields=['status', 'atualizado_em']
        )

        status_resumo = resumo_status_pedido(
            pedido.status,
            list(pedido.subpedidos.all())
        )

        return Response({
            'mensagem':
                'Status atualizado com sucesso.',
            'pedido_id':
                pedido.id,
            'status_anterior':
                status_anterior,
            'status':
                subpedido.status,
            'pedido_status':
                status_resumo,
        })


class PerfilSupermercado(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [SupermercadoAutenticado]

    def get(self, request):
        supermercado_id = request.supermercado_id

        supermercado = get_object_or_404(
            Supermercado,
            pk=supermercado_id
        )

        produtos = Produto.objects.filter(
            supermercado_id=supermercado_id
        )

        subpedidos = PedidoPorSupermercado.objects.filter(
            supermercado_id=supermercado_id
        )
        pedidos_recebidos = subpedidos.count()
        pedidos_abertos = subpedidos.filter(
            status__in=['confirmado', 'preparando', 'enviado']
        ).count()
        pedidos_concluidos_ids = subpedidos.filter(
            status='concluido'
        ).values_list('pedido_id', flat=True)
        total_vendido = sum(
            ItemPedido.objects.filter(
                supermercado_id=supermercado_id,
                pedido_id__in=pedidos_concluidos_ids
            ).values_list('subtotal', flat=True),
            Decimal('0.00')
        )

        return Response({
            'id': supermercado.id,
            'nome': supermercado.nome,
            'responsavel': supermercado.responsavel,
            'cnpj': supermercado.cnpj,
            'razao_social': supermercado.razao_social,
            'email_comercial': supermercado.email_comercial,
            'telefone': supermercado.telefone,

            'cep': supermercado.cep,
            'estado': supermercado.estado,
            'cidade': supermercado.cidade,
            'bairro': supermercado.bairro,
            'endereco': supermercado.endereco,
            'numero': supermercado.numero,
            'complemento': supermercado.complemento,

            'criado_em': supermercado.criado_em,

            'estatisticas': {
                'produtos': produtos.count(),
                'pedidos_recebidos': pedidos_recebidos,
                'pedidos_abertos': pedidos_abertos,
                'total_vendido': str(total_vendido),
            }
        })

    def put(self, request):
        supermercado_id = request.supermercado_id

        supermercado = get_object_or_404(
            Supermercado,
            pk=supermercado_id
        )

        nome = str(
            request.data.get(
                'nome',
                supermercado.nome
            )
        ).strip()

        responsavel = str(
            request.data.get(
                'responsavel',
                supermercado.responsavel
            )
        ).strip()

        razao_social = str(
            request.data.get(
                'razao_social',
                supermercado.razao_social
            )
        ).strip()

        email = str(
            request.data.get(
                'email_comercial',
                supermercado.email_comercial
            )
        ).strip().lower()

        telefone = str(
            request.data.get(
                'telefone',
                supermercado.telefone
            )
        ).strip()

        cep = str(
            request.data.get(
                'cep',
                supermercado.cep
            )
        ).strip()

        estado = str(
            request.data.get(
                'estado',
                supermercado.estado
            )
        ).strip()

        cidade = str(
            request.data.get(
                'cidade',
                supermercado.cidade
            )
        ).strip()

        bairro = str(
            request.data.get(
                'bairro',
                supermercado.bairro
            )
        ).strip()

        endereco = str(
            request.data.get(
                'endereco',
                supermercado.endereco
            )
        ).strip()

        numero = str(
            request.data.get(
                'numero',
                supermercado.numero
            )
        ).strip()

        complemento = str(
            request.data.get(
                'complemento',
                supermercado.complemento
            )
        ).strip()

        if not nome:
            return Response(
                {
                    'erro':
                    'Informe o nome do supermercado.'
                },
                status=400
            )

        if not email:
            return Response(
                {
                    'erro':
                    'Informe o e-mail comercial.'
                },
                status=400
            )

        if not endereco:
            return Response(
                {
                    'erro':
                    'Informe o endereço.'
                },
                status=400
            )

        email_em_uso = (
            Supermercado.objects
            .filter(
                email_comercial__iexact=email
            )
            .exclude(pk=supermercado.id)
            .exists()
        )

        if email_em_uso:
            return Response(
                {
                    'erro':
                    'Este e-mail já está sendo usado por outro supermercado.'
                },
                status=400
            )

        supermercado.nome = nome
        supermercado.responsavel = responsavel
        supermercado.razao_social = razao_social
        supermercado.email_comercial = email
        supermercado.telefone = telefone

        supermercado.cep = cep
        supermercado.estado = estado
        supermercado.cidade = cidade
        supermercado.bairro = bairro
        supermercado.endereco = endereco
        supermercado.numero = numero
        supermercado.complemento = complemento

        supermercado.save(
            update_fields=[
                'nome',
                'responsavel',
                'razao_social',
                'email_comercial',
                'telefone',
                'cep',
                'estado',
                'cidade',
                'bairro',
                'endereco',
                'numero',
                'complemento',
            ]
        )

        return Response({
            'mensagem':
                'Perfil do supermercado atualizado com sucesso.',

            'supermercado': {
                'id': supermercado.id,
                'nome': supermercado.nome,
                'responsavel': supermercado.responsavel,
                'cnpj': supermercado.cnpj,
                'razao_social': supermercado.razao_social,
                'email_comercial': supermercado.email_comercial,
                'telefone': supermercado.telefone,
                'cep': supermercado.cep,
                'estado': supermercado.estado,
                'cidade': supermercado.cidade,
                'bairro': supermercado.bairro,
                'endereco': supermercado.endereco,
                'numero': supermercado.numero,
                'complemento': supermercado.complemento,
            }
        })


class LogoutSupermercado(APIView):
    authentication_classes = [
        TokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [SupermercadoAutenticado]

    def post(self, request):
        conta_id = request.supermercado_id

        Token.objects.filter(
            user__username=f'supermercado_{conta_id}'
        ).delete()

        if request.session.get('supermercado_id') == conta_id:
            request.session.flush()

        return Response({
            'mensagem': 'Logout realizado com sucesso.'
        })


class TesteToken(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'mensagem': 'Token válido. Acesso autorizado.',
            'usuario': request.user.username
        })
