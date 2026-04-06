from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from api.models import ConviteMinisterio, Ministerio, Musica, Team, Usuario
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
            nivel_acesso=1,
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
            nivel_acesso=1,
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
            is_global_admin=True,
            is_staff=True,
            is_superuser=True,
        )

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
        self.assertEqual(response.data["user"]["escopo_acesso"], "GLOBAL")
        self.assertEqual(response.data["user"]["papel_display"], "Admin Global")


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

    def test_me_endpoint_returns_ministry_slug(self):
        response = self.client.get("/api/usuarios/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ministerio_slug"], self.ministerio.slug)
        self.assertEqual(response.data["nivel_acesso_label"], "Administrador")
        self.assertEqual(response.data["escopo_acesso"], "MINISTERIO")
        self.assertEqual(response.data["papel_display"], "Administrador")

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

    def test_leader_can_create_global_music(self):
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

    def test_leader_can_update_current_ministry_name(self):
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

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ministerio_a.refresh_from_db()
        self.assertEqual(self.ministerio_a.nome, "Ministerio Atualizado")

    def test_member_cannot_update_current_ministry_name(self):
        self.client.force_authenticate(user=self.member_a)

        response = self.client.patch(
            "/api/ministerios/current/",
            {"nome": "Nao Pode"},
            format="json",
        )

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
