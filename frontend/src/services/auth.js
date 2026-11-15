
import API_URL from "../config";

const TOKEN_STORAGE_KEY = "sistema_clientes_access_token";

// El access token permanece en memoria y en sessionStorage (persiste al hacer F5,
// pero se limpia al cerrar el navegador o la pestaña).
let accessToken = null;
let restorePromise = null;

function loadTokenFromStorage() {
    try {
        const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        if (stored) {
            accessToken = stored;
        }
    } catch {
        // sessionStorage no disponible o error de lectura.
    }
}

loadTokenFromStorage();

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token;

    if (token) {
        try {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
        } catch {
            // sessionStorage no disponible.
        }
    } else {
        try {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
            // sessionStorage no disponible.
        }
    }
}

export async function login(username, password) {
    const response = await fetch(`${API_URL}/api/token/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username,
            password,
        }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Usuario o contraseña incorrectos.");
        }

        throw new Error(
            data?.detail || "No se pudo iniciar sesión. Inténtalo nuevamente."
        );
    }

    if (!data?.access) {
        throw new Error("El servidor no devolvió el access token.");
    }

    setAccessToken(data.access);

    return data;
}
export function restoreSession() {
    if (restorePromise) {
        return restorePromise;
    }

    restorePromise = (async () => {
        try {
            let csrfToken = document.cookie
                .split("; ")
                .find((cookie) => cookie.startsWith("csrftoken="))
                ?.split("=")[1];

            if (!csrfToken) {
                const csrfResponse = await fetch(`${API_URL}/api/csrf/`, {
                    method: "GET",
                    credentials: "include",
                });

                if (!csrfResponse.ok) {
                    return false;
                }

                csrfToken = document.cookie
                    .split("; ")
                    .find((cookie) => cookie.startsWith("csrftoken="))
                    ?.split("=")[1];
            }

            if (!csrfToken) {
                return false;
            }

            const response = await fetch(`${API_URL}/api/token/refresh/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": decodeURIComponent(csrfToken),
                },
                body: JSON.stringify({}),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.access) {
                setAccessToken(null);
                return false;
            }

            setAccessToken(data.access);
            return true;

        } catch {
            setAccessToken(null);
            return false;
        }
    })();

    return restorePromise.finally(() => {
        restorePromise = null;
    });
}


export function logout() {
    setAccessToken(null);
}
