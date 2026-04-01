from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from api.models import ConviteMinisterio, Ministerio, Musica, Usuario
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
            username="tester",
            password="12345678",
            funcao_principal="Voz",
            ministerio=self.ministerio,
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
            username="editor",
            password="12345678",
            funcao_principal="Voz",
            ministerio=self.ministerio,
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
            is_global_admin=True,
            is_staff=True,
            is_superuser=True,
        )

    def test_lookup_invite_by_code(self):
        response = self.client.get(f"/api/auth/invites/{self.convite.access_code}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ministerio"]["slug"], "ministerio-sede")

    def test_accept_invite_creates_bound_user_and_returns_tokens(self):
        payload = {
            "code": self.convite.access_code,
            "username": "membro1",
            "password": "12345678",
            "first_name": "Membro",
            "last_name": "Teste",
            "email": "membro@example.com",
            "funcao_principal": "Vocal",
        }

        response = self.client.post("/api/auth/invites/accept/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        usuario = Usuario.objects.get(username="membro1")
        self.assertEqual(usuario.ministerio_id, self.ministerio.id)
        self.assertFalse(usuario.is_global_admin)
        self.convite.refresh_from_db()
        self.assertEqual(self.convite.status, "ACEITO")

    def test_ministry_login_rejects_global_admin(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "superadmin", "password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_login_accepts_global_admin(self):
        response = self.client.post(
            "/api/auth/admin/login/",
            {"username": "superadmin", "password": "12345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["user"]["is_global_admin"])


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

    def test_ministry_admin_lists_only_own_music(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get("/api/musicas/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.musica_a.id)

    def test_ministry_admin_cannot_access_other_ministry_music_detail(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(f"/api/musicas/{self.musica_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ministry_admin_create_music_is_forced_to_own_ministry(self):
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
        self.assertEqual(response.data["ministerio"], self.ministerio_a.id)

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

    def test_global_admin_lists_all_music(self):
        self.client.force_authenticate(user=self.global_admin)
        response = self.client.get("/api/musicas/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


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
        self.client.force_authenticate(user=self.admin)

    def test_admin_level_grants_staff_access_on_create(self):
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

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_user = Usuario.objects.get(username="novo-admin")
        self.assertTrue(created_user.is_staff)

    def test_updating_access_level_promotes_and_demotes_staff_flag(self):
        promote_response = self.client.patch(
            f"/api/usuarios/{self.member.id}/",
            {"nivel_acesso": 1},
            format="json",
        )
        self.assertEqual(promote_response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.nivel_acesso, 1)
        self.assertTrue(self.member.is_staff)

        demote_response = self.client.patch(
            f"/api/usuarios/{self.member.id}/",
            {"nivel_acesso": 3},
            format="json",
        )
        self.assertEqual(demote_response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.nivel_acesso, 3)
        self.assertFalse(self.member.is_staff)
