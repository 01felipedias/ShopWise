from django.test import TestCase
from rest_framework.test import APIClient

from .models import Cliente, Supermercado


class TestesSeguranca(TestCase):

    senha_antiga = 'Teste@Antiga982'
    senha_nova = 'Nova@Segura7418'

    def setUp(self):
        self.cliente = Cliente(
            nome='Cliente Teste',
            cpf='12345678901',
            email='cliente@teste.com',
            cep='64800000'
        )
        self.cliente.set_senha(self.senha_antiga)
        self.cliente.save()

        self.supermercado = Supermercado(
            nome='Mercado Teste',
            email_comercial='mercado@teste.com',
            endereco='Rua Teste'
        )
        self.supermercado.set_senha(self.senha_antiga)
        self.supermercado.save()

    def login(self, tipo, email, senha):
        return APIClient().post(
            f'/api/login-{tipo}/',
            {'email': email, 'senha': senha},
            format='json'
        )

    def verificar_alteracao(self, tipo, conta, email, perfil):

        rota = f'/api/alterar-senha-{tipo}/'

        login = self.login(tipo, email, self.senha_antiga)
        self.assertEqual(login.status_code, 200)

        token = login.data['token']

        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Token {token}')

        self.assertEqual(api.get(perfil).status_code, 200)

        dados = {
            'senha_atual': self.senha_antiga,
            'nova_senha': self.senha_nova,
            'confirmacao_senha': self.senha_nova
        }

        resposta = api.post(
            rota,
            {**dados, 'senha_atual': 'SenhaErrada'},
            format='json'
        )
        self.assertEqual(resposta.status_code, 400)

        resposta = api.post(
            rota,
            {**dados, 'confirmacao_senha': 'Diferente'},
            format='json'
        )
        self.assertEqual(resposta.status_code, 400)

        resposta = api.post(rota, dados, format='json')
        self.assertEqual(resposta.status_code, 200)

        conta.refresh_from_db()

        self.assertNotEqual(conta.senha, self.senha_nova)
        self.assertTrue(conta.verificar_senha(self.senha_nova))
        self.assertFalse(conta.verificar_senha(self.senha_antiga))

        self.assertEqual(api.get(perfil).status_code, 401)

        antigo = self.login(tipo, email, self.senha_antiga)
        self.assertEqual(antigo.status_code, 401)

        novo = self.login(tipo, email, self.senha_nova)
        self.assertEqual(novo.status_code, 200)
        self.assertNotEqual(novo.data['token'], token)

    def test_alteracao_senha_cliente(self):
        self.verificar_alteracao(
            'cliente',
            self.cliente,
            self.cliente.email,
            '/api/perfil/'
        )

    def test_alteracao_senha_supermercado(self):
        self.verificar_alteracao(
            'supermercado',
            self.supermercado,
            self.supermercado.email_comercial,
            '/api/perfil-supermercado/'
        )

    def test_alteracao_sem_token(self):
        api = APIClient()

        for tipo in ['cliente', 'supermercado']:
            resposta = api.post(f'/api/alterar-senha-{tipo}/')
            self.assertEqual(resposta.status_code, 401)

    def test_cliente_nao_altera_senha_supermercado(self):
        login = self.login(
            'cliente',
            self.cliente.email,
            self.senha_antiga
        )

        self.assertEqual(login.status_code, 200)

        api = APIClient()
        api.credentials(
            HTTP_AUTHORIZATION='Token ' + login.data['token']
        )

        resposta = api.post(
            '/api/alterar-senha-supermercado/'
        )

        self.assertEqual(resposta.status_code, 403)

    def test_supermercado_nao_altera_senha_cliente(self):
        login = self.login(
            'supermercado',
            self.supermercado.email_comercial,
            self.senha_antiga
        )

        self.assertEqual(login.status_code, 200)

        api = APIClient()
        api.credentials(
            HTTP_AUTHORIZATION='Token ' + login.data['token']
        )

        resposta = api.post('/api/alterar-senha-cliente/')

        self.assertEqual(resposta.status_code, 403)
