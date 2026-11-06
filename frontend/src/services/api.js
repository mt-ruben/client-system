import API_URL from "../config";
import {
    getAccessToken,
    setAccessToken,
} from "./auth";


let refreshPromise = null;
// Obtiene la cookie CSRF o solicita que Django la genere.
async function getCSRFToken() {
    let csrfToken = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("csrftoken="))
        ?.split("=")[1];

    if (!csrfToken) {
        const response = await fetch(`${API_URL}/api/csrf/`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("No se pudo obtener el token CSRF.");
        }

        csrfToken = document.cookie
            .split("; ")
            .find((cookie) => cookie.startsWith("csrftoken="))
            ?.split("=")[1];
    }

    if (!csrfToken) {
        throw new Error("No se encontró la cookie CSRF.");
    }

    return decodeURIComponent(csrfToken);
}
// Solicita a Django cerrar la sesión e invalidar el refresh token.

export async function logoutRequest() {
    try {
        const csrfToken = await getCSRFToken();

        let accessToken = getAccessToken();

        // Si no existe un access token, intentamos renovarlo.
        if (!accessToken) {
            accessToken = await refreshAccessToken();
        }

        let response = await fetch(`${API_URL}/api/logout/`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "X-CSRFToken": csrfToken,
            },
        });

        // Si el access expiró, lo renovamos y reintentamos el logout.
        if (response.status === 401) {
            accessToken = await refreshAccessToken();

            response = await fetch(`${API_URL}/api/logout/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "X-CSRFToken": csrfToken,
                },
            });
        }

        if (!response.ok && response.status !== 205) {
            throw new Error("No se pudo cerrar la sesión en el servidor.");
        }

    } finally {
        setAccessToken(null);
    }
}

// Solicita un nuevo access utilizando la cookie refresh HttpOnly.
function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const csrfToken = await getCSRFToken();

            const response = await fetch(`${API_URL}/api/token/refresh/`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                },
                body: JSON.stringify({}),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok || !data?.access) {
                throw new Error("No se pudo renovar la sesión.");
            }

            setAccessToken(data.access);

            return data.access;

        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// Elimina el access token y regresa al login.
function expireSession() {
    setAccessToken(null);

    if (window.location.pathname !== "/login") {
        window.location.assign("/login");
    }
}

// Ejecuta una petición HTTP con autenticación JWT.
export async function apiRequest(endpoint, options = {}) {
    const headers = {
        ...options.headers,
    };

    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const sendRequest = (token) => {
        const requestHeaders = { ...headers };

        if (token) {
            requestHeaders["Authorization"] = `Bearer ${token}`;
        }

        return fetch(`${API_URL}${endpoint}`, {
            ...options,
            credentials: "include",
            headers: requestHeaders,
        });
    };

    let accessToken = getAccessToken();
    let response = await sendRequest(accessToken);

    // Si el access expiró o no existe, intentamos renovarlo.
    if (response.status === 401) {
        try {
            accessToken = await refreshAccessToken();
            response = await sendRequest(accessToken);
        } catch {
            expireSession();

            throw new Error(
                "Tu sesión ha expirado. Inicia sesión nuevamente."
            );
        }
    }

    if (response.status === 204 || response.status === 205) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            data?.detail ||
            "No se pudo completar la operación."
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}
