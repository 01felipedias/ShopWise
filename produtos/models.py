from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class Supermercado(models.Model):
    nome = models.CharField(max_length=100)
    responsavel = models.CharField(max_length=100, blank=True)
    cnpj = models.CharField(max_length=20, blank=True)
    razao_social = models.CharField(max_length=150, blank=True)
    email_comercial = models.EmailField(blank=True)
    senha = models.CharField(max_length=128, blank=True)
    telefone = models.CharField(max_length=20, blank=True)

    cep = models.CharField(max_length=10, blank=True)
    estado = models.CharField(max_length=50, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    endereco = models.CharField(max_length=200)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def set_senha(self, senha):
        self.senha = make_password(senha)

    def verificar_senha(self, senha):
        return check_password(senha, self.senha)

    def __str__(self):
        return self.nome


class Produto(models.Model):
    supermercado = models.ForeignKey(
        Supermercado,
        on_delete=models.CASCADE,
        related_name='produtos',
        null=True,
        blank=True
    )

    nome = models.CharField(max_length=150)
    categoria = models.CharField(max_length=100)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    estoque = models.PositiveIntegerField()
    descricao = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Cliente(models.Model):
    nome = models.CharField(max_length=150)
    cpf = models.CharField(max_length=14, unique=True)
    email = models.EmailField(unique=True)
    cep = models.CharField(max_length=10)
    senha = models.CharField(max_length=128)
    criado_em = models.DateTimeField(auto_now_add=True)

    def set_senha(self, senha):
        self.senha = make_password(senha)

    def verificar_senha(self, senha):
        return check_password(senha, self.senha)

    def __str__(self):
        return self.nome


class Cupom(models.Model):
    TIPO_CHOICES = [
        ('percentual', 'Percentual'),
        ('valor', 'Valor fixo'),
    ]

    codigo = models.CharField(
        max_length=50,
        unique=True
    )

    descricao = models.CharField(
        max_length=200,
        blank=True
    )

    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='percentual'
    )

    valor = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    valor_minimo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    data_inicio = models.DateTimeField()

    data_fim = models.DateTimeField()

    ativo = models.BooleanField(default=True)

    limite_uso = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    usos = models.PositiveIntegerField(default=0)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.codigo


class Pedido(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aguardando_pagamento', 'Aguardando pagamento'),
        ('confirmado', 'Confirmado'),
        ('preparando', 'Preparando'),
        ('enviado', 'Enviado'),
        ('concluido', 'Concluído'),
        ('cancelado', 'Cancelado'),
    ]

    TIPO_ENTREGA_CHOICES = [
        ('delivery', 'Entrega'),
        ('pickup', 'Retirada'),
    ]

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='pedidos'
    )

    tipo_entrega = models.CharField(
        max_length=20,
        choices=TIPO_ENTREGA_CHOICES
    )

    endereco_entrega = models.CharField(
        max_length=255,
        blank=True
    )

    observacoes = models.TextField(blank=True)

    forma_pagamento = models.CharField(max_length=20)

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    desconto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    taxa_entrega = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    total = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='confirmado'
    )

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Pedido #{self.id} - {self.cliente.nome}'


class ItemPedido(models.Model):
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name='itens'
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT
    )

    supermercado = models.ForeignKey(
        Supermercado,
        on_delete=models.PROTECT
    )

    nome_produto = models.CharField(max_length=150)

    preco_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    quantidade = models.PositiveIntegerField()

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    def __str__(self):
        return f'{self.quantidade}x {self.nome_produto}'


class Pagamento(models.Model):
    pedido = models.OneToOneField(
        Pedido,
        on_delete=models.CASCADE,
        related_name='pagamento'
    )

    provedor = models.CharField(
        max_length=50,
        default='mercado_pago'
    )

    forma_pagamento = models.CharField(
        max_length=20,
        default='pix'
    )

    order_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True
    )

    payment_id = models.CharField(
        max_length=100,
        blank=True
    )

    status = models.CharField(
        max_length=50,
        default='pendente'
    )

    status_detail = models.CharField(
        max_length=100,
        blank=True
    )

    qr_code = models.TextField(blank=True)

    qr_code_base64 = models.TextField(blank=True)

    ticket_url = models.URLField(
        max_length=500,
        blank=True
    )

    criado_em = models.DateTimeField(auto_now_add=True)

    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Pagamento do Pedido #{self.pedido.id}'


class AlertaPreco(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='alertas_preco'
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name='alertas_preco'
    )

    preco_alvo = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    ativo = models.BooleanField(default=True)

    atingido = models.BooleanField(default=False)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['cliente', 'produto'],
                name='alerta_unico_cliente_produto'
            )
        ]

    def __str__(self):
        return (
            f'{self.cliente.nome} - '
            f'{self.produto.nome} - '
            f'R$ {self.preco_alvo}'
        )


class Notificacao(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='notificacoes'
    )

    alerta = models.ForeignKey(
        AlertaPreco,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notificacoes'
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    titulo = models.CharField(max_length=150)
    mensagem = models.TextField()

    lida = models.BooleanField(default=False)

    criada_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.cliente.nome} - {self.titulo}'


class Avaliacao(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )

    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )

    item_pedido = models.OneToOneField(
        ItemPedido,
        on_delete=models.CASCADE,
        related_name='avaliacao'
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name='avaliacoes'
    )

    nota = models.PositiveSmallIntegerField()

    preco_correto = models.BooleanField(
        default=True
    )

    entrega_ok = models.BooleanField(
        default=True
    )

    comentario = models.TextField(
        blank=True
    )

    criada_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizada_em = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return (
            f'{self.cliente.nome} - '
            f'{self.produto.nome} - '
            f'{self.nota} estrela(s)'
        )
