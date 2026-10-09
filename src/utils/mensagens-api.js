window.ShopWiseMensagens = {
    conexao: 'Não foi possível conectar. Confira se o servidor está funcionando e tente novamente.',
    servidor: 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.',
    sessao: 'Sua sessão foi encerrada. Entre novamente para continuar.',
    dados(dados, padrao) {
        if (typeof dados?.detail === 'string') return dados.detail;
        const nomes = {nome: 'Nome', username: 'Usuário', email: 'E-mail', password: 'Senha',
            supermercado_nome: 'Nome do supermercado', supermercado_endereco: 'Endereço do supermercado',
            produto: 'Produto', categoria: 'Categoria', valor: 'Preço', estoque: 'Estoque',
            endereco: 'Endereço de entrega', observacoes: 'Observações', cupom: 'Cupom',
            itens: 'Produtos', quantidade: 'Quantidade', total_esperado: 'Total', status: 'Status',
            non_field_errors: 'Confira os dados'};
        const textos = [];
        function ler(valor, campo) {
            if (typeof valor === 'string') textos.push(`${nomes[campo] || 'Confira os dados'}: ${valor}`);
            else if (Array.isArray(valor)) valor.forEach(item => ler(item, campo));
            else if (valor && typeof valor === 'object') Object.entries(valor).forEach(([chave, item]) => ler(item, chave));
        }
        if (dados && typeof dados === 'object') Object.entries(dados).forEach(([campo, valor]) => ler(valor, campo));
        return textos.join(' ') || padrao;
    },
    falha(erro) {
        return erro instanceof TypeError || erro instanceof SyntaxError
            ? this.conexao : (erro.message || this.conexao);
    }
};
