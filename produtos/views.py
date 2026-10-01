from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.generics import get_object_or_404

from .models import Supermercado, Produto
from .serializers import SupermercadoSerializer, ProdutoSerializer


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
            return Response(serializer.data)

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

        # O supermercado vem da sessão, e não do navegador.
        dados['supermercado'] = supermercado_id

        serializer = ProdutoSerializer(data=dados)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

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

        # Só permite acessar um produto pertencente
        # ao supermercado atualmente autenticado.
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

        # Impede que alguém altere manualmente o supermercado
        # ao qual o produto pertence.
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

        if not supermercado or not supermercado.verificar_senha(senha):
            return Response(
                {'erro': 'E-mail ou senha inválidos.'},
                status=401
            )

        # Guarda no servidor qual supermercado fez login.
        request.session['supermercado_id'] = supermercado.id

        return Response({
            'mensagem': 'Login realizado com sucesso.',
            'supermercado': {
                'id': supermercado.id,
                'nome': supermercado.nome,
                'email': supermercado.email_comercial
            }
        })
