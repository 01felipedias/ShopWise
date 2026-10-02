import json
import re
import uuid

from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


MERCADO_PAGO_ORDERS_URL = "https://api.mercadopago.com/v1/orders"


class MercadoPagoErro(Exception):
    pass


def _access_token():
    token = getattr(settings, "MERCADO_PAGO_ACCESS_TOKEN", "").strip()

    if not token:
        raise MercadoPagoErro(
            "Access Token do Mercado Pago não configurado."
        )

    return token


def _fazer_requisicao(
    metodo,
    url,
    dados=None,
    idempotency_key=None
):
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_access_token()}",
    }

    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key

    corpo = None

    if dados is not None:
        corpo = json.dumps(dados).encode("utf-8")

    requisicao = Request(
        url=url,
        data=corpo,
        headers=headers,
        method=metodo
    )

    try:
        with urlopen(requisicao, timeout=30) as resposta:
            conteudo = resposta.read().decode("utf-8")

            if not conteudo:
                return {}

            return json.loads(conteudo)

    except HTTPError as erro:
        corpo_erro = erro.read().decode("utf-8", errors="replace")

        try:
            dados_erro = json.loads(corpo_erro)
        except json.JSONDecodeError:
            dados_erro = {"message": corpo_erro}

        mensagem = (
            dados_erro.get("message")
            or dados_erro.get("error")
            or "Erro retornado pelo Mercado Pago."
        )

        raise MercadoPagoErro(
            f"Mercado Pago HTTP {erro.code}: {mensagem}"
        ) from erro

    except URLError as erro:
        raise MercadoPagoErro(
            "Não foi possível conectar ao Mercado Pago."
        ) from erro


def criar_order_pix(
    total,
    referencia,
    email="",
    primeiro_nome="",
    modo_teste=True
):
    try:
        total_decimal = Decimal(str(total)).quantize(
            Decimal("0.01")
        )
    except (InvalidOperation, ValueError):
        raise MercadoPagoErro(
            "Valor inválido para gerar o PIX."
        )

    if total_decimal <= 0:
        raise MercadoPagoErro(
            "O valor do PIX deve ser maior que zero."
        )

    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", referencia):
        raise MercadoPagoErro(
            "Referência externa inválida."
        )

    if modo_teste:
        # O teste oficial de PIX da Orders API usa R$ 50,00.
        if total_decimal != Decimal("50.00"):
            raise MercadoPagoErro(
                "No sandbox oficial do PIX, faça o teste "
                "com um pedido de R$ 50,00."
            )

        pagador = {
            "email": "test_user_br@testuser.com",
            "first_name": "APRO",
        }

    else:
        if not email:
            raise MercadoPagoErro(
                "O e-mail do comprador é obrigatório."
            )

        pagador = {
            "email": email
        }

        if primeiro_nome:
            pagador["first_name"] = primeiro_nome

    valor = f"{total_decimal:.2f}"

    dados = {
        "type": "online",
        "total_amount": valor,
        "external_reference": referencia,
        "processing_mode": "automatic",
        "payer": pagador,
        "transactions": {
            "payments": [
                {
                    "amount": valor,
                    "payment_method": {
                        "id": "pix",
                        "type": "bank_transfer"
                    }
                }
            ]
        }
    }

    resposta = _fazer_requisicao(
        metodo="POST",
        url=MERCADO_PAGO_ORDERS_URL,
        dados=dados,
        idempotency_key=str(uuid.uuid4())
    )

    pagamentos = (
        resposta
        .get("transactions", {})
        .get("payments", [])
    )

    pagamento = pagamentos[0] if pagamentos else {}

    metodo_pagamento = pagamento.get(
        "payment_method",
        {}
    )

    return {
        "order_id": resposta.get("id"),
        "payment_id": pagamento.get("id"),
        "status": resposta.get("status"),
        "status_detail": resposta.get("status_detail"),
        "payment_status": pagamento.get("status"),
        "payment_status_detail": pagamento.get(
            "status_detail"
        ),
        "qr_code": metodo_pagamento.get("qr_code"),
        "qr_code_base64": metodo_pagamento.get(
            "qr_code_base64"
        ),
        "ticket_url": metodo_pagamento.get(
            "ticket_url"
        ),
    }


def consultar_order_pix(order_id):
    if not order_id:
        raise MercadoPagoErro(
            "ID da order não informado."
        )

    url = f"{MERCADO_PAGO_ORDERS_URL}/{order_id}"

    return _fazer_requisicao(
        metodo="GET",
        url=url
    )
