from django.conf import settings
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware, get_token
from django.utils.crypto import salted_hmac, constant_time_compare
from django.views.decorators.http import require_GET
from django.views.decorators.cache import never_cache

from rest_framework.authentication import TokenAuthentication

from .models import Cliente, Supermercado


def assinatura_sessao(tipo, conta):
    return salted_hmac(
        'shopwise.session.v1',
        f'{tipo}:{conta.pk}:{conta.senha}',
        algorithm='sha256'
    ).hexdigest()


@never_cache
@require_GET
def csrf_cookie(request):
    return JsonResponse({
        'csrfToken': get_token(request)
    })


def validar_sessao(request):
    contas = [
        ('cliente', Cliente),
        ('supermercado', Supermercado),
    ]

    for tipo, modelo in contas:
        conta_id = request.session.get(f'{tipo}_id')

        if not conta_id:
            continue

        conta = modelo.objects.filter(pk=conta_id).first()
        assinatura = request.session.get('shopwise_auth_hash', '')

        if not conta or not constant_time_compare(
            assinatura,
            assinatura_sessao(tipo, conta)
        ):
            request.session.flush()
            return


class ShopWiseCSRFMiddleware(CsrfViewMiddleware):

    def process_view(self, request, callback, args, kwargs):

        if not request.path.startswith('/api/'):
            return super().process_view(
                request, callback, args, kwargs
            )

        validar_sessao(request)

        if request.method in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            return super().process_view(
                request, callback, args, kwargs
            )

        autorizacao = request.META.get(
            'HTTP_AUTHORIZATION', ''
        ).split()

        classe = getattr(callback, 'cls', None)
        autenticadores = getattr(
            classe, 'authentication_classes', []
        )

        if (
            autorizacao
            and autorizacao[0].lower() == 'token'
            and autenticadores
            and autenticadores[0] is TokenAuthentication
        ):
            return super().process_view(
                request, callback, args, kwargs
            )

        usa_cookie = (
            settings.SESSION_COOKIE_NAME in request.COOKIES
            or settings.CSRF_COOKIE_NAME in request.COOKIES
            or bool(request.META.get('HTTP_X_CSRFTOKEN'))
        )

        if usa_cookie:
            resultado = super().process_view(
                request,
                lambda r: None,
                args,
                kwargs
            )

            if resultado is None:
                request.shopwise_browser_login = True

            return resultado

        return super().process_view(
            request, callback, args, kwargs
        )

    def _reject(self, request, reason):
        if request.path.startswith('/api/'):
            return JsonResponse({
                'erro': 'Validacao CSRF falhou.'
            }, status=403)

        return super()._reject(request, reason)
