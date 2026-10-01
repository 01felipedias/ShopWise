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
        serializer = SupermercadoSerializer(supermercado, data=request.data)

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
        supermercado_id = request.query_params.get('supermercado')

        produtos = Produto.objects.all()

        if supermercado_id:
            produtos = produtos.filter(supermercado_id=supermercado_id)

        serializer = ProdutoSerializer(produtos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ProdutoSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)


class ProdutoDetalhe(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        produto = get_object_or_404(Produto, pk=pk)
        serializer = ProdutoSerializer(produto)
        return Response(serializer.data)

    def put(self, request, pk):
        produto = get_object_or_404(Produto, pk=pk)
        serializer = ProdutoSerializer(produto, data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        produto = get_object_or_404(Produto, pk=pk)
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

        return Response({
            'mensagem': 'Login realizado com sucesso.',
            'supermercado': {
                'id': supermercado.id,
                'nome': supermercado.nome,
                'email': supermercado.email_comercial
            }
        })
