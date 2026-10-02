from django.contrib import admin
from django.urls import path
from django.shortcuts import render

from produtos.views import (
    SupermercadoList,
    SupermercadoDetalhe,
    ProdutoList,
    ProdutoDetalhe,
    LoginSupermercado,
    ClienteList,
    LoginCliente,
    FeedProdutos,
    PedidoList,
    CupomList,
    StatusPagamentoPix,
)


# =========================
# PÁGINAS DO FRONTEND
# =========================

def inicio(request):
    return render(request, 'index.html')


def cadastro_mercado(request):
    return render(request, 'cadastromercado.html')


def login_supermercado(request):
    return render(request, 'login-supermercado.html')


def manter_produtos(request):
    return render(request, 'manter-produtos.html')


def cadastro_usuario(request):
    return render(request, 'cadastrousuario.html')


def login_usuario(request):
    return render(request, 'login.html')


def feed_produto(request):
    return render(request, 'feedproduto.html')


def carrinho(request):
    return render(request, 'carrinho.html')


def checkout(request):
    return render(request, 'checkout.html')


urlpatterns = [
    # Administração
    path('admin/', admin.site.urls),

    # =========================
    # FRONTEND
    # =========================
    path('', inicio, name='inicio'),

    # Supermercado
    path(
        'cadastromercado.html',
        cadastro_mercado,
        name='cadastro_mercado'
    ),
    path(
        'login-supermercado.html',
        login_supermercado,
        name='login_supermercado'
    ),
    path(
        'manter-produtos.html',
        manter_produtos,
        name='manter_produtos'
    ),

    # Cliente
    path(
        'cadastrousuario.html',
        cadastro_usuario,
        name='cadastro_usuario'
    ),
    path(
        'login.html',
        login_usuario,
        name='login_usuario'
    ),
    path(
        'feedproduto.html',
        feed_produto,
        name='feed_produto'
    ),
    path('carrinho.html',
         carrinho,
         name='carrinho'),

    path('checkout.html',
         checkout,
         name='checkout'),

    # =========================
    # API - SUPERMERCADO
    # =========================
    path(
        'api/supermercados/',
        SupermercadoList.as_view()
    ),
    path(
        'api/supermercados/<int:pk>/',
        SupermercadoDetalhe.as_view()
    ),
    path(
        'api/login-supermercado/',
        LoginSupermercado.as_view()
    ),
    path('api/feed/produtos/',
         FeedProdutos.as_view()),

    path('api/pedidos/',
         PedidoList.as_view()),

    path('api/cupons/',
         CupomList.as_view()),

    path(
        'api/pedidos/<int:pedido_id>/status-pix/',
        StatusPagamentoPix.as_view()),

    # =========================
    # API - PRODUTOS
    # =========================
    path(
        'api/produtos/',
        ProdutoList.as_view()
    ),
    path(
        'api/produtos/<int:pk>/',
        ProdutoDetalhe.as_view()
    ),

    # =========================
    # API - CLIENTE
    # =========================
    path(
        'api/clientes/',
        ClienteList.as_view()
    ),
    path(
        'api/login-cliente/',
        LoginCliente.as_view()
    ),
]
