from rest_framework import serializers
from .models import Supermercado, Produto


class SupermercadoSerializer(serializers.ModelSerializer):
    senha = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Supermercado
        fields = '__all__'

    def create(self, validated_data):
        senha = validated_data.pop('senha', None)

        supermercado = Supermercado(**validated_data)

        if senha:
            supermercado.set_senha(senha)

        supermercado.save()
        return supermercado


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'
