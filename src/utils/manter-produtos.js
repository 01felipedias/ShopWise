// ==================================================
// BLINDAGEM SHOP-17: MANTER PRODUTOS
// ==================================================

(function() {
    console.log("Módulo Manter Produtos Lojista ativo.");

    const formProduto = document.getElementById('mpFormProduto');
    const tabelaProdutos = document.getElementById('mpTabelaProdutos');
    
    // Chave exclusiva para o LocalStorage do Lojista (evita conflito com o carrinho de compras)
    const LS_KEY = 'shopwise_lojista_produtos';

    // Função para buscar produtos salvos
    function getProdutos() {
        return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    }

    // Função para salvar produtos
    function setProdutos(produtos) {
        localStorage.setItem(LS_KEY, JSON.stringify(produtos));
    }

    // Função para desenhar a tabela na tela
    function renderizarTabela() {
        const produtos = getProdutos();
        tabelaProdutos.innerHTML = ''; // Limpa a tabela antes de desenhar

        if (produtos.length === 0) {
            tabelaProdutos.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #777; padding: 2rem;">Nenhum produto cadastrado no estoque ainda.</td></tr>';
            return;
        }

        produtos.forEach(produto => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${produto.nome}</strong><br>
                    <small style="color: #666;">${produto.descricao || 'Sem descrição'}</small>
                </td>
                <td style="text-transform: capitalize;">${produto.categoria}</td>
                <td>R$ ${parseFloat(produto.preco).toFixed(2).replace('.', ',')}</td>
                <td>${produto.estoque} un.</td>
                <td>
                    <a class="mp-action-link" onclick="window.removerProdutoMp(${produto.id})">Excluir</a>
                </td>
            `;
            tabelaProdutos.appendChild(tr);
        });
    }

    // Evento de clique no botão de Cadastrar
    if(formProduto) {
        formProduto.addEventListener('submit', function(event) {
            event.preventDefault(); // Evita que a página pisque/recarregue

            // 1. Captura os valores digitados
            const nome = document.getElementById('mpNome').value.trim();
            const categoria = document.getElementById('mpCategoria').value;
            const preco = document.getElementById('mpPreco').value;
            const estoque = document.getElementById('mpEstoque').value;
            const descricao = document.getElementById('mpDescricao').value.trim();

            // 2. Validação básica (SHOP-87)
            if(!nome || !categoria || !preco || !estoque) {
                alert("Por favor, preencha todos os campos obrigatórios (*).");
                return;
            }

            // 3. Cria o "pacote" do novo produto
            const novoProduto = {
                id: Date.now(), // Cria um ID único matemático
                nome: nome,
                categoria: categoria,
                preco: preco,
                estoque: estoque,
                descricao: descricao
            };

            // 4. Salva no estoque
            const produtos = getProdutos();
            produtos.push(novoProduto);
            setProdutos(produtos);

            // 5. Exibe Feedback (SHOP-90)
            alert("✅ Produto cadastrado com sucesso no estoque!");

            // 6. Limpa os campos e atualiza a tabela na tela
            formProduto.reset();
            renderizarTabela();
        });
    }

    // Função exposta para o botão de Excluir funcionar (caso ele cadastre errado)
    window.removerProdutoMp = function(id) {
        if(confirm("Tem certeza que deseja remover este produto do estoque?")) {
            let produtos = getProdutos();
            produtos = produtos.filter(p => p.id !== id); // Filtra tirando o produto excluído
            setProdutos(produtos);
            renderizarTabela(); // Atualiza a tela
        }
    };

    // Assim que a página abre, ele já mostra o que tem salvo
    renderizarTabela();

})();