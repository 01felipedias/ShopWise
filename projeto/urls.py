from django.contrib import admin
from django.urls import path
from django.shortcuts import render, redirect
from django.views.generic import TemplateView

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
    AlertaPrecoList,
    NotificacaoList,
    NotificacaoMarcarLida,
    AvaliacaoList,
    PerfilCliente,
    LogoutCliente,
    PedidosSupermercadoList,
    StatusPedidoSupermercado,
    PerfilSupermercado,
    LogoutSupermercado,
    TesteToken,
)


# =========================
# PÁGINAS DO FRONTEND
# =========================

def inicio(request):
    return redirect('login_usuario')


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


def pedidos(request):
    return render(request, 'pedidos.html')


def alerta_preco(request):
    return render(request, 'AlertaPreco.html')


def avaliacao(request):
    return render(request, 'avaliacao.html')


def perfil(request):
    return render(request, 'perfil.html')


urlpatterns = [

    # =========================
    # ADMINISTRAÇÃO
    # =========================
    path(
        'admin/',
        admin.site.urls
    ),

    # =========================
    # FRONTEND
    # =========================
    path(
        '',
        inicio,
        name='inicio'
    ),

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
    path(
        'perfil-supermercado.html',
        TemplateView.as_view(
            template_name='perfil-supermercado.html'
        ),
        name='perfil_supermercado'
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
    path(
        'carrinho.html',
        carrinho,
        name='carrinho'
    ),
    path(
        'checkout.html',
        checkout,
        name='checkout'
    ),
    path(
        'pedidos.html',
        pedidos,
        name='pedidos'
    ),
    path(
        'AlertaPreco.html',
        alerta_preco,
        name='alerta_preco'
    ),
    path(
        'avaliacao.html',
        avaliacao,
        name='avaliacao'
    ),
    path(
        'perfil.html',
        perfil,
        name='perfil'
    ),

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
    path(
        'api/perfil-supermercado/',
        PerfilSupermercado.as_view()
    ),
    path(
        'api/logout-supermercado/',
        LogoutSupermercado.as_view()
    ),

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
    path(
        'api/feed/produtos/',
        FeedProdutos.as_view()
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
    path(
        'api/perfil/',
        PerfilCliente.as_view()
    ),
    path(
        'api/logout-cliente/',
        LogoutCliente.as_view()
    ),

    # =========================
    # API - PEDIDOS
    # =========================
    path(
        'api/pedidos/',
        PedidoList.as_view()
    ),
    path(
        'api/pedidos/<int:pedido_id>/status-pix/',
        StatusPagamentoPix.as_view()
    ),
    path(
        'api/pedidos-supermercado/',
        PedidosSupermercadoList.as_view()
    ),
    path(
        'api/pedidos-supermercado/<int:pedido_id>/status/',
        StatusPedidoSupermercado.as_view()
    ),

    # =========================
    # API - CUPONS
    # =========================
    path(
        'api/cupons/',
        CupomList.as_view()
    ),

    # =========================
    # API - ALERTAS
    # =========================
    path(
        'api/alertas-preco/',
        AlertaPrecoList.as_view()
    ),
    path(
        'api/notificacoes/',
        NotificacaoList.as_view()
    ),
    path(
        'api/notificacoes/<int:notificacao_id>/marcar-lida/',
        NotificacaoMarcarLida.as_view()
    ),

    # =========================
    # API - AVALIAÇÕES
    # =========================
    path(
        'api/avaliacoes/',
        AvaliacaoList.as_view()
    ),

    # =========================
    # API - AUTHTOKEN
    # =========================
    path(
        'api/teste-token/',
        TesteToken.as_view()
    ),
]
