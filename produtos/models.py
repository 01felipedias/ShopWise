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
