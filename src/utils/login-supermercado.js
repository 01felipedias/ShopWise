(function () {
    const loginForm = document.getElementById('lsLoginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const email = loginForm.elements['email'].value.trim();
            const senha = loginForm.elements['senha'].value;

            try {
                const resposta = await fetch('/api/login-supermercado/', {
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
                    alert(dados.erro || 'E-mail ou senha inválidos.');
                    return;
                }

                // Guarda qual supermercado realizou o login
                localStorage.setItem(
                    'shopwise_supermercado',
                    JSON.stringify(dados.supermercado)
                );

                alert('Login realizado com sucesso!');
                window.location.href = 'manter-produtos.html';

            } catch (erro) {
                console.error(erro);
                alert('Não foi possível conectar com o servidor.');
            }
        });
    }
})();