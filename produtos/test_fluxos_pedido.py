from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Cliente,
    Cupom,
    ItemPedido,
    Pagamento,
    Pedido,
    PedidoPorSupermercado,
    Produto,
    Supermercado,
)


class TestesFluxosFinaisPedido(TestCase):
    senha = 'Segura@Teste982'

    def setUp(self):
        self.cliente = Cliente(
            nome='Cliente Final',
            email='cliente.final@teste.com',
            cpf='12345678901',
            cep='64800000',
        )
        self.cliente.set_senha(self.senha)
        self.cliente.save()

        self.mercado = Supermercado(
            nome='Mercado Final',
            email_comercial='mercado.final@teste.com',
            endereco='Rua de Teste',
        )
        self.mercado.set_senha(self.senha)
        self.mercado.save()

        self.produto = Produto.objects.create(
            supermercado=self.mercado,
            nome='Arroz 1 kg',
            categoria='mercearia',
            preco='5.00',
            estoque=8,
        )
        self.cliente_api = self.login(
            '/api/login-cliente/', self.cliente.email
        )
        self.mercado_api = self.login(
            '/api/login-supermercado/', self.mercado.email_comercial
        )

    def login(self, endpoint, email):
        resposta = APIClient().post(
            endpoint,
            {'email': email, 'senha': self.senha},
            format='json',
        )
        self.assertEqual(resposta.status_code, 200)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f"Token {resposta.data['token']}")
        return api

    def checkout(self, **extras):
        dados = {
            'itens': [{'produto_id': self.produto.id, 'quantidade': 1}],
            'tipo_entrega': 'pickup',
            'forma_pagamento': 'entrega',
        }
        dados.update(extras)
        return self.cliente_api.post('/api/pedidos/', dados, format='json')

    def test_checkout_recusa_produto_sem_estoque(self):
        self.produto.estoque = 0
        self.produto.save(update_fields=['estoque'])

        resposta = self.checkout()

        self.assertEqual(resposta.status_code, 400)
        self.assertIn('Estoque insuficiente', resposta.data['erro'])
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertEqual(ItemPedido.objects.count(), 0)

    def test_checkout_recusa_cupom_inexistente_sem_criar_pedido(self):
        resposta = self.checkout(cupom='NAOEXISTE')

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data['erro'], 'Cupom não encontrado.')
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertEqual(Cupom.objects.count(), 0)
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque, 8)

    @patch('produtos.views.consultar_order_pix')
    @patch('produtos.views.criar_order_pix')
    def test_pagamento_pix_recusado_cancela_pedido_e_subpedido(
        self, criar_pix, consultar_pix
    ):
        criar_pix.return_value = {
            'order_id': 'ORDER-PIX-TESTE-1',
            'payment_id': 'PAYMENT-PIX-TESTE-1',
            'status': 'created',
            'status_detail': 'created',
            'payment_status': 'pending',
            'payment_status_detail': 'pending_waiting_transfer',
            'qr_code': '000201-pix-de-teste',
            'qr_code_base64': '',
            'ticket_url': '',
        }
        consultar_pix.return_value = {
            'status': 'failed',
            'status_detail': 'rejected',
            'transactions': {
                'payments': [{
                    'status': 'rejected',
                    'status_detail': 'cc_rejected',
                }]
            },
        }

        checkout = self.checkout(forma_pagamento='pix')
        self.assertEqual(checkout.status_code, 201)
        pedido_id = checkout.data['pedido']['id']
        self.assertEqual(checkout.data['pedido']['status'], 'aguardando_pagamento')

        resposta = self.cliente_api.get(
            f'/api/pedidos/{pedido_id}/status-pix/'
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['pagamento']['status'], 'rejected')
        self.assertEqual(resposta.data['pedido_status'], 'cancelado')
        self.assertEqual(resposta.data['status_pagamento'], 'cancelado')
        self.assertEqual(
            PedidoPorSupermercado.objects.get(pedido_id=pedido_id).status,
            'cancelado',
        )
        self.assertEqual(Pagamento.objects.get(pedido_id=pedido_id).status, 'rejected')
        criar_pix.assert_called_once()
        consultar_pix.assert_called_once_with('ORDER-PIX-TESTE-1')

    def test_supermercado_cancela_pedido_recebido(self):
        checkout = self.checkout()
        self.assertEqual(checkout.status_code, 201)
        pedido_id = checkout.data['pedido']['id']

        resposta = self.mercado_api.patch(
            f'/api/pedidos-supermercado/{pedido_id}/status/',
            {'status': 'cancelado'},
            format='json',
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['status'], 'cancelado')
        pedido = Pedido.objects.get(pk=pedido_id)
        pedido_loja = PedidoPorSupermercado.objects.get(pedido=pedido)
        self.assertEqual(pedido_loja.status, 'cancelado')
        self.assertEqual(
            self.cliente_api.get('/api/pedidos/').data[0]['status'],
            'cancelado',
        )

        segunda_tentativa = self.mercado_api.patch(
            f'/api/pedidos-supermercado/{pedido_id}/status/',
            {'status': 'cancelado'},
            format='json',
        )
        self.assertEqual(segunda_tentativa.status_code, 400)
        self.assertEqual(
            PedidoPorSupermercado.objects.get(pedido=pedido).status,
            'cancelado',
        )

    def test_fluxo_completo_do_pedido_ate_concluido(self):
        checkout = self.checkout()
        self.assertEqual(checkout.status_code, 201)
        pedido_id = checkout.data['pedido']['id']

        for status in ('preparando', 'enviado', 'concluido'):
            resposta = self.mercado_api.patch(
                f'/api/pedidos-supermercado/{pedido_id}/status/',
                {'status': status},
                format='json',
            )
            self.assertEqual(resposta.status_code, 200, resposta.data)
            self.assertEqual(resposta.data['status'], status)

        pedido_cliente = self.cliente_api.get('/api/pedidos/').data[0]
        self.assertEqual(pedido_cliente['status'], 'concluido')
        self.assertEqual(pedido_cliente['supermercados'][0]['status'], 'concluido')
        self.assertEqual(pedido_cliente['itens'][0]['nome'], 'Arroz 1 kg')

