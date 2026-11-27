
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import (
    NotAuthenticated,
    PermissionDenied,
)

from .models import Cliente, Supermercado


def identificar_conta(request, tipo):
    modelos = {
        'cliente': Cliente,
        'supermercado': Supermercado,
    }

    modelo = modelos[tipo]

    # Autenticacao por token (aplicativo mobile)
    if isinstance(request.auth, Token):
        usuario = request.user.username
        prefixo = f'{tipo}_'

        if not usuario.startswith(prefixo):
            raise PermissionDenied(
                'Voce nao tem permissao para acessar este recurso.'
            )

        identificador = usuario[len(prefixo):]

        if not identificador.isascii() or not identificador.isdigit():
            raise PermissionDenied(
                'Identificacao da conta invalida.'
            )

        conta_id = int(identificador)

        if usuario != f'{tipo}_{conta_id}':
            raise PermissionDenied(
                'Identificacao da conta invalida.'
            )

    # Autenticacao pela sessao (site atual)
    else:
        conta_id = request.session.get(f'{tipo}_id')

    if not conta_id:
        raise NotAuthenticated(
            'Autenticacao obrigatoria.'
        )

    if not modelo.objects.filter(pk=conta_id).exists():
        raise NotAuthenticated(
            'Conta nao encontrada.'
        )

    return conta_id
