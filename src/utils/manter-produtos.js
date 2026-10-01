// ==================================================
// SHOPWISE - MANTER PRODUTOS
// Integração com Django REST API
// ==================================================

(function () {
    console.log("Módulo Manter Produtos conectado à API.");

    const formProduto = document.getElementById('mpFormProduto');
    const tabelaProdutos = document.getElementById('mpTabelaProdutos');

    // Manual vs API
    const btnManual = document.getElementById('btnManual');
    const btnApi = document.getElementById('btnApi');
    const sessaoManual = document.getElementById('sessaoManual');
    const sessaoApi = document.getElementById('sessaoApi');

    // ==========================================
    // NAVEGAÇÃO MANUAL VS API
    // ==========================================

    if (btnManual && btnApi && sessaoManual && sessaoApi) {

        btnManual.addEventListener('click', () => {
            btnManual.classList.add('active');
            btnApi.classList.remove('active');

            sessaoManual.style.display = 'block';
            sessaoApi.style.display = 'none';
        });

        btnApi.addEventListener('click', () => {
            btnApi.classList.add('active');
            btnManual.classList.remove('active');

            sessaoApi.style.display = 'block';
            sessaoManual.style.display = 'none';
        });
    }

    // ==========================================
    // LISTAR PRODUTOS DO BANCO
    // ==========================================

    async function carregarProdutos() {

        if (!tabelaProdutos) return;

        try {

            const resposta = await fetch('/api/produtos/');

            if (!resposta.ok) {
                throw new Error('Erro ao buscar produtos.');
            }

            const produtos = await resposta.json();

            tabelaProdutos.innerHTML = '';

            if (produtos.length === 0) {
                tabelaProdutos.innerHTML = `
                    <tr>
                        <td colspan="5"
                            style="text-align:center; color:#777; padding:2rem;">
                            Nenhum produto cadastrado no estoque ainda.
                        </td>
                    </tr>
                `;
                return;
            }

            produtos.forEach(produto => {

                const tr = document.createElement('tr');

                tr.innerHTML = `
                    <td>
                        <strong>${produto.nome}</strong><br>
                        <small style="color:#666;">
                            ${produto.descricao || 'Sem descrição'}
                        </small>
                    </td>

                    <td style="text-transform:capitalize;">
                        ${produto.categoria}
                    </td>

                    <td>
                        R$ ${parseFloat(produto.preco)
                            .toFixed(2)
                            .replace('.', ',')}
                    </td>

                    <td>
                        ${produto.estoque} un.
                    </td>

                    <td>
                        <a class="mp-action-link"
                           href="#"
                           onclick="window.removerProdutoMp(${produto.id}); return false;">
                            Excluir
                        </a>
                    </td>
                `;

                tabelaProdutos.appendChild(tr);
            });

        } catch (erro) {

            console.error(erro);

            tabelaProdutos.innerHTML = `
                <tr>
                    <td colspan="5"
                        style="text-align:center; color:red; padding:2rem;">
                        Não foi possível carregar os produtos.
                    </td>
                </tr>
            `;
        }
    }

    // ==========================================
    // CADASTRAR PRODUTO
    // ==========================================

    if (formProduto) {

        formProduto.addEventListener('submit', async function (event) {

            event.preventDefault();

            const nome = document.getElementById('mpNome').value.trim();
            const categoria = document.getElementById('mpCategoria').value;
            const preco = document.getElementById('mpPreco').value;
            const estoque = document.getElementById('mpEstoque').value;
            const descricao = document.getElementById('mpDescricao').value.trim();

            if (!nome || !categoria || !preco || !estoque) {
                alert("Por favor, preencha todos os campos obrigatórios (*).");
                return;
            }

            const novoProduto = {
                nome: nome,
                categoria: categoria,
                preco: preco,
                estoque: parseInt(estoque),
                descricao: descricao
            };

            try {

                const resposta = await fetch('/api/produtos/', {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(novoProduto)
                });

                if (!resposta.ok) {
                    const erroApi = await resposta.json();
                    console.error(erroApi);
                    throw new Error('Erro ao cadastrar produto.');
                }

                alert("✅ Produto cadastrado com sucesso!");

                formProduto.reset();

                await carregarProdutos();

            } catch (erro) {

                console.error(erro);

                alert("Não foi possível cadastrar o produto.");
            }
        });
    }

    // ==========================================
    // EXCLUIR PRODUTO
    // ==========================================

    window.removerProdutoMp = async function (id) {

        const confirmar = confirm(
            "Tem certeza que deseja remover este produto do estoque?"
        );

        if (!confirmar) return;

        try {

            const resposta = await fetch(`/api/produtos/${id}/`, {
                method: 'DELETE'
            });

            if (!resposta.ok) {
                throw new Error('Erro ao excluir produto.');
            }

            alert("Produto excluído com sucesso!");

            await carregarProdutos();

        } catch (erro) {

            console.error(erro);

            alert("Não foi possível excluir o produto.");
        }
    };

    // ==========================================
    // CARREGAR AO ABRIR A PÁGINA
    // ==========================================

    carregarProdutos();

})();