from django.contrib import admin
from django.urls import path
from django.shortcuts import render

from produtos.views import (
    SupermercadoList,
    SupermercadoDetalhe,
    ProdutoList,
    ProdutoDetalhe,
)


def inicio(request):
    return render(request, 'index.html')


def cadastro_mercado(request):
    return render(request, 'cadastromercado.html')


def manter_produtos(request):
    return render(request, 'manter-produtos.html')


urlpatterns = [
    path('admin/', admin.site.urls),

    # Frontend
    path('', inicio, name='inicio'),
    path('cadastromercado.html', cadastro_mercado, name='cadastro_mercado'),
    path('manter-produtos.html', manter_produtos, name='manter_produtos'),

    # API
    path('api/supermercados/', SupermercadoList.as_view()),
    path('api/supermercados/<int:pk>/', SupermercadoDetalhe.as_view()),

    path('api/produtos/', ProdutoList.as_view()),
    path('api/produtos/<int:pk>/', ProdutoDetalhe.as_view()),
]
