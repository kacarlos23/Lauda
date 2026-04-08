import importlib
from unittest.mock import patch

from django.apps import apps as django_apps
from rest_framework.permissions import SAFE_METHODS
from rest_framework.test import APIRequestFactory
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    ApiRequestErrorLog,
    ConviteMinisterio,
    Culto,
    Evento,
    Igreja,
    IgrejaModulo,
    LogAuditoria,
    Ministerio,
    Modulo,
    Musica,
    Team,
    Usuario,
    VinculoIgrejaUsuario,
    VinculoMinisterioUsuario,
)
from api.constants import (
    CAPABILITY_MANAGE_CHURCH,
    CAPABILITY_MANAGE_MEMBERS,
    CAPABILITY_MANAGE_MUSIC,
    CAPABILITY_MANAGE_PLATFORM,
    MODULE_KEY_EVENTS,
    MODULE_KEY_MUSIC,
)
from api.permissions import HasChurchCapability
from api.services.access_context import resolve_scoped_ministry
from api.services.agenda import AGENDA_SOURCE_TYPE_CULTO, list_institutional_agenda, sync_culto_evento
from api.services.authorization import build_authorization_snapshot, has_capability
from api.services.governance import get_governance_snapshot
from api.services.institutional_context import (
    get_user_igreja,
    get_user_igreja_membership,
    get_user_ministerio,
    get_user_ministerio_membership,
)
from api.services.music_module import apply_music_enrichment
from api.services.module_blueprint import build_module_expansion_blueprint
from api.services.modular_context import get_active_module_keys_for_church
from api.services.session_payload import build_user_payload
from api.services.normalization import build_query, normalize_text, score_track_title


class NormalizationServiceTests(APITestCase):
    def test_normalize_text_removes_accents(self):
        self.assertEqual(normalize_text("Eter Worship"), "eter worship")

    def test_build_query_prefers_title_and_artist(self):
        self.assertEqual(build_query(title="Oceans", artist="Hillsong", fallback_query="x"), "Oceans Hillsong")

    def test_live_title_scores_higher(self):
        self.assertGreater(score_track_title("Oceans Live"), 0)


class MusicEnrichmentEndpointTests(APITestCase):
    def setUp(self):
        self.ministerio = Ministerio.objects.create(nome="Ministerio Teste", slug="ministerio-teste")
        self.user = Usuario.objects.create_user(
            username="tester-global",
            password="12345678",
            funcao_principal="Admin",
            is_global_admin=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.user)

    @patch("api.views.MusicFacade.find_complete_music_data")
    def test_enrichment_endpoint_returns_normalized_payload(self, mocked_find):
        mocked_find.return_value = {
            "title": "Oceans",
            "artist": "Hillsong United",
            "cover": "https://example.com/cover.jpg",
            "preview": "https://example.com/preview.mp3",
            "lyrics_link": "https://genius.com/example",
            "isrc": "BR1234567890",
            "source": "spotify_genius_hybrid",
        }

        response = self.client.post(
            "/api/musicas/enriquecer/",
            {"title": "Oceans", "artist": "Hillsong United"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Oceans")
        self.assertEqual(response.data["source"], "spotify_genius_hybrid")

    def test_enrichment_requires_some_query_information(self):
        response = self.client.post("/api/musicas/enriquecer/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MusicCrudWithMetadataTests(APITestCase):
    def setUp(self):
        self.ministerio = Ministerio.objects.create(nome="Ministerio Editor", slug="ministerio-editor")
        self.user = Usuario.objects.create_user(
            username="editor-global",
            password="12345678",
            funcao_principal="Admin",
            is_global_admin=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_create_music_with_external_metadata_fields(self):
        payload = {
            "titulo": "Oceans",
            "artista": "Hillsong United",
            "tom_original": "C",
            "link_audio": "https://open.spotify.com/track/example",
            "link_letra": "https://genius.com/example",
            "spotify_id": "spotify-123",
            "genius_id": "genius-456",
            "isrc": "BR1234567890",
            "cover_url": "https://example.com/cover.jpg",
            "preview_url": "https://example.com/preview.mp3",
            "metadata_source": "spotify_genius_hybrid",
            "metadata_last_synced_at": "2026-03-31T21:00:00-03:00",
        }

        response = self.client.post("/api/musicas/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["spotify_id"], "spotify-123")

    def test_patch_music_with_external_metadata_fields(self):
        musica = Musica.objects.create(ministerio=self.ministerio, titulo="Teste", artista="Autor", tom_original="G")
        payload = {
            "cover_url": "https://example.com/cover.jpg",
            "preview_url": "https://example.com/preview.mp3",
            "link_letra": "https://genius.com/example",
            "metadata_source": "spotify_genius_hybrid",
            "metadata_last_synced_at": "2026-03-31T21:00:00-03:00",
        }

        response = self.client.patch(f"/api/musicas/{musica.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["metadata_source"], "spotify_genius_hybrid")

    def test_create_music_with_optional_duration(self):
        payload = {
            "titulo": "Oceans",
            "artista": "Hillsong United",
            "tom_original": "C",
            "duracao": "05:32",
        }

        response = self.client.post("/api/musicas/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["duracao"], "05:32")

    def test_create_music_rejects_invalid_duration_format(self):
        payload = {
            "titulo": "Oceans",
            "artista": "Hillsong United",
            "tom_original": "C",
            "duracao": "5:90",
        }

        response = self.client.post("/api/musicas/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("duracao", response.data)

    def test_create_culto_without_local_and_end_time(self):
        payload = {
            "ministerio": self.ministerio.id,
            "nome": "Culto de Domingo",
            "data": "2026-04-06",
            "horario_inicio": "19:00:00",
            "status": "AGENDADO",
        }

        response = self.client.post("/api/cultos/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["horario_termino"])
        self.assertIsNone(response.data["local"])

    def test_create_culto_accepts_blank_strings_for_optional_fields(self):
        payload = {
            "ministerio": self.ministerio.id,
            "nome": "Culto com vazios",
            "data": "2026-04-06",
            "horario_inicio": "19:00:00",
            "horario_termino": "",
            "local": "",
            "status": "AGENDADO",
        }

        response = self.client.post("/api/cultos/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["horario_termino"])
        self.assertIsNone(response.data["local"])

    def test_create_music_accepts_blank_duration(self):
        payload = {
            "titulo": "Musica sem duracao",
            "artista": "Autor",
            "tom_original": "C",
            "duracao": "",
        }

        response = self.client.post("/api/musicas/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["duracao"])

    def test_create_music_accepts_valid_classificacao_value(self):
        payload = {
            "titulo": "Oceans",
            "artista": "Hillsong United",
            "tom_original": "C",
            "classificacao": "adoracao",
        }

        response = self.client.post("/api/musicas/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["classificacao"], "adoracao")

    def test_create_music_rejects_invalid_classificacao_value(self):
        payload = {
            "titulo": "Oceans",
            "artista": "Hillsong United",
            "tom_original": "C",
            "classificacao": "invalida",
        }

        response = self.client.post("/api/musicas/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("classificacao", response.data)


class MultiMinisterioAuthTests(APITestCase):
    def setUp(self):
        self.ministerio = Ministerio.objects.create(nome="Ministerio Sede", slug="ministerio-sede")
        self.convite = ConviteMinisterio.objects.create(
            ministerio=self.ministerio,
            email="membro@example.com",
            nome_convidado="Novo Membro",
            nivel_acesso=3,
        )
        self.global_admin = Usuario.objects.create_user(
            username="superadmin",
            password="12345678",
            funcao_principal="Admin",
            email="admin-global@example.com",
            is_global_admin=True,
            is_staff=True,
            is_superuser=True,
        )
        self.unbound_user = Usuario.objects.create_user(
            username="sem-vinculo",
            password="12345678",
            email="sem-vinculo@example.com",
            first_name="Sem",
            last_name="Vinculo",
            nivel_acesso=3,
        )

    def authenticate_as_impersonated_admin(self, ministry):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.post(
            "/api/auth/admin/impersonate/",
            {"ministerio_id": ministry.id if ministry else None},
            format="json",
        )
        self.client.force_authenticate(user=None)
        if response.status_code == status.HTTP_200_OK:
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return response

    def test_lookup_invite_by_code(self):
        response = self.client.get(f"/api/auth/invites/{self.convite.access_code}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ministerio"]["slug"], "ministerio-sede")
        self.assertEqual(response.data["nivel_acesso_label"], "Membro")
        self.assertEqual(response.data["code_source"], "CONVITE")

    def test_lookup_ministry_access_code_returns_member_entrypoint(self):
        response = self.client.get(f"/api/auth/invites/{self.ministerio.access_code}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ministerio"]["slug"], "ministerio-sede")
        self.assertEqual(response.data["code_source"], "MINISTERIO")
        self.assertEqual(response.data["nivel_acesso"], 3)

    def test_lookup_ministry_access_code_rejects_closed_ministry(self):
        self.ministerio.is_open = False
        self.ministerio.save(update_fields=["is_open"])

        response = self.client.get(f"/api/auth/invites/{self.ministerio.access_code}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accept_invite_creates_bound_user_and_returns_tokens(self):
        payload = {
            "code": self.convite.access_code,
            "username": "membro1",
            "password": "12345678",
            "first_name": "Membro",
            "last_name": "Teste",
            "email": "membro@example.com",
            "funcao_principal": "Vocalista",
        }

        response = self.client.post("/api/auth/invites/accept/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        usuario = Usuario.objects.get(username="membro1")
        self.assertEqual(usuario.ministerio_id, self.ministerio.id)
        self.assertFalse(usuario.is_global_admin)
        self.convite.refresh_from_db()
        self.assertEqual(self.convite.status, "ACEITO")

    def test_accept_ministry_access_code_creates_member_user(self):
        payload = {
            "code": self.ministerio.access_code,
            "username": "membro-por-ministerio",
            "password": "12345678",
            "first_name": "Membro",
        }

        response = self.client.post("/api/auth/invites/accept/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        usuario = Usuario.objects.get(username="membro-por-ministerio")
        self.assertEqual(usuario.ministerio_id, self.ministerio.id)
        self.assertEqual(usuario.nivel_acesso, 3)

    def test_ministry_login_rejects_global_admin(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "admin-global@example.com", "password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_login_accepts_user_without_ministry(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "sem-vinculo@example.com", "password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["user"]["ministerio_id"])
        self.assertFalse(response.data["user"]["is_global_admin"])
        self.assertFalse(response.data["user"]["is_superuser"])

    def test_admin_login_accepts_global_admin(self):
        response = self.client.post(
            "/api/auth/admin/login/",
            {"username": "superadmin", "password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["user"]["is_global_admin"])
        self.assertTrue(response.data["user"]["is_superuser"])
        self.assertEqual(response.data["user"]["escopo_acesso"], "GLOBAL")
        self.assertEqual(response.data["user"]["papel_display"], "Admin Global")

    def test_global_admin_can_impersonate_ministry_and_me_reflects_scope(self):
        response = self.authenticate_as_impersonated_admin(self.ministerio)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["user"]["is_global_admin"])
        self.assertTrue(response.data["user"]["is_superuser"])
        self.assertTrue(response.data["user"]["is_impersonating"])
        self.assertEqual(response.data["user"]["ministerio_id"], self.ministerio.id)
        self.assertEqual(response.data["user"]["ministerio_slug"], self.ministerio.slug)

        me_response = self.client.get("/api/usuarios/me/")

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertTrue(me_response.data["is_global_admin"])
        self.assertTrue(me_response.data["is_superuser"])
        self.assertTrue(me_response.data["is_impersonating"])
        self.assertEqual(me_response.data["ministerio_id"], self.ministerio.id)
        self.assertEqual(me_response.data["ministerio_nome"], self.ministerio.nome)

    def test_global_admin_can_exit_impersonation(self):
        self.client.force_authenticate(user=self.global_admin)

        response = self.client.post(
            "/api/auth/admin/impersonate/",
            {"ministerio_id": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["user"]["is_global_admin"])
        self.assertFalse(response.data["user"]["is_impersonating"])
        self.assertIsNone(response.data["user"]["ministerio_id"])

    def test_non_global_admin_cannot_impersonate_ministry(self):
        self.client.force_authenticate(user=self.unbound_user)

        response = self.client.post(
            "/api/auth/admin/impersonate/",
            {"ministerio_id": self.ministerio.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_can_bind_by_fixed_access_code(self):
        self.client.force_authenticate(user=self.unbound_user)

        response = self.client.post(
            "/api/auth/access-code/bind/",
            {"code": self.ministerio.access_code},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.unbound_user.refresh_from_db()
        self.assertEqual(self.unbound_user.ministerio_id, self.ministerio.id)
        self.assertEqual(self.unbound_user.nivel_acesso, 3)
        self.assertEqual(response.data["user"]["ministerio_id"], self.ministerio.id)

    def test_authenticated_user_can_bind_by_invite_code(self):
        self.convite.email = self.unbound_user.email
        self.convite.save(update_fields=["email"])
        self.client.force_authenticate(user=self.unbound_user)

        response = self.client.post(
            "/api/auth/access-code/bind/",
            {"code": self.convite.access_code},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.unbound_user.refresh_from_db()
        self.convite.refresh_from_db()
        self.assertEqual(self.unbound_user.ministerio_id, self.ministerio.id)
        self.assertEqual(self.unbound_user.nivel_acesso, self.convite.nivel_acesso)
        self.assertEqual(self.convite.status, "ACEITO")


class MultiMinisterioIsolationTests(APITestCase):
    def setUp(self):
        self.ministerio_a = Ministerio.objects.create(nome="Ministerio A", slug="ministerio-a")
        self.ministerio_b = Ministerio.objects.create(nome="Ministerio B", slug="ministerio-b")
        self.admin_a = Usuario.objects.create_user(
            username="admin-a",
            password="12345678",
            funcao_principal="Lider",
            nivel_acesso=1,
            ministerio=self.ministerio_a,
        )
        self.admin_b = Usuario.objects.create_user(
            username="admin-b",
            password="12345678",
            funcao_principal="Lider",
            nivel_acesso=1,
            ministerio=self.ministerio_b,
        )
        self.global_admin = Usuario.objects.create_user(
            username="global-admin",
            password="12345678",
            funcao_principal="Admin",
            is_global_admin=True,
            is_superuser=True,
            is_staff=True,
        )
        self.musica_a = Musica.objects.create(
            ministerio=self.ministerio_a,
            titulo="Cancao A",
            artista="Artista A",
            tom_original="C",
        )
        self.musica_b = Musica.objects.create(
            ministerio=self.ministerio_b,
            titulo="Cancao B",
            artista="Artista B",
            tom_original="D",
        )
        self.culto_a = Culto.objects.create(
            ministerio=self.ministerio_a,
            nome="Culto A",
            data="2026-04-01",
            horario_inicio="19:00:00",
            horario_termino="21:00:00",
            local="Templo A",
        )
        self.culto_b = Culto.objects.create(
            ministerio=self.ministerio_b,
            nome="Culto B",
            data="2026-04-02",
            horario_inicio="20:00:00",
            horario_termino="22:00:00",
            local="Templo B",
        )

    def authenticate_as_impersonated_admin(self, ministry):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.post(
            "/api/auth/admin/impersonate/",
            {"ministerio_id": ministry.id},
            format="json",
        )
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return response

    def test_ministry_admin_lists_global_music_catalog(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get("/api/musicas/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_ministry_admin_can_access_music_created_by_other_ministry(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(f"/api/musicas/{self.musica_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ministry_admin_create_music_is_saved_as_global_catalog(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.post(
            "/api/musicas/",
            {
                "titulo": "Nova Musica",
                "artista": "Artista",
                "tom_original": "E",
                "ministerio": self.ministerio_b.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["ministerio"])

    def test_ministry_admin_cannot_create_scale_with_foreign_member(self):
        membro_b = Usuario.objects.create_user(
            username="membro-b",
            password="12345678",
            funcao_principal="Voz",
            ministerio=self.ministerio_b,
        )
        culto_a = self.ministerio_a.cultos.create(
            nome="Culto A",
            data="2026-04-01",
            horario_inicio="19:00:00",
            horario_termino="21:00:00",
            local="Templo A",
        )
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.post(
            "/api/escalas/",
            {"culto": culto_a.id, "membro": membro_b.id, "status_confirmacao": "PENDENTE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("membro", response.data)

    def test_global_admin_lists_all_music(self):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.get("/api/musicas/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_impersonated_global_admin_scopes_cultos_to_selected_ministry(self):
        response = self.authenticate_as_impersonated_admin(self.ministerio_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cultos_response = self.client.get("/api/cultos/")

        self.assertEqual(cultos_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cultos_response.data), 1)
        self.assertEqual(cultos_response.data[0]["id"], self.culto_a.id)

    def test_impersonated_global_admin_can_create_culto_without_explicit_ministry(self):
        response = self.authenticate_as_impersonated_admin(self.ministerio_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            "/api/cultos/",
            {
                "nome": "Culto Impersonado",
                "data": "2026-04-03",
                "horario_inicio": "18:30:00",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["ministerio"], self.ministerio_a.id)


class UserAccessLevelSyncTests(APITestCase):
    def setUp(self):
        self.ministerio = Ministerio.objects.create(nome="Ministerio Sync", slug="ministerio-sync")
        self.admin = Usuario.objects.create_user(
            username="admin-sync",
            password="12345678",
            funcao_principal="Lider",
            nivel_acesso=1,
            ministerio=self.ministerio,
        )
        self.member = Usuario.objects.create_user(
            username="member-sync",
            password="12345678",
            funcao_principal="Voz",
            nivel_acesso=3,
            ministerio=self.ministerio,
        )
        self.global_admin = Usuario.objects.create_user(
            username="global-admin-sync",
            password="12345678",
            funcao_principal="Admin",
            is_global_admin=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_ministry_admin_cannot_create_users(self):
        response = self.client.post(
            "/api/usuarios/",
            {
                "username": "novo-admin",
                "password": "12345678",
                "first_name": "Novo",
                "funcao_principal": "Teclado",
                "nivel_acesso": 1,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(username="novo-admin").exists())

    def test_ministry_admin_cannot_update_other_users(self):
        promote_response = self.client.patch(
            f"/api/usuarios/{self.member.id}/",
            {"nivel_acesso": 1},
            format="json",
        )
        self.assertEqual(promote_response.status_code, status.HTTP_403_FORBIDDEN)
        self.member.refresh_from_db()
        self.assertEqual(self.member.nivel_acesso, 3)
        self.assertFalse(self.member.is_staff)

    def test_django_admin_rejects_ministry_admin_and_accepts_global_admin(self):
        self.client.force_authenticate(user=None)

        self.assertTrue(self.client.login(username="admin-sync", password="12345678"))
        ministry_response = self.client.get("/admin/")
        self.assertEqual(ministry_response.status_code, status.HTTP_302_FOUND)
        self.assertIn("/admin/login/?next=/admin/", ministry_response["Location"])

        self.client.logout()
        self.assertTrue(self.client.login(username="global-admin-sync", password="12345678"))
        global_response = self.client.get("/admin/")
        self.assertEqual(global_response.status_code, status.HTTP_200_OK)

    def test_me_endpoint_returns_ministry_slug(self):
        response = self.client.get("/api/usuarios/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ministerio_slug"], self.ministerio.slug)
        self.assertEqual(response.data["nivel_acesso_label"], "Administrador")
        self.assertEqual(response.data["escopo_acesso"], "MINISTERIO")
        self.assertEqual(response.data["papel_display"], "Administrador")
        self.assertFalse(response.data["is_superuser"])

    def test_me_endpoint_updates_funcoes_with_allowed_values(self):
        response = self.client.patch(
            "/api/usuarios/me/",
            {"funcoes": ["Teclado", "Piano"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.funcoes, ["Teclado", "Piano"])
        self.assertEqual(self.admin.funcao_principal, "Teclado")

    def test_me_endpoint_rejects_invalid_funcoes(self):
        response = self.client.patch(
            "/api/usuarios/me/",
            {"funcoes": ["Funcao Invalida"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("funcoes", response.data)


class TenantHardeningTests(APITestCase):
    def setUp(self):
        self.ministerio_a = Ministerio.objects.create(nome="Ministerio A", slug="ministerio-a-hardening")
        self.ministerio_b = Ministerio.objects.create(nome="Ministerio B", slug="ministerio-b-hardening")
        self.admin_a = Usuario.objects.create_user(
            username="admin-hardening",
            password="12345678",
            funcao_principal="Lider",
            nivel_acesso=1,
            ministerio=self.ministerio_a,
        )
        self.member_a = Usuario.objects.create_user(
            username="member-hardening",
            password="12345678",
            funcao_principal="Voz",
            nivel_acesso=3,
            ministerio=self.ministerio_a,
        )
        self.global_admin = Usuario.objects.create_user(
            username="global-hardening",
            password="12345678",
            funcao_principal="Admin",
            is_global_admin=True,
            is_superuser=True,
            is_staff=True,
        )
        self.musica_a = Musica.objects.create(
            ministerio=self.ministerio_a,
            titulo="Cancao Base",
            artista="Artista Base",
            tom_original="C",
        )
        self.culto_a = self.ministerio_a.cultos.create(
            nome="Culto Base",
            data="2026-04-06",
            horario_inicio="19:00:00",
            horario_termino="21:00:00",
            local="Templo Central",
        )
        self.convite = ConviteMinisterio.objects.create(
            ministerio=self.ministerio_a,
            email="invite@example.com",
            nome_convidado="Convidado",
            nivel_acesso=3,
        )

    def authenticate_as_impersonated_admin(self, ministry):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.post(
            "/api/auth/admin/impersonate/",
            {"ministerio_id": ministry.id},
            format="json",
        )
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
        return response

    def test_invite_lookup_hides_sensitive_fields(self):
        response = self.client.get(f"/api/auth/invites/{self.convite.access_code}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ministerio"]["slug"], self.ministerio_a.slug)
        self.assertNotIn("token", response.data)
        self.assertNotIn("access_code", response.data)
        self.assertNotIn("status", response.data)
        self.assertNotIn("uses_count", response.data)
        self.assertNotIn("max_uses", response.data)
        self.assertNotIn("is_active", response.data)

    def test_member_can_list_music_but_cannot_create_music(self):
        self.client.force_authenticate(user=self.member_a)

        list_response = self.client.get("/api/musicas/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        create_response = self.client.post(
            "/api/musicas/",
            {"titulo": "Nova", "artista": "Autor", "tom_original": "D"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_can_create_global_music_catalog_entry(self):
        leader = Usuario.objects.create_user(
            username="leader-hardening",
            password="12345678",
            funcao_principal="Voz",
            nivel_acesso=2,
            ministerio=self.ministerio_a,
        )
        self.client.force_authenticate(user=leader)

        response = self.client.post(
            "/api/musicas/",
            {"titulo": "Global Song", "artista": "Autor", "tom_original": "D"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["ministerio"])

    def test_leader_can_create_culto_and_manage_operational_music_flow(self):
        leader = Usuario.objects.create_user(
            username="leader-operational-hardening",
            password="12345678",
            funcao_principal="Voz",
            nivel_acesso=2,
            ministerio=self.ministerio_a,
        )
        self.client.force_authenticate(user=leader)

        culto_response = self.client.post(
            "/api/cultos/",
            {
                "nome": "Culto Lider",
                "data": "2026-04-09",
                "horario_inicio": "19:30:00",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(culto_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(culto_response.data["ministerio"], self.ministerio_a.id)

        escala_response = self.client.post(
            "/api/escalas/",
            {
                "culto": culto_response.data["id"],
                "membro": self.member_a.id,
                "status_confirmacao": "PENDENTE",
            },
            format="json",
        )

        self.assertEqual(escala_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(escala_response.data["ministerio"], self.ministerio_a.id)

        setlist_response = self.client.post(
            "/api/setlists/",
            {
                "culto": culto_response.data["id"],
                "musica": self.musica_a.id,
                "ordem": 1,
                "tom_execucao": "C",
                "observacoes": "Entrada",
            },
            format="json",
        )

        self.assertEqual(setlist_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(setlist_response.data["ministerio"], self.ministerio_a.id)

    def test_member_cannot_create_setlist_item(self):
        self.client.force_authenticate(user=self.member_a)

        response = self.client.post(
            "/api/setlists/",
            {
                "culto": self.culto_a.id,
                "musica": self.musica_a.id,
                "ordem": 1,
                "tom_execucao": "C",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_global_admin_can_create_global_music_without_ministry(self):
        self.client.force_authenticate(user=self.global_admin)

        response = self.client.post(
            "/api/musicas/",
            {"titulo": "Sem Ministerio", "artista": "Autor", "tom_original": "E"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["ministerio"])

    def test_global_admin_patch_keeps_music_global(self):
        self.client.force_authenticate(user=self.global_admin)

        response = self.client.patch(
            f"/api/musicas/{self.musica_a.id}/",
            {"ministerio": self.ministerio_b.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["ministerio"])

    def test_global_admin_cannot_create_local_user_without_ministry(self):
        self.client.force_authenticate(user=self.global_admin)

        response = self.client.post(
            "/api/usuarios/",
            {
                "username": "local-sem-ministerio",
                "password": "12345678",
                "first_name": "Local",
                "funcao_principal": "Teclado",
                "nivel_acesso": 2,
                "is_global_admin": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ministerio", response.data)

    def test_impersonated_global_admin_can_fetch_current_ministry(self):
        response = self.authenticate_as_impersonated_admin(self.ministerio_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        current_response = self.client.get("/api/ministerios/current/")

        self.assertEqual(current_response.status_code, status.HTTP_200_OK)
        self.assertEqual(current_response.data["id"], self.ministerio_a.id)
        self.assertEqual(current_response.data["access_code"], self.ministerio_a.access_code)

    def test_impersonated_global_admin_can_create_local_user_without_explicit_ministry(self):
        response = self.authenticate_as_impersonated_admin(self.ministerio_a)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            "/api/usuarios/",
            {
                "username": "local-com-impersonate",
                "password": "12345678",
                "first_name": "Local",
                "funcao_principal": "Teclado",
                "nivel_acesso": 2,
                "is_global_admin": False,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["ministerio"], self.ministerio_a.id)

    def test_ministry_admin_can_fetch_current_ministry_with_access_code(self):
        self.client.force_authenticate(user=self.admin_a)

        response = self.client.get("/api/ministerios/current/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.ministerio_a.id)
        self.assertEqual(response.data["access_code"], self.ministerio_a.access_code)

    def test_member_can_see_current_ministry_access_code(self):
        self.client.force_authenticate(user=self.member_a)

        response = self.client.get("/api/ministerios/current/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["access_code"], self.ministerio_a.access_code)

    def test_leader_cannot_update_current_ministry_name(self):
        leader = Usuario.objects.create_user(
            username="leader-config",
            password="12345678",
            funcao_principal="Teclado",
            nivel_acesso=2,
            ministerio=self.ministerio_a,
        )
        self.client.force_authenticate(user=leader)

        response = self.client.patch(
            "/api/ministerios/current/",
            {"nome": "Ministerio Atualizado"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ministerio_a.refresh_from_db()
        self.assertEqual(self.ministerio_a.nome, "Ministerio A")

    def test_member_cannot_update_current_ministry_name(self):
        self.client.force_authenticate(user=self.member_a)

        response = self.client.patch(
            "/api/ministerios/current/",
            {"nome": "Nao Pode"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_cannot_generate_ministry_invite_link(self):
        leader = Usuario.objects.create_user(
            username="leader-link",
            password="12345678",
            email="leader-link@example.com",
            funcao_principal="Teclado",
            nivel_acesso=2,
            ministerio=self.ministerio_a,
        )
        self.client.force_authenticate(user=leader)

        response = self.client.get("/api/auth/ministry-invite-link/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_generate_ministry_invite_link(self):
        self.client.force_authenticate(user=self.member_a)

        response = self.client.get("/api/auth/ministry-invite-link/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TeamEndpointTests(APITestCase):
    def setUp(self):
        self.ministerio = Ministerio.objects.create(nome="Ministerio Equipes", slug="ministerio-equipes")
        self.other_ministerio = Ministerio.objects.create(nome="Outro Ministerio", slug="outro-ministerio-equipes")
        self.admin = Usuario.objects.create_user(
            username="team-admin",
            password="12345678",
            funcao_principal="Teclado",
            nivel_acesso=1,
            ministerio=self.ministerio,
        )
        Team.objects.create(name="Louvor Principal", ministerio=self.ministerio)
        Team.objects.create(name="Backline", ministerio=self.other_ministerio)

    def test_team_list_is_scoped_to_current_ministry(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get("/api/equipes/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Louvor Principal")


class FundacaoInstitucionalTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Base", slug="igreja-base")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Base",
            slug="ministerio-base",
            igreja=self.igreja,
        )
        self.user = Usuario.objects.create_user(
            username="membro-base",
            password="12345678",
            first_name="Membro",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.global_admin = Usuario.objects.create_user(
            username="admin-igreja",
            password="12345678",
            funcao_principal="Admin",
            is_global_admin=True,
            is_superuser=True,
        )

    def test_can_create_igreja(self):
        igreja = Igreja.objects.create(nome="Igreja Centro", slug="igreja-centro")
        self.assertEqual(str(igreja), "Igreja Centro")

    def test_can_create_ministerio_linked_to_igreja(self):
        self.assertEqual(self.ministerio.igreja_id, self.igreja.id)

    def test_backfill_links_legacy_ministerios_to_default_igreja(self):
        legacy_ministerio = Ministerio.objects.create(
            nome="Ministerio Legado",
            slug="ministerio-legado",
            igreja=None,
        )
        migration_module = importlib.import_module("api.migrations.0013_backfill_ministerios_igreja")

        migration_module.backfill_ministerios_igreja(django_apps, None)

        legacy_ministerio.refresh_from_db()
        self.assertIsNotNone(legacy_ministerio.igreja_id)
        self.assertEqual(legacy_ministerio.igreja.nome, "Igreja Principal")

    def test_get_user_igreja_resolves_from_ministerio(self):
        igreja = get_user_igreja(self.user)
        self.assertIsNotNone(igreja)
        self.assertEqual(igreja.id, self.igreja.id)

    def test_auth_payload_returns_igreja_fields(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "membro-base", "password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["igreja_id"], self.igreja.id)
        self.assertEqual(response.data["user"]["igreja_slug"], self.igreja.slug)
        self.assertEqual(response.data["user"]["igreja_nome"], self.igreja.nome)
        self.assertEqual(response.data["user"]["ministerio_id"], self.ministerio.id)

    def test_ministerio_serializer_exposes_igreja_fields(self):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.get(f"/api/ministerios/{self.ministerio.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["igreja_id"], self.igreja.id)
        self.assertEqual(response.data["igreja_slug"], self.igreja.slug)
        self.assertEqual(response.data["igreja_nome"], self.igreja.nome)

    def test_igreja_endpoints_allow_basic_admin_management(self):
        self.client.force_authenticate(user=self.global_admin)

        create_response = self.client.post(
            "/api/igrejas/",
            {"nome": "Igreja Nova", "slug": "igreja-nova"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        igreja_id = create_response.data["id"]
        retrieve_response = self.client.get(f"/api/igrejas/{igreja_id}/")
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)

        update_response = self.client.patch(
            f"/api/igrejas/{igreja_id}/",
            {"nome": "Igreja Nova Atualizada"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["nome"], "Igreja Nova Atualizada")

    def test_music_module_continues_working_with_ministerio_igreja_relation(self):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.post(
            "/api/musicas/",
            {
                "titulo": "Musica Compatibilidade",
                "artista": "Autor",
                "tom_original": "C",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["titulo"], "Musica Compatibilidade")


class FundacaoAcessoTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Acesso", slug="igreja-acesso")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Acesso",
            slug="ministerio-acesso",
            igreja=self.igreja,
        )
        self.user = Usuario.objects.create_user(
            username="usuario-acesso",
            password="12345678",
            first_name="Usuario",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.global_admin = Usuario.objects.create_user(
            username="admin-acesso",
            password="12345678",
            is_global_admin=True,
            is_superuser=True,
        )

    def test_can_create_user_church_membership(self):
        membership = VinculoIgrejaUsuario.objects.create(
            usuario=self.user,
            igreja=self.igreja,
            papel_institucional="MEMBRO",
        )

        self.assertEqual(membership.usuario_id, self.user.id)
        self.assertEqual(membership.igreja_id, self.igreja.id)

    def test_can_create_user_ministry_membership(self):
        membership = VinculoMinisterioUsuario.objects.create(
            usuario=self.user,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )

        self.assertEqual(membership.usuario_id, self.user.id)
        self.assertEqual(membership.ministerio_id, self.ministerio.id)
        self.assertTrue(membership.is_primary)

    def test_backfill_creates_church_membership_from_legacy_user_ministry(self):
        migration_module = importlib.import_module("api.migrations.0015_backfill_vinculos_igreja_usuario")

        migration_module.backfill_vinculos_igreja_usuario(django_apps, None)

        membership = VinculoIgrejaUsuario.objects.get(usuario=self.user, igreja=self.igreja)
        self.assertTrue(membership.is_active)

    def test_backfill_creates_ministry_membership_from_legacy_user_ministry(self):
        migration_module = importlib.import_module("api.migrations.0016_backfill_vinculos_ministerio_usuario")

        migration_module.backfill_vinculos_ministerio_usuario(django_apps, None)

        membership = VinculoMinisterioUsuario.objects.get(usuario=self.user, ministerio=self.ministerio)
        self.assertTrue(membership.is_active)
        self.assertTrue(membership.is_primary)

    def test_helpers_resolve_memberships_and_context(self):
        igreja_membership = VinculoIgrejaUsuario.objects.create(
            usuario=self.user,
            igreja=self.igreja,
            papel_institucional="MEMBRO",
        )
        ministerio_membership = VinculoMinisterioUsuario.objects.create(
            usuario=self.user,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )

        self.assertEqual(get_user_igreja_membership(self.user).id, igreja_membership.id)
        self.assertEqual(get_user_ministerio_membership(self.user).id, ministerio_membership.id)
        self.assertEqual(get_user_igreja(self.user).id, self.igreja.id)
        self.assertEqual(get_user_ministerio(self.user).id, self.ministerio.id)

    def test_helpers_fallback_to_usuario_ministerio_when_memberships_do_not_exist(self):
        self.assertIsNone(get_user_igreja_membership(self.user))
        self.assertIsNone(get_user_ministerio_membership(self.user))
        self.assertEqual(get_user_igreja(self.user).id, self.igreja.id)
        self.assertEqual(get_user_ministerio(self.user).id, self.ministerio.id)

    def test_auth_payload_remains_compatible_and_exposes_membership_fields(self):
        VinculoIgrejaUsuario.objects.create(
            usuario=self.user,
            igreja=self.igreja,
            papel_institucional="MEMBRO",
        )
        ministerio_membership = VinculoMinisterioUsuario.objects.create(
            usuario=self.user,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )

        response = self.client.post(
            "/api/auth/login/",
            {"username": "usuario-acesso", "password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["ministerio_id"], self.ministerio.id)
        self.assertEqual(response.data["user"]["igreja_id"], self.igreja.id)
        self.assertEqual(response.data["user"]["ministerio_membership_id"], ministerio_membership.id)
        self.assertTrue(response.data["user"]["has_institutional_membership"])

    def test_usuario_me_exposes_membership_summaries(self):
        VinculoIgrejaUsuario.objects.create(
            usuario=self.user,
            igreja=self.igreja,
            papel_institucional="MEMBRO",
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.user,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )
        self.client.force_authenticate(user=self.global_admin)

        response = self.client.get(f"/api/usuarios/{self.user.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["igreja_vinculo"]["igreja_id"], self.igreja.id)
        self.assertEqual(
            response.data["ministerio_vinculo_principal"]["ministerio_id"],
            self.ministerio.id,
        )

    def test_legacy_music_flow_remains_operational(self):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.post(
            "/api/musicas/",
            {
                "titulo": "Musica Legada",
                "artista": "Autor Legado",
                "tom_original": "D",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["titulo"], "Musica Legada")


class FundacaoModularTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Modular", slug="igreja-modular")
        self.igreja_secundaria = Igreja.objects.create(nome="Igreja Modular 2", slug="igreja-modular-2")
        self.music_module = Modulo.objects.get(chave=MODULE_KEY_MUSIC)
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Modular",
            slug="ministerio-modular",
            igreja=self.igreja,
        )
        self.global_admin = Usuario.objects.create_user(
            username="admin-modular",
            password="12345678",
            is_global_admin=True,
            is_superuser=True,
        )
        self.church_admin = Usuario.objects.create_user(
            username="church-modular-admin",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        VinculoIgrejaUsuario.objects.create(
            usuario=self.church_admin,
            igreja=self.igreja,
            papel_institucional="CHURCH_ADMIN",
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.church_admin,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )

    def test_can_create_module_catalog_entry(self):
        modulo = Modulo.objects.create(
            nome="Juventude",
            chave="youth",
            descricao="Modulo piloto de juventude.",
        )

        self.assertEqual(modulo.chave, "youth")
        self.assertTrue(modulo.is_active)

    def test_module_key_must_be_unique(self):
        with self.assertRaises(Exception):
            Modulo.objects.create(nome="Musica Duplicada", chave=MODULE_KEY_MUSIC)

    def test_can_link_module_to_church(self):
        igreja_modulo = IgrejaModulo.objects.create(igreja=self.igreja, modulo=self.music_module)

        self.assertEqual(igreja_modulo.igreja_id, self.igreja.id)
        self.assertEqual(igreja_modulo.modulo_id, self.music_module.id)
        self.assertTrue(igreja_modulo.is_enabled)

    def test_church_module_pair_must_be_unique(self):
        IgrejaModulo.objects.create(igreja=self.igreja, modulo=self.music_module)

        with self.assertRaises(Exception):
            IgrejaModulo.objects.create(igreja=self.igreja, modulo=self.music_module)

    def test_helper_returns_only_enabled_active_modules_for_church(self):
        youth = Modulo.objects.create(nome="Juventude", chave="youth", is_active=False)
        IgrejaModulo.objects.create(igreja=self.igreja, modulo=self.music_module, is_enabled=True)
        IgrejaModulo.objects.create(igreja=self.igreja, modulo=youth, is_enabled=True)

        self.assertEqual(get_active_module_keys_for_church(self.igreja), [MODULE_KEY_MUSIC])

    def test_backfill_registers_music_module_and_enables_it_for_existing_churches(self):
        migration_module = importlib.import_module("api.migrations.0018_seed_music_module_and_backfill_igreja_modulos")

        migration_module.seed_music_module_and_backfill_igreja_modulos(django_apps, None)

        music_module = Modulo.objects.get(chave=MODULE_KEY_MUSIC)
        self.assertTrue(music_module.is_active)
        self.assertTrue(IgrejaModulo.objects.get(igreja=self.igreja, modulo=music_module).is_enabled)
        self.assertTrue(IgrejaModulo.objects.get(igreja=self.igreja_secundaria, modulo=music_module).is_enabled)

    def test_disabled_church_module_does_not_appear_as_active(self):
        IgrejaModulo.objects.create(igreja=self.igreja, modulo=self.music_module, is_enabled=False)

        self.assertEqual(get_active_module_keys_for_church(self.igreja), [])

    def test_auth_payload_exposes_active_modules(self):
        IgrejaModulo.objects.create(igreja=self.igreja, modulo=self.music_module, is_enabled=True)

        response = self.client.post(
            "/api/auth/login/",
            {"username": "church-modular-admin", "password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["active_modules"], [MODULE_KEY_MUSIC])

    def test_church_module_endpoint_allows_management_with_church_scope(self):
        self.client.force_authenticate(user=self.church_admin)

        create_response = self.client.post(
            "/api/igreja-modulos/",
            {
                "igreja": self.igreja.id,
                "modulo": self.music_module.id,
                "is_enabled": True,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        patch_response = self.client.patch(
            f"/api/igreja-modulos/{create_response.data['id']}/",
            {"is_enabled": False},
            format="json",
        )

        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertFalse(patch_response.data["is_enabled"])


class ModuleExpansionBlueprintTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Blueprint", slug="igreja-blueprint")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Blueprint",
            slug="ministerio-blueprint",
            igreja=self.igreja,
        )
        self.church_admin = Usuario.objects.create_user(
            username="church-blueprint-admin",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        VinculoIgrejaUsuario.objects.create(
            usuario=self.church_admin,
            igreja=self.igreja,
            papel_institucional="CHURCH_ADMIN",
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.church_admin,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )

    def test_blueprint_service_selects_events_as_single_next_module(self):
        blueprint = build_module_expansion_blueprint()

        self.assertEqual(blueprint["next_priority_module"]["key"], MODULE_KEY_EVENTS)
        self.assertEqual(blueprint["next_priority_module"]["status"], "planned")
        self.assertIn("igreja", blueprint["next_priority_module"]["core_dependencies"])
        self.assertIn("tipos_de_evento", blueprint["next_priority_module"]["module_specific_scope"])
        self.assertIn("registrar_modulo_no_catalogo", blueprint["creation_checklist"])

    def test_blueprint_endpoint_exposes_repeatable_process_for_church_admin(self):
        self.client.force_authenticate(user=self.church_admin)

        response = self.client.get("/api/modulos/blueprint/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["next_priority_module"]["key"], MODULE_KEY_EVENTS)
        self.assertTrue(response.data["guardrails"]["preserve_music_module"])
        self.assertTrue(
            any(item["key"] == MODULE_KEY_MUSIC for item in response.data["official_catalog"]),
        )

    def test_seed_events_module_catalog_registers_inactive_module(self):
        migration_module = importlib.import_module("api.migrations.0022_seed_events_module_catalog")

        migration_module.seed_events_module_catalog(django_apps, None)

        events_module = Modulo.objects.get(chave=MODULE_KEY_EVENTS)
        self.assertEqual(events_module.nome, "Eventos")
        self.assertFalse(events_module.is_active)


class CoreVsMusicBoundaryTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Fronteira", slug="igreja-fronteira")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Fronteira",
            slug="ministerio-fronteira",
            igreja=self.igreja,
        )
        self.user = Usuario.objects.create_user(
            username="user-fronteira",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=2,
        )
        self.music_module = Modulo.objects.get(chave=MODULE_KEY_MUSIC)
        IgrejaModulo.objects.get_or_create(
            igreja=self.igreja,
            modulo=self.music_module,
            defaults={"is_enabled": True},
        )

    def test_core_session_payload_resolves_context_without_music_resource(self):
        payload = build_user_payload(self.user)

        self.assertEqual(payload["igreja_id"], self.igreja.id)
        self.assertEqual(payload["ministerio_id"], self.ministerio.id)
        self.assertEqual(payload["active_modules"], [MODULE_KEY_MUSIC])

    def test_core_scope_resolution_does_not_depend_on_music_entities(self):
        resolved = resolve_scoped_ministry(self.user)

        self.assertEqual(resolved.id, self.ministerio.id)

    def test_music_module_consumes_core_context_and_keeps_music_logic_local(self):
        musica = Musica.objects.create(
            ministerio=self.ministerio,
            titulo="Cancao Base",
            artista="Autor Base",
            tom_original="C",
        )

        apply_music_enrichment(
            musica,
            {
                "title": "Cancao Enriquecida",
                "artist": "Autor Enriquecido",
                "spotify_id": "spotify-core-music",
                "source": "music-module",
            },
        )

        self.assertEqual(musica.titulo, "Cancao Enriquecida")
        self.assertEqual(musica.spotify_id, "spotify-core-music")
        self.assertEqual(get_user_igreja(self.user).id, self.igreja.id)


class AgendaBaseFoundationTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Agenda", slug="igreja-agenda")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Agenda",
            slug="ministerio-agenda",
            igreja=self.igreja,
        )
        self.ministry_admin = Usuario.objects.create_user(
            username="agenda-admin",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.member = Usuario.objects.create_user(
            username="agenda-member",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.ministry_admin,
            ministerio=self.ministerio,
            papel_no_ministerio="MINISTRY_ADMIN",
            is_primary=True,
        )

    def test_can_create_base_event_for_scoped_ministry(self):
        self.client.force_authenticate(user=self.ministry_admin)

        response = self.client.post(
            "/api/eventos/",
            {
                "nome": "Ensaio Geral",
                "descricao": "Agenda base do ministerio.",
                "data": "2026-04-12",
                "horario_inicio": "19:30:00",
                "horario_termino": "21:00:00",
                "local": "Templo",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["igreja"], self.igreja.id)
        self.assertEqual(response.data["ministerio"], self.ministerio.id)
        self.assertFalse(response.data["is_music_culto"])

    def test_list_institutional_agenda_returns_base_and_music_events_together(self):
        Evento.objects.create(
            igreja=self.igreja,
            ministerio=None,
            nome="Conferencia da Igreja",
            data="2026-04-13",
            horario_inicio="18:00:00",
            status="AGENDADO",
        )
        culto = Culto.objects.create(
            ministerio=self.ministerio,
            nome="Culto Agenda",
            data="2026-04-14",
            horario_inicio="19:00:00",
            status="AGENDADO",
        )
        sync_culto_evento(culto)

        agenda = list_institutional_agenda(self.ministry_admin)

        self.assertEqual(len(agenda), 2)
        self.assertEqual({item["nome"] for item in agenda}, {"Conferencia da Igreja", "Culto Agenda"})
        self.assertEqual(
            {item["source_type"] for item in agenda if item["nome"] == "Culto Agenda"},
            {AGENDA_SOURCE_TYPE_CULTO},
        )

    def test_culto_creation_keeps_music_flow_and_syncs_evento_base(self):
        self.client.force_authenticate(user=self.ministry_admin)

        culto_response = self.client.post(
            "/api/cultos/",
            {
                "nome": "Culto Jovem",
                "data": "2026-04-15",
                "horario_inicio": "20:00:00",
                "horario_termino": "21:30:00",
                "local": "Templo Central",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(culto_response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(culto_response.data["evento_id"])

        evento = Evento.objects.get(id=culto_response.data["evento_id"])
        self.assertEqual(evento.nome, "Culto Jovem")
        self.assertEqual(evento.source_type, AGENDA_SOURCE_TYPE_CULTO)
        self.assertEqual(evento.source_module, MODULE_KEY_MUSIC)
        self.assertEqual(evento.ministerio_id, self.ministerio.id)

    def test_member_can_read_eventos_but_cannot_create(self):
        Evento.objects.create(
            igreja=self.igreja,
            ministerio=self.ministerio,
            nome="Evento Leitura",
            data="2026-04-16",
            horario_inicio="19:00:00",
            status="AGENDADO",
        )
        self.client.force_authenticate(user=self.member)

        list_response = self.client.get("/api/eventos/")
        create_response = self.client.post(
            "/api/eventos/",
            {
                "nome": "Nao Pode",
                "data": "2026-04-17",
                "horario_inicio": "19:00:00",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)


class GovernanceObservabilityTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Governanca", slug="igreja-governanca")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Governanca",
            slug="ministerio-governanca",
            igreja=self.igreja,
        )
        self.global_admin = Usuario.objects.create_user(
            username="global-governance",
            password="12345678",
            is_global_admin=True,
            is_superuser=True,
        )
        self.ministry_admin = Usuario.objects.create_user(
            username="governance-admin",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=1,
        )
        self.member = Usuario.objects.create_user(
            username="governance-member",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.music_module = Modulo.objects.get(chave=MODULE_KEY_MUSIC)
        IgrejaModulo.objects.get_or_create(
            igreja=self.igreja,
            modulo=self.music_module,
            defaults={"is_enabled": True},
        )

    def test_audit_log_persists_scope_fields_for_module_data(self):
        self.client.force_authenticate(user=self.ministry_admin)

        response = self.client.post(
            "/api/cultos/",
            {
                "nome": "Culto Governanca",
                "data": "2026-04-20",
                "horario_inicio": "19:00:00",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = LogAuditoria.objects.first()
        self.assertEqual(log.modelo_afetado, "Culto")
        self.assertEqual(log.escopo, "module")
        self.assertEqual(log.modulo, MODULE_KEY_MUSIC)
        self.assertEqual(log.igreja_id, self.igreja.id)
        self.assertEqual(log.ministerio_id, self.ministerio.id)

    def test_api_exception_handler_captures_scoped_error_log(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            "/api/cultos/",
            {
                "nome": "Culto Bloqueado",
                "data": "2026-04-20",
                "horario_inicio": "19:00:00",
                "status": "AGENDADO",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        api_error = ApiRequestErrorLog.objects.first()
        self.assertEqual(api_error.path, "/api/cultos/")
        self.assertEqual(api_error.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(api_error.modulo, MODULE_KEY_MUSIC)
        self.assertEqual(api_error.igreja_id, self.igreja.id)
        self.assertEqual(api_error.ministerio_id, self.ministerio.id)

    def test_governance_snapshot_and_metrics_endpoint_expose_minimum_observability(self):
        LogAuditoria.objects.create(
            usuario=self.ministry_admin,
            igreja=self.igreja,
            ministerio=self.ministerio,
            escopo="module",
            modulo=MODULE_KEY_MUSIC,
            acao="CREATE",
            modelo_afetado="Culto",
            descricao="Log manual para metrica.",
        )
        ApiRequestErrorLog.objects.create(
            usuario=self.member,
            igreja=self.igreja,
            ministerio=self.ministerio,
            modulo=MODULE_KEY_MUSIC,
            method="POST",
            path="/api/cultos/",
            status_code=400,
            detail="Falha controlada",
        )

        snapshot = get_governance_snapshot()
        self.assertGreaterEqual(snapshot["metrics"]["igrejas_ativas"], 1)
        self.assertGreaterEqual(snapshot["metrics"]["modulo_musica"]["igrejas_com_modulo_ativo"], 1)
        self.assertTrue(
            any(item["nome"] == self.igreja.nome for item in snapshot["metrics"]["modulos_ativos_por_igreja"]),
        )
        self.assertEqual(snapshot["storage"]["database_fields"], ["Usuario.foto_perfil", "Musica.cifra_pdf"])

        self.client.force_authenticate(user=self.global_admin)
        response = self.client.get("/api/auditoria/metricas/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["metrics"]["igrejas_ativas"], 1)
        self.assertGreaterEqual(response.data["metrics"]["modulo_musica"]["igrejas_com_modulo_ativo"], 1)
        self.assertEqual(response.data["ownership"]["module"][0], "catalogo musical ativo")


class MusicModuleCapabilityEndpointTests(APITestCase):
    def setUp(self):
        self.igreja = Igreja.objects.create(nome="Igreja Cap Music", slug="igreja-cap-music")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Cap Music",
            slug="ministerio-cap-music",
            igreja=self.igreja,
        )
        self.music_module = Modulo.objects.get(chave=MODULE_KEY_MUSIC)
        IgrejaModulo.objects.get_or_create(
            igreja=self.igreja,
            modulo=self.music_module,
            defaults={"is_enabled": True},
        )
        self.member = Usuario.objects.create_user(
            username="member-music-cap",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.leader = Usuario.objects.create_user(
            username="leader-music-cap",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.leader,
            ministerio=self.ministerio,
            papel_no_ministerio="MINISTRY_LEADER",
            is_primary=True,
        )
        self.musica = Musica.objects.create(
            ministerio=None,
            titulo="Cancao Cap",
            artista="Autor Cap",
            tom_original="G",
        )

    def test_membership_role_leader_can_manage_music_module_endpoints(self):
        self.client.force_authenticate(user=self.leader)

        music_response = self.client.post(
            "/api/musicas/",
            {"titulo": "Nova Cap", "artista": "Autor", "tom_original": "D"},
            format="json",
        )
        self.assertEqual(music_response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(music_response.data["ministerio"])

        culto_response = self.client.post(
            "/api/cultos/",
            {
                "nome": "Culto Cap",
                "data": "2026-04-10",
                "horario_inicio": "20:00:00",
                "status": "AGENDADO",
            },
            format="json",
        )
        self.assertEqual(culto_response.status_code, status.HTTP_201_CREATED)

        escala_response = self.client.post(
            "/api/escalas/",
            {
                "culto": culto_response.data["id"],
                "membro": self.member.id,
                "status_confirmacao": "PENDENTE",
            },
            format="json",
        )
        self.assertEqual(escala_response.status_code, status.HTTP_201_CREATED)

        setlist_response = self.client.post(
            "/api/setlists/",
            {
                "culto": culto_response.data["id"],
                "musica": self.musica.id,
                "ordem": 1,
                "tom_execucao": "G",
            },
            format="json",
        )
        self.assertEqual(setlist_response.status_code, status.HTTP_201_CREATED)

    def test_member_without_module_capabilities_still_cannot_write(self):
        culto = Culto.objects.create(
            ministerio=self.ministerio,
            nome="Culto Member",
            data="2026-04-10",
            horario_inicio="19:00:00",
        )
        self.client.force_authenticate(user=self.member)

        music_response = self.client.post(
            "/api/musicas/",
            {"titulo": "Bloqueada", "artista": "Autor", "tom_original": "E"},
            format="json",
        )
        self.assertEqual(music_response.status_code, status.HTTP_403_FORBIDDEN)

        setlist_response = self.client.post(
            "/api/setlists/",
            {
                "culto": culto.id,
                "musica": self.musica.id,
                "ordem": 1,
                "tom_execucao": "G",
            },
            format="json",
        )
        self.assertEqual(setlist_response.status_code, status.HTTP_403_FORBIDDEN)


class EscopoAuthorizationTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.igreja = Igreja.objects.create(nome="Igreja Escopo", slug="igreja-escopo")
        self.ministerio = Ministerio.objects.create(
            nome="Ministerio Escopo",
            slug="ministerio-escopo",
            igreja=self.igreja,
        )
        self.platform_admin = Usuario.objects.create_user(
            username="platform-admin",
            password="12345678",
            is_global_admin=True,
            is_superuser=True,
        )
        self.church_admin = Usuario.objects.create_user(
            username="church-admin",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.ministry_admin = Usuario.objects.create_user(
            username="ministry-admin",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.ministry_leader = Usuario.objects.create_user(
            username="ministry-leader",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )
        self.member = Usuario.objects.create_user(
            username="member-escopo",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=3,
        )

        VinculoIgrejaUsuario.objects.create(
            usuario=self.church_admin,
            igreja=self.igreja,
            papel_institucional="CHURCH_ADMIN",
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.church_admin,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.ministry_admin,
            ministerio=self.ministerio,
            papel_no_ministerio="MINISTRY_ADMIN",
            is_primary=True,
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.ministry_leader,
            ministerio=self.ministerio,
            papel_no_ministerio="MINISTRY_LEADER",
            is_primary=True,
        )
        VinculoMinisterioUsuario.objects.create(
            usuario=self.member,
            ministerio=self.ministerio,
            papel_no_ministerio="MEMBRO",
            is_primary=True,
        )

    def test_platform_super_admin_receives_platform_capabilities(self):
        snapshot = build_authorization_snapshot(self.platform_admin, igreja=self.igreja, ministerio=self.ministerio)

        self.assertEqual(snapshot["roles"]["platform"], "platform_super_admin")
        self.assertIn(CAPABILITY_MANAGE_PLATFORM, snapshot["capabilities"])
        self.assertIn(CAPABILITY_MANAGE_CHURCH, snapshot["capabilities"])

    def test_church_admin_receives_church_capabilities_only(self):
        snapshot = build_authorization_snapshot(self.church_admin, igreja=self.igreja, ministerio=self.ministerio)

        self.assertEqual(snapshot["roles"]["church"], "church_admin")
        self.assertIn(CAPABILITY_MANAGE_CHURCH, snapshot["capabilities"])
        self.assertNotIn(CAPABILITY_MANAGE_PLATFORM, snapshot["capabilities"])

    def test_ministry_admin_receives_ministry_capabilities(self):
        snapshot = build_authorization_snapshot(self.ministry_admin, igreja=self.igreja, ministerio=self.ministerio)

        self.assertEqual(snapshot["roles"]["ministry"], "ministry_admin")
        self.assertIn(CAPABILITY_MANAGE_MEMBERS, snapshot["capabilities"])

    def test_ministry_leader_receives_operational_capabilities(self):
        snapshot = build_authorization_snapshot(self.ministry_leader, igreja=self.igreja, ministerio=self.ministerio)

        self.assertEqual(snapshot["roles"]["ministry"], "ministry_leader")
        self.assertIn(CAPABILITY_MANAGE_MUSIC, snapshot["capabilities"])
        self.assertNotIn(CAPABILITY_MANAGE_MEMBERS, snapshot["capabilities"])

    def test_member_does_not_receive_administrative_capabilities(self):
        snapshot = build_authorization_snapshot(self.member, igreja=self.igreja, ministerio=self.ministerio)

        self.assertEqual(snapshot["roles"]["ministry"], "member")
        self.assertNotIn(CAPABILITY_MANAGE_MEMBERS, snapshot["capabilities"])
        self.assertNotIn(CAPABILITY_MANAGE_PLATFORM, snapshot["capabilities"])

    def test_legacy_fallback_continues_working_without_membership_role(self):
        legacy_admin = Usuario.objects.create_user(
            username="legacy-admin-role",
            password="12345678",
            ministerio=self.ministerio,
            nivel_acesso=1,
        )

        self.assertTrue(has_capability(legacy_admin, CAPABILITY_MANAGE_MEMBERS, scope="ministry"))

    def test_capability_permission_class_respects_resolver(self):
        class CanManageChurchForTest(HasChurchCapability):
            capability = CAPABILITY_MANAGE_CHURCH

        request = self.factory.get("/api/igrejas/")
        request.user = self.church_admin
        request.method = SAFE_METHODS[0]

        self.assertTrue(CanManageChurchForTest().has_permission(request, view=None))

        request.user = self.member
        self.assertFalse(CanManageChurchForTest().has_permission(request, view=None))
