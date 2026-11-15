
from django.conf import settings
from django.utils.crypto import salted_hmac


def obtener_huella_password(user):
    return salted_hmac(
        'nexogestion.password.version',
        user.password,
        secret=settings.SECRET_KEY,
    ).hexdigest()
