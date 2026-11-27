from django.test import TestCase
from rest_framework.test import APIClient

from .models import Supermercado


class TestesSessoes(TestCase):

    def setUp(self):
        self.mercado = Supermercado(
            nome='Mercado CSRF',
            email_comercial='csrf@teste.com',
            endereco='Rua Teste'
        )
        self.senha = 'Segura@Teste839'
        self.mercado.set_senha(self.senha)
        self.mercado.save()

        self.dados = {
            'email': self.mercado.email_comercial,
            'senha': self.senha
        }

        self.api = APIClient(enforce_csrf_checks=True)

    def login_web(self):
        self.api.get('/api/csrf/')

        csrf = self.api.cookies['csrftoken'].value

        resposta = self.api.post(
            '/api/login-supermercado/',
            self.dados,
            format='json',
            HTTP_X_CSRFTOKEN=csrf
        )

        self.assertEqual(resposta.status_code, 200)

        return self.api.cookies['csrftoken'].value

    def test_login_web_sem_csrf(self):
        self.api.get('/api/csrf/')

        resposta = self.api.post(
            '/api/login-supermercado/',
            self.dados,
            format='json'
        )

        self.assertEqual(resposta.status_code, 403)

    def test_sessao_sem_csrf(self):
        self.login_web()

        resposta = self.api.post(
            '/api/produtos/',
            {},
            format='json'
        )

        self.assertEqual(resposta.status_code, 403)

    def test_sessao_com_csrf(self):
        csrf = self.login_web()

        resposta = self.api.post(
            '/api/produtos/',
            {
                'nome': 'Produto Teste',
                'categoria': 'bebidas',
                'preco': '5.00',
                'estoque': 10
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf
        )

        self.assertEqual(resposta.status_code, 201)

    def test_mobile_com_token(self):
        resposta = self.api.post(
            '/api/login-supermercado/',
            self.dados,
            format='json'
        )

        self.assertEqual(resposta.status_code, 200)

        token = resposta.data['token']

        mobile = APIClient(enforce_csrf_checks=True)

        mobile.credentials(
            HTTP_AUTHORIZATION='Token ' + token
        )

        resposta = mobile.get('/api/produtos/')

        self.assertEqual(resposta.status_code, 200)

    def test_cors_origem_permitida(self):
        resposta = self.api.options(
            '/api/produtos/',
            HTTP_ORIGIN='http://localhost:8100',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization'
        )

        self.assertEqual(resposta.status_code, 200)

        self.assertEqual(
            resposta.get('Access-Control-Allow-Origin'),
            'http://localhost:8100'
        )

    def test_cors_origem_nao_permitida(self):
        resposta = self.api.options(
            '/api/produtos/',
            HTTP_ORIGIN='https://site-nao-autorizado.example',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET'
        )

        self.assertIsNone(
            resposta.get('Access-Control-Allow-Origin')
        )


    def test_produto_multipart_permanece_ativo(self):
        csrf = self.login_web()

        dados = {
            'nome': 'Produto Teste Render',
            'categoria': 'bebidas',
            'preco': '5.99',
            'estoque': 50
        }

        resposta = self.api.post(
            '/api/produtos/',
            dados,
            format='multipart',
            HTTP_X_CSRFTOKEN=csrf
        )

        self.assertEqual(resposta.status_code, 201)
        self.assertTrue(resposta.data['ativo'])

        pid = resposta.data['id']

        resposta = self.api.get('/api/produtos/')
        self.assertIn(pid, [p['id'] for p in resposta.data])

        dados['preco'] = '8.99'

        resposta = self.api.put(
            f'/api/produtos/{pid}/',
            dados,
            format='multipart',
            HTTP_X_CSRFTOKEN=csrf
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.data['ativo'])

        resposta = self.api.delete(
            f'/api/produtos/{pid}/',
            HTTP_X_CSRFTOKEN=csrf
        )

        self.assertEqual(resposta.status_code, 204)
