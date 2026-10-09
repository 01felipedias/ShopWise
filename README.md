# Interface do ShopWise

Esta pasta contém as páginas, estilos e imagens do ShopWise. A API Django fica no projeto `shopwise-api`, na pasta vizinha.

Inicie o servidor pela pasta `shopwise-api`:

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py runserver
```

Abra `http://127.0.0.1:8000/static/src/pages/feedproduto.html`.

Para autenticação e compras, abra as páginas pelo servidor da API. Abrir o HTML diretamente não disponibiliza as rotas `/api/`.

O catálogo, login, estoque, comparação e pedidos usam a API. As telas de alertas, avaliações, perfil e cashback continuam disponíveis como demonstrações; sua presença na interface não significa persistência desses recursos na API.

Os scripts e o segundo projeto Django antigos foram removidos porque o fluxo atual usa a API da pasta `shopwise-api`.
