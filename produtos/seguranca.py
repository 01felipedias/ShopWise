from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token

from .models import Cliente, Supermercado
from .permissions import ClienteAutenticado, SupermercadoAutenticado


class AlterarSenhaBase(APIView):
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        atual = request.data.get('senha_atual')
        nova = request.data.get('nova_senha')
        confirmacao = request.data.get('confirmacao_senha')

        if not all(
            isinstance(v, str) and v
            for v in (atual, nova, confirmacao)
        ):
            return Response({
                'erro': 'Preencha todos os campos.'
            }, status=400)

        if nova != confirmacao:
            return Response({
                'erro': 'As novas senhas nao coincidem.'
            }, status=400)

        if len(nova) > 128:
            return Response({
                'erro': 'Senha muito longa.'
            }, status=400)

        conta_id = getattr(request, self.tipo + '_id')

        with transaction.atomic():
            conta = get_object_or_404(
                self.modelo.objects.select_for_update(),
                pk=conta_id
            )

            if not conta.verificar_senha(atual):
                return Response({
                    'erro': 'Senha atual incorreta.'
                }, status=400)

            if atual == nova:
                return Response({
                    'erro': 'Escolha uma senha diferente da atual.'
                }, status=400)

            usuario = User(
                first_name=conta.nome,
                email=getattr(
                    conta, 'email',
                    getattr(conta, 'email_comercial', '')
                )
            )

            try:
                validate_password(nova, user=usuario)
            except ValidationError as erro:
                return Response({
                    'erros': erro.messages
                }, status=400)

            conta.set_senha(nova)
            conta.save(update_fields=['senha'])

            Token.objects.filter(
                user__username=f'{self.tipo}_{conta_id}'
            ).delete()

        if request.session.get(self.tipo + '_id') == conta_id:
            request.session.flush()

        return Response({
            'mensagem': 'Senha alterada. Faca login novamente.'
        })


class AlterarSenhaCliente(AlterarSenhaBase):
    permission_classes = [IsAuthenticated, ClienteAutenticado]
    modelo = Cliente
    tipo = 'cliente'


class AlterarSenhaSupermercado(AlterarSenhaBase):
    permission_classes = [IsAuthenticated, SupermercadoAutenticado]
    modelo = Supermercado
    tipo = 'supermercado'
