const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error("La variable VITE_API_URL no está configurada.");
}

export default API_URL;