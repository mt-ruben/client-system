
from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework.test import APITestCase


class UsuarioAPITest(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username='administrador',
            password='AdminPass-2026!',
            is_staff=True,
            is_superuser=False
        )

        self.responsable = User.objects.create_user(
            username='responsable',
            password='ResponsablePass-2026!',
            is_staff=False
        )

        self.url = reverse('usuario-list')

    def test_administrador_puede_registrar_responsable(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                'username': 'nuevo_responsable',
                'email': 'responsable@example.com',
                'first_name': 'Nuevo',
                'last_name': 'Responsable',
                'rol': 'responsable',
                'password': 'Una-Clave-Segura-2026!',
            },
            format='json'
        )

        self.assertEqual(response.status_code, 201)

        usuario = User.objects.get(
            username='nuevo_responsable'
        )

        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertTrue(usuario.is_active)
        self.assertTrue(
            usuario.check_password('Una-Clave-Segura-2026!')
        )
        self.assertNotIn('password', response.data)

    def test_administrador_puede_registrar_otro_administrador(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                'username': 'nuevo_admin',
                'email': 'admin@example.com',
                'rol': 'administrador',
                'password': 'Otra-Clave-Segura-2026!',
            },
            format='json'
        )

        self.assertEqual(response.status_code, 201)

        usuario = User.objects.get(
            username='nuevo_admin'
        )

        self.assertTrue(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)

    def test_responsable_no_puede_listar_usuarios(self):
        self.client.force_authenticate(user=self.responsable)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_responsable_no_puede_crear_usuarios(self):
        self.client.force_authenticate(user=self.responsable)

        response = self.client.post(
            self.url,
            {
                'username': 'usuario_no_autorizado',
                'rol': 'responsable',
                'password': 'Clave-Segura-2026!',
            },
            format='json'
        )

        self.assertEqual(response.status_code, 403)

    def test_no_se_permite_un_rol_invalido(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.url,
            {
                'username': 'usuario_invalido',
                'rol': 'superusuario',
                'password': 'Clave-Segura-2026!',
            },
            format='json'
        )

        self.assertEqual(response.status_code, 400)

    def test_no_se_puede_cambiar_rol_del_ultimo_administrador(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            reverse(
                'usuario-detail',
                kwargs={'pk': self.admin.pk}
            ),
            {
                'rol': 'responsable'
            },
            format='json'
        )

        self.assertEqual(response.status_code, 400)

        self.admin.refresh_from_db()

        self.assertTrue(self.admin.is_staff)

    def test_administrador_puede_modificar_rol(self):
        otro_admin = User.objects.create_user(
            username='otro_admin',
            password='OtraPass-2026!',
            is_staff=True
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            reverse(
                'usuario-detail',
                kwargs={'pk': self.responsable.pk}
            ),
            {
                'rol': 'administrador'
            },
            format='json'
        )

        self.assertEqual(response.status_code, 200)

        self.responsable.refresh_from_db()

        self.assertTrue(self.responsable.is_staff)

    def test_no_se_listan_superusuarios(self):
        User.objects.create_superuser(
            username='superusuario',
            password='SuperPass-2026!'
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)

        nombres = [
            usuario['username']
            for usuario in response.data['results']
        ]

        self.assertNotIn('superusuario', nombres)

    def test_no_se_permite_eliminar_usuario(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                'usuario-detail',
                kwargs={'pk': self.responsable.pk}
            )
        )

        self.assertEqual(response.status_code, 405)

        self.assertTrue(
            User.objects.filter(
                pk=self.responsable.pk
            ).exists()
        )

    def test_administrador_puede_desactivar_responsable(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                'usuario-desactivar',
                kwargs={'pk': self.responsable.pk}
            )
        )

        self.assertEqual(response.status_code, 200)

        self.responsable.refresh_from_db()

        self.assertFalse(self.responsable.is_active)

    def test_administrador_puede_reactivar_responsable(self):
        self.responsable.is_active = False
        self.responsable.save()

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                'usuario-activar',
                kwargs={'pk': self.responsable.pk}
            )
        )

        self.assertEqual(response.status_code, 200)

        self.responsable.refresh_from_db()

        self.assertTrue(self.responsable.is_active)

    def test_administrador_no_puede_desactivar_su_propia_cuenta(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                'usuario-desactivar',
                kwargs={'pk': self.admin.pk}
            )
        )

        self.assertEqual(response.status_code, 400)

        self.admin.refresh_from_db()

        self.assertTrue(self.admin.is_active)

    def test_administrador_puede_desactivar_otro_administrador(self):
        otro_admin = User.objects.create_user(
            username='otro_admin',
            password='OtraPass-2026!',
            is_staff=True
        )

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                'usuario-desactivar',
                kwargs={'pk': otro_admin.pk}
            )
        )

        self.assertEqual(response.status_code, 200)

        otro_admin.refresh_from_db()

        self.assertFalse(otro_admin.is_active)
        self.assertTrue(self.admin.is_active)

    def test_no_se_puede_reactivar_un_usuario_ya_activo(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                'usuario-activar',
                kwargs={'pk': self.responsable.pk}
            )
        )

        self.assertEqual(response.status_code, 400)

        self.responsable.refresh_from_db()

        self.assertTrue(self.responsable.is_active)

    def test_desactivar_usuario_ya_desactivado(self):
        self.responsable.is_active = False
        self.responsable.save()

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                'usuario-desactivar',
                kwargs={'pk': self.responsable.pk}
            )
        )

        self.assertEqual(response.status_code, 200)

        self.responsable.refresh_from_db()

        self.assertFalse(self.responsable.is_active)


class UsuarioJWTTest(APITestCase):

    def setUp(self):
        self.password = 'AdminPass-2026!'

        self.admin = User.objects.create_user(
            username='admin_jwt',
            password=self.password,
            is_staff=True,
            is_superuser=False,
            is_active=True
        )

        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.usuarios_url = reverse('usuario-list')

    def iniciar_sesion(self):
        return self.client.post(
            self.login_url,
            {
                'username': self.admin.username,
                'password': self.password
            },
            format='json'
        )

    def test_usuario_activo_puede_iniciar_sesion(self):
        response = self.iniciar_sesion()

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh_token', response.cookies)

    def test_usuario_desactivado_no_puede_iniciar_sesion(self):
        self.admin.is_active = False
        self.admin.save()

        response = self.iniciar_sesion()

        self.assertEqual(response.status_code, 401)

    def test_access_token_anterior_no_funciona_despues_de_desactivar(self):
        login = self.iniciar_sesion()

        self.assertEqual(login.status_code, 200)

        access = login.data['access']

        self.admin.is_active = False
        self.admin.save()

        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {access}'
        )

        response = self.client.get(
            self.usuarios_url
        )

        self.assertEqual(response.status_code, 401)

    def test_refresh_token_no_funciona_usuario_desactivado(self):
        login = self.iniciar_sesion()

        self.assertEqual(login.status_code, 200)

        self.admin.is_active = False
        self.admin.save()

        response = self.client.post(
            self.refresh_url,
            {},
            format='json'
        )

        self.assertEqual(response.status_code, 401)

    def test_usuario_reactivado_puede_iniciar_sesion(self):
        self.admin.is_active = False
        self.admin.save()

        self.admin.is_active = True
        self.admin.save()

        response = self.iniciar_sesion()

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)

    def test_refresh_token_se_renueva_y_el_anterior_se_invalida(self):
        login = self.iniciar_sesion()

        self.assertEqual(login.status_code, 200)

        refresh_anterior = self.client.cookies[
            'refresh_token'
        ].value

        renovacion = self.client.post(
            self.refresh_url,
            {},
            format='json'
        )

        self.assertEqual(renovacion.status_code, 200)
        self.assertIn('access', renovacion.data)

        refresh_nuevo = self.client.cookies[
            'refresh_token'
        ].value

        self.assertNotEqual(
            refresh_anterior,
            refresh_nuevo
        )

        self.client.cookies['refresh_token'] = refresh_anterior

        reutilizacion = self.client.post(
            self.refresh_url,
            {},
            format='json'
        )

        self.assertEqual(
            reutilizacion.status_code,
            401
        )
