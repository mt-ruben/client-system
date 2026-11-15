from django.conf import settings
from django.http import HttpResponse


class SimpleCORSMiddleware:
    """Middleware mínimo de CORS para entornos sin django-cors-headers.

    Maneja las peticiones preflight OPTIONS antes de que lleguen a los
    middlewares de CSRF y Sesión, evitando que navegadores en otros
    orígenes se queden esperando una respuesta.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "")
        allowed_origins = getattr(
            settings,
            "CORS_ALLOWED_ORIGINS",
            ["http://localhost:5173", "http://127.0.0.1:5173"],
        )

        is_allowed = origin in allowed_origins

        # Responder preflight OPTIONS inmediatamente, sin pasar por CSRF/Session.
        if request.method == "OPTIONS" and is_allowed:
            response = HttpResponse(status=200)
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-CSRFToken"
            )
            response["Vary"] = "Origin"
            return response

        response = self.get_response(request)

        if is_allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-CSRFToken"
            )
            response["Vary"] = "Origin"

        return response
