from importlib import import_module

from django.apps import apps
from rest_framework.test import APITestCase

from api.models import Ministerio, Usuario


class DjangoAdminSecurityTests(APITestCase):
    def setUp(self):
        self.ministerio = Ministerio.objects.create(nome="Ministerio Seguranca", slug="ministerio-seguranca")
        self.ministry_admin = Usuario.objects.create_user(
            username="admin-local",
            password="12345678",
            first_name="Admin",
            last_name="Local",
            funcao_principal="Teclado",
            nivel_acesso=1,
            ministerio=self.ministerio,
        )
        self.member = Usuario.objects.create_user(
            username="membro-local",
            password="12345678",
            first_name="Membro",
            last_name="Local",
            funcao_principal="Voz",
            nivel_acesso=3,
            ministerio=self.ministerio,
        )
        self.global_admin = Usuario.objects.create_user(
            username="admin-global",
            password="12345678",
            first_name="Admin",
            last_name="Global",
            funcao_principal="Admin",
            is_global_admin=True,
        )
        self.superuser = Usuario.objects.create_user(
            username="superuser-admin",
            password="12345678",
            first_name="Super",
            last_name="User",
            funcao_principal="Admin",
            is_superuser=True,
        )

    def test_sync_access_flags_restricts_staff_to_global_admin_or_superuser(self):
        self.assertFalse(self.ministry_admin.is_staff)
        self.assertFalse(self.member.is_staff)
        self.assertTrue(self.global_admin.is_staff)
        self.assertTrue(self.superuser.is_staff)

    def test_django_admin_denies_ministry_admin(self):
        self.assertTrue(self.client.login(username="admin-local", password="12345678"))

        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/?next=/admin/", response["Location"])

    def test_django_admin_denies_common_member(self):
        self.assertTrue(self.client.login(username="membro-local", password="12345678"))

        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/?next=/admin/", response["Location"])

    def test_django_admin_allows_global_admin_without_superuser(self):
        self.assertTrue(self.client.login(username="admin-global", password="12345678"))

        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 200)

    def test_django_admin_allows_superuser_without_global_admin(self):
        self.assertTrue(self.client.login(username="superuser-admin", password="12345678"))

        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 200)

    def test_staff_sanitization_migration_removes_legacy_local_staff(self):
        legacy_local = Usuario.objects.create_user(
            username="legado-local",
            password="12345678",
            funcao_principal="Violao",
            nivel_acesso=1,
            ministerio=self.ministerio,
        )
        legacy_member = Usuario.objects.create_user(
            username="legado-membro",
            password="12345678",
            funcao_principal="Baixo",
            nivel_acesso=3,
            ministerio=self.ministerio,
        )

        Usuario.objects.filter(id__in=[legacy_local.id, legacy_member.id]).update(is_staff=True)
        Usuario.objects.filter(id=self.global_admin.id).update(is_staff=False)
        Usuario.objects.filter(id=self.superuser.id).update(is_staff=False)

        migration = import_module("api.migrations.0011_restrict_staff_to_global_admin")
        migration.restrict_staff_to_global_admin(apps, None)

        legacy_local.refresh_from_db()
        legacy_member.refresh_from_db()
        self.global_admin.refresh_from_db()
        self.superuser.refresh_from_db()

        self.assertFalse(legacy_local.is_staff)
        self.assertFalse(legacy_member.is_staff)
        self.assertTrue(self.global_admin.is_staff)
        self.assertTrue(self.superuser.is_staff)
