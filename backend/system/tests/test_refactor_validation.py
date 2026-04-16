from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Usuario
from institutions.models import Igreja, Ministerio, VinculoMinisterioUsuario
from system.models import UserPermissionGrant


class RefactorArchitectureTests(APITestCase):
    """Smoke tests da arquitetura refatorada."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            username="admin",
            email="admin@lauda.com",
            password="admin123",
            is_global_admin=True,
            nivel_acesso=1,
        )
        cls.membro = Usuario.objects.create_user(
            username="membro",
            email="membro@lauda.com",
            password="membro123",
            nivel_acesso=3,
        )
        cls.igreja = Igreja.objects.create(
            nome="Igreja Teste",
            slug="igreja-teste",
        )
        cls.ministerio = Ministerio.objects.create(
            nome="Louvor",
            slug="louvor",
            igreja=cls.igreja,
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=cls.membro,
            ministerio=cls.ministerio,
            is_primary=True,
            is_active=True,
            papel_no_ministerio="MEMBRO",
        )

    def test_01_imports_e_models_carregados(self):
        from accounts.models import Usuario as UsuarioModel
        from events.models import Culto, Evento
        from music.models import Musica
        from system.models import UserPermissionGrant as UserPermissionGrantModel

        self.assertEqual(UsuarioModel._meta.app_label, "accounts")
        self.assertTrue(hasattr(UsuarioModel, "ministerio"))
        self.assertNotIn(
            "ministerio",
            {field.name for field in UsuarioModel._meta.get_fields() if getattr(field, "concrete", False)},
        )
        self.assertIsNotNone(Musica)
        self.assertIsNotNone(Evento)
        self.assertIsNotNone(Culto)
        self.assertIsNotNone(UserPermissionGrantModel)

    def test_02_paginacao_obrigatoria_na_api(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)

        response = client.get("/api/accounts/usuarios/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("results", response.data)
        self.assertIsInstance(response.data["results"], list)

    def test_03_regra_padrao_membro_nao_pode_criar_musica(self):
        client = APIClient()
        client.force_authenticate(user=self.membro)

        response = client.post(
            "/api/music/musicas/",
            {
                "titulo": "Nova Musica",
                "artista": "Teste",
                "tom_original": "C",
                "ministerio": self.ministerio.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_04_grant_explicito_permite_criacao_para_membro(self):
        UserPermissionGrant.objects.create(
            usuario=self.membro,
            permission_codename="music.add_musica",
            ministerio=self.ministerio,
            granted_by=self.admin,
            is_active=True,
        )

        client = APIClient()
        client.force_authenticate(user=self.membro)

        response = client.post(
            "/api/music/musicas/",
            {
                "titulo": "Musica com Grant",
                "artista": "Teste",
                "tom_original": "G",
                "ministerio": self.ministerio.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_05_blacklist_token_invalida_refresh_ao_revogar_grant(self):
        grant = UserPermissionGrant.objects.create(
            usuario=self.membro,
            permission_codename="music.add_musica",
            ministerio=self.ministerio,
            granted_by=self.admin,
            is_active=True,
        )
        refresh = RefreshToken.for_user(self.membro)
        outstanding = OutstandingToken.objects.get(jti=refresh["jti"])

        grant.is_active = False
        grant.save(update_fields=["is_active"])

        self.assertTrue(BlacklistedToken.objects.filter(token=outstanding).exists())

        response = self.client.post(
            "/api/token/refresh/",
            {"refresh": str(refresh)},
            format="json",
        )
        self.assertIn(response.status_code, {status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED})
