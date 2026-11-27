from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Cliente,
    ItemPedido,
    PedidoPorSupermercado,
    Produto,
    Supermercado,
)


class TestePedidoMultiloja(TestCase):
    senha = 'Segura@Teste982'

    def setUp(self):
        self.cliente = Cliente(
            nome='Cliente Multi Loja',
            email='multi@teste.com',
            cpf='12345678901',
            cep='64800000'
        )
        self.cliente.set_senha(self.senha)
        self.cliente.save()

        self.jorge = self.criar_supermercado(
            'Jorge', 'jorge@teste.com'
        )
        self.quaresma = self.criar_supermercado(
            'Quaresma', 'quaresma@teste.com'
        )
        self.arroz_jorge = Produto.objects.create(
            supermercado=self.jorge,
            nome='Arroz 1 kg',
            categoria='mercearia',
            preco='5.50',
            estoque=20
        )
        self.arroz_quaresma = Produto.objects.create(
            supermercado=self.quaresma,
            nome='Arroz 1 kg',
            categoria='mercearia',
            preco='4.90',
            estoque=15
        )

        self.cliente_api = self.login('/api/login-cliente/', self.cliente.email)
        self.jorge_api = self.login('/api/login-supermercado/', self.jorge.email_comercial)
        self.quaresma_api = self.login('/api/login-supermercado/', self.quaresma.email_comercial)

    def criar_supermercado(self, nome, email):
        supermercado = Supermercado(
            nome=nome,
            email_comercial=email,
            endereco='Rua de Teste'
        )
        supermercado.set_senha(self.senha)
        supermercado.save()
        return supermercado

    def login(self, endpoint, email):
        resposta = APIClient().post(
            endpoint,
            {'email': email, 'senha': self.senha},
            format='json'
        )
        self.assertEqual(resposta.status_code, 200)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f"Token {resposta.data['token']}")
        return api

    def test_checkout_multiloja_mantem_status_isolado_por_supermercado(self):
        resposta_checkout = self.cliente_api.post(
            '/api/pedidos/',
            {
                'itens': [
                    {'produto_id': self.arroz_jorge.id, 'quantidade': 2},
                    {'produto_id': self.arroz_quaresma.id, 'quantidade': 1},
                ],
                'tipo_entrega': 'pickup',
                'forma_pagamento': 'entrega',
            },
            format='json'
        )

        self.assertEqual(resposta_checkout.status_code, 201)
        pedido_id = resposta_checkout.data['pedido']['id']
        self.assertEqual(ItemPedido.objects.filter(pedido_id=pedido_id).count(), 2)
        self.assertEqual(
            PedidoPorSupermercado.objects.filter(pedido_id=pedido_id).count(),
            2
        )

        resposta_jorge = self.jorge_api.get('/api/pedidos-supermercado/')
        resposta_quaresma = self.quaresma_api.get('/api/pedidos-supermercado/')
        self.assertEqual(resposta_jorge.status_code, 200)
        self.assertEqual(resposta_quaresma.status_code, 200)

        pedido_jorge = next(p for p in resposta_jorge.data if p['id'] == pedido_id)
        pedido_quaresma = next(p for p in resposta_quaresma.data if p['id'] == pedido_id)
        self.assertEqual([item['produto_id'] for item in pedido_jorge['itens']], [self.arroz_jorge.id])
        self.assertEqual([item['produto_id'] for item in pedido_quaresma['itens']], [self.arroz_quaresma.id])
        self.assertEqual(pedido_jorge['status'], 'confirmado')
        self.assertEqual(pedido_quaresma['status'], 'confirmado')

        resposta_avanco_jorge = self.jorge_api.patch(
            f'/api/pedidos-supermercado/{pedido_id}/status/',
            {'status': 'preparando'},
            format='json'
        )
        self.assertEqual(resposta_avanco_jorge.status_code, 200)

        pedido_quaresma = next(
            p for p in self.quaresma_api.get('/api/pedidos-supermercado/').data
            if p['id'] == pedido_id
        )
        self.assertEqual(pedido_quaresma['status'], 'confirmado')

        resposta_cliente = self.cliente_api.get('/api/pedidos/')
        self.assertEqual(resposta_cliente.status_code, 200)
        pedido_cliente = next(p for p in resposta_cliente.data if p['id'] == pedido_id)
        self.assertEqual(pedido_cliente['status'], 'em_andamento')
        self.assertEqual(pedido_cliente['status_pagamento'], 'confirmado')
        estados = {loja['id']: loja['status'] for loja in pedido_cliente['supermercados']}
        self.assertEqual(estados[self.jorge.id], 'preparando')
        self.assertEqual(estados[self.quaresma.id], 'confirmado')

        resposta_avanco_quaresma = self.quaresma_api.patch(
            f'/api/pedidos-supermercado/{pedido_id}/status/',
            {'status': 'preparando'},
            format='json'
        )
        self.assertEqual(resposta_avanco_quaresma.status_code, 200)
        pedido_cliente = next(
            p for p in self.cliente_api.get('/api/pedidos/').data
            if p['id'] == pedido_id
        )
        self.assertEqual(pedido_cliente['status'], 'preparando')
        self.assertEqual(
            {loja['status'] for loja in pedido_cliente['supermercados']},
            {'preparando'}
        )
