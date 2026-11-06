
import API_URL from "../config";


// El access token permanece únicamente en memoria.
let accessToken = null;
let restorePromise = null;
export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token;
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
