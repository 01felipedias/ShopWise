
from rest_framework.permissions import BasePermission

from .authentication import identificar_conta


class SupermercadoAutenticado(BasePermission):

    def has_permission(self, request, view):
        request.supermercado_id = identificar_conta(
            request,
            'supermercado'
        )

        return True


class ClienteAutenticado(BasePermission):

    def has_permission(self, request, view):
        request.cliente_id = identificar_conta(
            request,
            'cliente'
        )

        return True
