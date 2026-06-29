(function() {
    const loginForm = document.getElementById('lsLoginForm');

    if(loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o envio real (estamos no front-end)
            
            // Aqui você poderia validar email/senha se tivesse um back-end
            console.log("Login autorizado!");
            
            // Redireciona direto para o painel de produtos que você construiu
            window.location.href = 'manter-produtos.html';
        });
    }
})();