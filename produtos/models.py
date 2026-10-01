from django.db import models


class Supermercado(models.Model):
    nome = models.CharField(max_length=100)
    endereco = models.CharField(max_length=200)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class Produto(models.Model):
    nome = models.CharField(max_length=150)
    categoria = models.CharField(max_length=100)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    estoque = models.PositiveIntegerField()
    descricao = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome
