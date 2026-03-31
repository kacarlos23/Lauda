from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Musica, Usuario
from api.services.normalization import build_query, normalize_text, score_track_title


class NormalizationServiceTests(APITestCase):
    def test_normalize_text_removes_accents(self):
        self.assertEqual(normalize_text("Éter Worship"), "eter worship")

    def test_build_query_prefers_title_and_artist(self):
        self.assertEqual(build_query(title="Oceans", artist="Hillsong", fallback_query="x"), "Oceans Hillsong")

    def test_live_title_scores_higher(self):
        self.assertGreater(score_track_title("Oceans Live"), 0)


class MusicEnrichmentEndpointTests(APITestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="tester",
            password="12345678",
            funcao_principal="Voz",
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
        self.user = Usuario.objects.create_user(
            username="editor",
            password="12345678",
            funcao_principal="Voz",
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
        musica = Musica.objects.create(titulo="Teste", artista="Autor", tom_original="G")
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
