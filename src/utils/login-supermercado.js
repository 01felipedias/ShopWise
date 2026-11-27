(function () {
    const loginForm = document.getElementById('lsLoginForm');
    const authFeedback = document.getElementById('authFeedback');

    function mostrarFeedbackLogin(mensagem) {
        authFeedback.textContent = mensagem;
        authFeedback.hidden = false;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const email = loginForm.elements['email'].value.trim();
            const senha = loginForm.elements['senha'].value;

            try {
                const resposta = await shopwiseFetch('/api/login-supermercado/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        senha: senha
                    })
                });

                const dados = await resposta.json();

                if (!resposta.ok) {
                    mostrarFeedbackLogin(dados.erro || 'E-mail ou senha inválidos.');
                    return;
                }

                if (dados.token) {
                    sessionStorage.setItem(
                        'shopwise_token_supermercado',
                        dados.token
                    );
                }

                // Guarda qual supermercado realizou o login
                localStorage.setItem(
                    'shopwise_supermercado',
                    JSON.stringify(dados.supermercado)
                );

                window.location.href = 'manter-produtos.html';

            } catch (erro) {
                console.error(erro);
                mostrarFeedbackLogin('Não foi possível conectar com o servidor.');
            }
        });
    }
})();
