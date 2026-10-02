from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.generics import get_object_or_404

from .models import Supermercado, Produto, Cliente
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

        dados = request.data.copy()
        dados['supermercado'] = request.session['supermercado_id']

        serializer = ProdutoSerializer(
            produto,
            data=dados
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

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
