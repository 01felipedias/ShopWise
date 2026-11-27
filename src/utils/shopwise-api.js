window.shopwiseFetch = async function (url, options = {}) {
    const destino = new URL(url, window.location.href);
    const metodo = (options.method || "GET").toUpperCase();

    const tokenMercado = sessionStorage.getItem(
        "shopwise_token_supermercado"
    );

    const rotaProdutos = /^\/api\/produtos\//.test(
        destino.pathname
    );

    if (
        destino.origin === window.location.origin &&
        rotaProdutos &&
        tokenMercado
    ) {
        const headers = new Headers(options.headers || {});
        headers.set("Authorization", "Token " + tokenMercado);

        const resposta = await fetch(url, {
            ...options,
            headers,
            credentials: "same-origin"
        });

        if (resposta.status === 401) {
            sessionStorage.removeItem(
                "shopwise_token_supermercado"
            );
        }

        return resposta;
    }


    if (
        destino.origin !== window.location.origin ||
        !destino.pathname.startsWith("/api/") ||
        ["GET", "HEAD", "OPTIONS", "TRACE"].includes(metodo)
    ) {
        return fetch(url, options);
    }

    let token = document.cookie
        .split("; ")
        .find(item => item.startsWith("csrftoken="))
        ?.split("=")[1];

    if (!token) {
        const resposta = await fetch("/api/csrf/", {
            credentials: "same-origin"
        });

        if (!resposta.ok) {
            throw new Error("Falha ao obter CSRF.");
        }

        const dados = await resposta.json();
        token = dados.csrfToken;
    }

    const headers = new Headers(options.headers || {});
    headers.set("X-CSRFToken", token);

    return fetch(url, {
        ...options,
        headers,
        credentials: "same-origin"
    });
};
