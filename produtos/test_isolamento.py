from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Cliente,
    Supermercado,
    Produto,
    Pedido,
    AlertaPreco,
    Notificacao,
)


class TestesIsolamento(TestCase):

    senha = 'Segura@Teste982'

    def setUp(self):
        self.cliente_a = Cliente(
            nome='Cliente A',
            email='a@teste.com',
            cpf='12345678901',
            cep='64800000'
        )
        self.cliente_a.set_senha(self.senha)
        self.cliente_a.save()

        self.cliente_b = Cliente(
            nome='Cliente B',
            email='b@teste.com',
            cpf='12345678902',
            cep='64800000'
        )
        self.cliente_b.set_senha(self.senha)
        self.cliente_b.save()

        self.mercado = Supermercado(
            nome='Mercado Teste',
            email_comercial='mercado@teste.com',
            endereco='Rua Teste'
        )
        self.mercado.set_senha(self.senha)
        self.mercado.save()

        self.produto = Produto.objects.create(
            supermercado=self.mercado,
            nome='Arroz Teste',
            categoria='alimentos',
            preco='10.00',
            estoque=50
        )

        self.pedido_b = Pedido.objects.create(
            cliente=self.cliente_b,
            tipo_entrega='pickup',
            forma_pagamento='entrega',
            subtotal='10.00',
            total='10.00'
        )

        self.alerta_b = AlertaPreco.objects.create(
            cliente=self.cliente_b,
            produto=self.produto,
            preco_alvo='8.00'
        )

        self.notificacao_b = Notificacao.objects.create(
            cliente=self.cliente_b,
            titulo='Notificacao privada',
            mensagem='Mensagem do cliente B'
        )

        resposta = APIClient().post(
            '/api/login-cliente/',
            {
                'email': self.cliente_a.email,
                'senha': self.senha
            },
            format='json'
        )

        self.assertEqual(resposta.status_code, 200)

        self.api = APIClient()
        self.api.credentials(
            HTTP_AUTHORIZATION='Token ' + resposta.data['token']
        )

    def test_perfil_proprio(self):
        resposta = self.api.get('/api/perfil/')
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['id'], self.cliente_a.id)

    def test_pedidos_isolados(self):
        resposta = self.api.get('/api/pedidos/')
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data, [])

    def test_alertas_isolados(self):
        resposta = self.api.get('/api/alertas-preco/')
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data, [])

    def test_notificacoes_isoladas(self):
        resposta = self.api.get('/api/notificacoes/')
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['notificacoes'], [])

    def test_nao_altera_notificacao_alheia(self):
        resposta = self.api.post(
            f'/api/notificacoes/{self.notificacao_b.id}/marcar-lida/'
        )
        self.assertEqual(resposta.status_code, 404)

        self.notificacao_b.refresh_from_db()
        self.assertFalse(self.notificacao_b.lida)

    def test_nao_consulta_pagamento_alheio(self):
        resposta = self.api.get(
            f'/api/pedidos/{self.pedido_b.id}/status-pix/'
        )
        self.assertEqual(resposta.status_code, 404)

    def test_cliente_nao_gerencia_produtos(self):
        resposta = self.api.get('/api/produtos/')
        self.assertEqual(resposta.status_code, 403)

    def test_supermercados_dados_publicos(self):
        resposta = APIClient().get('/api/supermercados/')
        self.assertEqual(resposta.status_code, 200)

        for mercado in resposta.data:
            self.assertEqual(
                set(mercado.keys()),
                {'id', 'nome', 'cidade', 'estado', 'bairro'}
            )

    def test_feed_permanece_publico(self):
        resposta = APIClient().get('/api/feed/produtos/')
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(
            any(p['id'] == self.produto.id for p in resposta.data)
        )
