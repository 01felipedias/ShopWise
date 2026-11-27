# Dados de demonstração

O projeto inclui uma carga inicial para testar a loja **São Jorge Super**, a
loja **Quaresma**, o cliente **Felipe** e produtos com imagens no catálogo.
O feijão carioca aparece nas duas lojas para comparar preços, e São Jorge Super
também tem queijo e café no catálogo.

O lojista também pode enviar uma foto JPG, PNG ou WebP de até 5 MB ao cadastrar
ou editar um produto.

Depois de instalar as dependências e aplicar as migrations, execute:

```bash
python manage.py seed_demo_data
```

O comando é seguro para repetir: não duplica os mercados, o cliente nem os
produtos. Se a base local já tiver o cliente Felipe e produtos cadastrados, os
dados existentes são preservados. O mercado chamado `jorge` é renomeado para
`São Jorge Super`. Produtos antigos substituídos ficam inativos no catálogo; os
registros continuam no banco para preservar pedidos já feitos.

Em uma instalação limpa, as contas criadas usam a senha de demonstração
`ShopWiseDemo123!`. Os e-mails são `felipe@example.com`,
`saojorge@example.com` e `quaresma@example.com`. Use essa senha apenas no
ambiente local de demonstração. O comando recusa execução fora do SQLite local
com `DEBUG=True`.
