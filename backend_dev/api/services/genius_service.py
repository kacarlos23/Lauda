import threading
import time

import requests
from django.conf import settings

from .cache import MetadataCacheRepository
from .normalization import normalize_text, score_track_title


class GeniusService:
    _throttle_lock = threading.Lock()
    _last_request_at = 0.0
    _session = requests.Session()

    SEARCH_URL = "https://api.genius.com/search"
    SONG_URL = "https://api.genius.com/songs/{song_id}"

    def __init__(self):
        self.access_token = settings.GENIUS_ACCESS_TOKEN
        self.timeout = settings.EXTERNAL_API_TIMEOUT
        self.rate_limit_interval = settings.GENIUS_THROTTLE_SECONDS

    def is_configured(self) -> bool:
        return bool(self.access_token)

    def _respect_rate_limit(self):
        with self._throttle_lock:
            now = time.monotonic()
            diff = now - self._last_request_at
            if diff < self.rate_limit_interval:
                time.sleep(self.rate_limit_interval - diff)
            self._last_request_at = time.monotonic()

    def _request(self, url: str, *, params=None):
        if not self.is_configured():
            raise RuntimeError("Genius nao configurado")

        self._respect_rate_limit()
        response = self._session.get(
            url,
            params=params,
            headers={"Authorization": f"Bearer {self.access_token}"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json().get("response", {})

    def search_song(self, query: str):
        normalized_query = normalize_text(query)
        cached = MetadataCacheRepository.get("genius_search", normalized_query)
        if cached is not None:
            return cached

        payload = self._request(self.SEARCH_URL, params={"q": query})
        hits = payload.get("hits", [])
        return MetadataCacheRepository.set(
            "genius_search",
            normalized_query,
            hits,
            settings.MUSIC_METADATA_CACHE_TTL,
        )

    def get_song_details(self, song_id: str):
        cached = MetadataCacheRepository.get("genius_song", song_id)
        if cached is not None:
            return cached

        payload = self._request(self.SONG_URL.format(song_id=song_id))
        song = payload.get("song", {})
        return MetadataCacheRepository.set(
            "genius_song",
            song_id,
            song,
            settings.MUSIC_METADATA_CACHE_TTL,
        )

    def choose_best_hit(self, title: str, hits, artist_hint: str = ""):
        normalized_title = normalize_text(title)
        normalized_artist_hint = normalize_text(artist_hint)

        def score(hit):
            result = hit.get("result", {})
            hit_title = result.get("title", "")
            artist = result.get("primary_artist", {}).get("name", "")
            normalized_hit_title = normalize_text(hit_title)
            normalized_artist = normalize_text(artist)
            item_score = 0

            if normalized_title and normalized_title == normalized_hit_title:
                item_score += 6
            if normalized_title and normalized_title in normalized_hit_title:
                item_score += 4
            if normalized_artist_hint and normalized_artist_hint in normalized_artist:
                item_score += 4

            item_score += score_track_title(hit_title) * 2
            item_score += min(int(result.get("stats", {}).get("pageviews") or 0) / 50000, 4)
            return item_score

        prioritized = sorted(hits, key=score, reverse=True)
        return prioritized[0].get("result") if prioritized else None
