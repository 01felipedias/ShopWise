# ShopWise - API Mobile

## Tecnologias

- Python
- Django
- Django REST Framework
- SQLite
- AuthToken
- Ionic + Angular (aplicativo)

## Executar o backend

python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver

Os dados de demonstração (mercados, cliente e produtos) estão descritos em
[DADOS_DEMO.md](DADOS_DEMO.md).

URL base local:

http://127.0.0.1:8000/api/

No cadastro de produtos, o endpoint `POST /api/produtos/` aceita
`multipart/form-data` para enviar uma imagem JPG, PNG ou WebP de até 5 MB.

## Autenticacao

POST /api/login-cliente/
POST /api/login-supermercado/

Corpo JSON:

{
    "email": "email_do_usuario",
    "senha": "senha_do_usuario"
}

O login retorna um token de autenticacao.

Nas rotas protegidas, enviar o cabecalho:

Authorization: Token TOKEN_RECEBIDO

O aplicativo deve armazenar o token com seguranca.
Nao utilizar cookies de sessao no fluxo mobile.

## APIs publicas

GET /api/feed/produtos/
GET /api/feed/avaliacoes/?produto_id={id}
GET /api/supermercados/
POST /api/supermercados/
POST /api/clientes/

## APIs do cliente

GET /api/perfil/
PUT /api/perfil/

GET /api/pedidos/
POST /api/pedidos/

GET /api/pedidos/{id}/status-pix/

GET /api/alertas-preco/
POST /api/alertas-preco/
PUT /api/alertas-preco/{id}/
PATCH /api/alertas-preco/{id}/
DELETE /api/alertas-preco/{id}/ (desativa o alerta)

GET /api/notificacoes/
POST /api/notificacoes/{id}/marcar-lida/

GET /api/avaliacoes/
POST /api/avaliacoes/
GET /api/feed/avaliacoes/?produto_id={id} (resumo e comentários públicos)

GET /api/avaliacoes-supermercados/ (lojas concluídas pendentes e histórico do cliente)
POST /api/avaliacoes-supermercados/ (avalia uma loja concluída do pedido)

Corpo JSON para avaliação de loja:

{
    "pedido_id": 1,
    "supermercado_id": 1,
    "nota_produtos": 5,
    "nota_entrega": 4,
    "nota": 5,
    "comentario": "Entrega no prazo e ótimo atendimento."
}

GET /api/cupons/ (cupons ativos para o checkout)

## APIs do supermercado

GET /api/produtos/
POST /api/produtos/

GET /api/produtos/{id}/
PUT /api/produtos/{id}/
DELETE /api/produtos/{id}/

GET /api/perfil-supermercado/
PUT /api/perfil-supermercado/

GET /api/pedidos-supermercado/
PATCH /api/pedidos-supermercado/{id}/status/

Pedidos que incluem mais de um supermercado continuam agrupados no pedido do cliente. A resposta de `GET /api/pedidos/` inclui `supermercados`, com status e subtotal de cada loja, e um status resumido do pedido. Quando as lojas estão em etapas diferentes, o resumo é `em_andamento`; quando todas terminaram com resultados mistos, é `parcialmente_finalizado`. O campo `status_pagamento` informa o status do pagamento. Para o supermercado, `GET /api/pedidos-supermercado/` retorna somente os itens daquela loja; o PATCH atualiza apenas o status da loja autenticada.

GET /api/cupons/gerenciar/
POST /api/cupons/gerenciar/
PUT /api/cupons/gerenciar/{id}/
PATCH /api/cupons/gerenciar/{id}/
DELETE /api/cupons/gerenciar/{id}/ (desativa o cupom)

## Alteracao de senha

POST /api/alterar-senha-cliente/
POST /api/alterar-senha-supermercado/

Corpo JSON:

{
    "senha_atual": "senha_atual",
    "nova_senha": "nova_senha",
    "confirmacao_senha": "nova_senha"
}

A alteracao exige autenticacao por token.
Depois da alteracao, realizar novo login.

## Logout

POST /api/logout-cliente/
POST /api/logout-supermercado/

O logout revoga o token da conta.

## Codigos HTTP

200 - Operacao realizada
201 - Registro criado
204 - Registro excluido
400 - Dados invalidos
401 - Autenticacao necessaria ou invalida
403 - Acesso proibido
404 - Recurso nao encontrado

## CORS

Origens locais permitidas em desenvolvimento:

http://localhost:8100
http://127.0.0.1:8100
http://localhost:4200
http://127.0.0.1:4200

## Testar em um celular fisico

Configurar SHOPWISE_ALLOWED_HOSTS com o IP do computador.
Executar:

python manage.py runserver 0.0.0.0:8000

O celular deve estar na mesma rede do computador.

Utilizar o IP do computador na URL da API,
em vez de 127.0.0.1.

Configurar SHOPWISE_CORS_ORIGINS conforme a origem
real utilizada pelo aplicativo.

## Testes

python manage.py check
python manage.py test produtos -v 2

## Seguranca

- Nao compartilhar senhas ou tokens.
- Nao enviar o banco de dados ao GitHub.
- Nao enviar arquivos .env ao GitHub.
- Utilizar HTTPS em producao.
- Respeitar as permissoes de cliente e supermercado.
- Nao utilizar o servidor de desenvolvimento em producao.

