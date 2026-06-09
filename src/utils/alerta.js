// Arquivo carrinho.js

// Função para simular o ajuste de um preço
function ajustarAlerta(botao) {
    // Busca o elemento do preço atual do alerta dentro deste card específico
    const cardBody = botao.closest('.alert-card').querySelector('.alert-price');
    
    let novoPreco = prompt("Digite o novo valor do alerta (Ex: 12,50):");
    
    if (novoPreco !== null && novoPreco.trim() !== "") {
        cardBody.textContent = `R$ ${novoPreco}`;
    }
}

// Função para excluir o card da lista
function excluirAlerta(botao) {
    // Pergunta de confirmação
    let confirmar = confirm("Tem certeza que deseja excluir este alerta?");
    
    if (confirmar) { 

        const cardParaExcluir = botao.closest('.alert-card');
        
        
        cardParaExcluir.remove();
        
        const lista = document.getElementById('alertsList');
        if (lista.children.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color: #777; margin-top: 20px;">Você não tem alertas cadastrados.</p>';
        }
    }
}
// Função disparada ao clicar no botão de criar alerta
function finalizarAlerta() {
  
    alert("✅ Alerta criado com sucesso! Nós te avisaremos quando atingir o preço alvo.");

    window.location.href = 'index.html'; 
}