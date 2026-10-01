from rest_framework import serializers
from .models import Supermercado, Produto


class SupermercadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supermercado
        fields = '__all__'


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'
