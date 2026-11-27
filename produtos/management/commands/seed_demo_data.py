from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from produtos.models import Cliente, Produto, Supermercado


DEMO_PASSWORD = 'ShopWiseDemo123!'


class Command(BaseCommand):
    help = 'Carrega os mercados, o cliente Felipe e os produtos de demonstração no SQLite local.'

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG or connection.vendor != 'sqlite':
            raise CommandError(
                'A carga de demonstração só pode ser executada no SQLite local '
                'com DEBUG=True.'
            )

        sao_jorge = self._get_or_create_store(
            display_name='São Jorge Super',
            known_names=('São Jorge Super', 'jorge'),
            email='saojorge@example.com',
            responsible='Jorge',
        )
        quaresma = self._get_or_create_store(
            display_name='Quaresma',
            known_names=('Quaresma',),
            email='quaresma@example.com',
            responsible='Quaresma',
        )

        self._get_or_create_customer()

        # Não desativa nem remove produtos já cadastrados: a carga só acrescenta
        # os itens de demonstração que ainda não existem.
        Produto.objects.filter(
            supermercado=sao_jorge,
            nome__iexact='feijao carioca',
            tamanho_embalagem='1kg',
            preco=Decimal('2.99'),
        ).update(ativo=False)

        products = (
            {
                'store': sao_jorge,
                'name': 'Arroz',
                'size': '1 kg',
                'category': 'mercearia',
                'price': Decimal('3.50'),
                'stock': 100,
                'description': 'Arroz branco tipo 1, pacote de 1kg',
            },
            {
                'store': quaresma,
                'name': 'Arroz',
                'size': '1 kg',
                'category': 'mercearia',
                'price': Decimal('3.99'),
                'stock': 100,
                'description': 'Arroz branco tipo 1, pacote de 1kg',
            },
            {
                'store': sao_jorge,
                'name': 'suco del valle',
                'size': '',
                'category': 'bebidas',
                'price': Decimal('3.50'),
                'stock': 100,
                'description': 'Suco Del Valle 500ml',
            },
            {
                'store': sao_jorge,
                'name': 'Café 3 Corações',
                'size': '250g',
                'category': 'mercearia',
                'price': Decimal('3.50'),
                'stock': 100,
                'description': 'Café torrado e moído',
            },
            {
                'store': sao_jorge,
                'name': 'Feijão carioca',
                'size': '1kg',
                'category': 'mercearia',
                'price': Decimal('3.50'),
                'stock': 150,
                'description': 'Feijão carioca tipo 1, pacote de 1kg',
            },
            {
                'store': quaresma,
                'name': 'Feijão carioca',
                'size': '1kg',
                'category': 'mercearia',
                'price': Decimal('3.99'),
                'stock': 200,
                'description': 'Feijão carioca tipo 1, pacote de 1kg',
            },
            {
                'store': sao_jorge,
                'name': 'Queijo',
                'size': '200g',
                'category': 'laticinios',
                'price': Decimal('6.49'),
                'stock': 50,
                'description': 'Queijo Itambé',
            },
            {
                'store': sao_jorge,
                'name': 'leite',
                'size': '500ml',
                'category': 'laticinios',
                'price': Decimal('3.00'),
                'stock': 8,
                'description': 'leite',
            },
        )

        created = 0
        for data in products:
            _, was_created = Produto.objects.get_or_create(
                supermercado=data['store'],
                nome=data['name'],
                tamanho_embalagem=data['size'],
                defaults={
                    'categoria': data['category'],
                    'preco': data['price'],
                    'estoque': data['stock'],
                    'descricao': data['description'],
                },
            )
            created += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(
                'Dados de demonstração prontos: São Jorge Super, Quaresma, '
                f'Felipe e {len(products)} produtos ({created} produto(s) novo(s)).'
            )
        )

    def _get_or_create_store(self, display_name, known_names, email, responsible):
        store = None
        for known_name in known_names:
            store = Supermercado.objects.filter(nome__iexact=known_name).order_by('pk').first()
            if store:
                break

        if store:
            if store.nome != display_name:
                store.nome = display_name
                store.save(update_fields=['nome'])
            return store

        store = Supermercado(
            nome=display_name,
            responsavel=responsible,
            email_comercial=email,
            endereco='Rua de Demonstração, 100',
            cidade='Floriano',
            estado='PI',
            cep='64800-000',
            telefone='(89) 00000-0000',
        )
        store.set_senha(DEMO_PASSWORD)
        store.save()
        return store

    def _get_or_create_customer(self):
        customer = Cliente.objects.filter(nome__iexact='felipe').order_by('pk').first()
        if customer:
            return customer

        customer = Cliente(
            nome='felipe',
            cpf='00000000000',
            email='felipe@example.com',
            cep='64800-000',
        )
        customer.set_senha(DEMO_PASSWORD)
        customer.save()
        return customer
