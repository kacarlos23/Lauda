import base64
import threading
import time
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone

from .cache import MetadataCacheRepository
from .normalization import normalize_text, score_track_title


class SpotifyService:
    _token = None
    _token_expires_at = timezone.now()
    _token_lock = threading.Lock()
    _throttle_lock = threading.Lock()
    _last_request_at = 0.0
    _session = requests.Session()

    TOKEN_URL = "https://accounts.spotify.com/api/token"
    SEARCH_URL = "https://api.spotify.com/v1/search"
    TRACK_URL = "https://api.spotify.com/v1/tracks/{track_id}"

    def __init__(self):
        self.client_id = settings.SPOTIFY_CLIENT_ID
        self.client_secret = settings.SPOTIFY_CLIENT_SECRET
        self.market = settings.SPOTIFY_MARKET
        self.timeout = settings.EXTERNAL_API_TIMEOUT
        self.rate_limit_interval = settings.SPOTIFY_THROTTLE_SECONDS

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def get_access_token(self, force_refresh: bool = False) -> str:
        if not self.is_configured():
            raise RuntimeError("Spotify nao configurado")

        with self._token_lock:
            if (
                not force_refresh
                and self._token
                and timezone.now() < self._token_expires_at - timedelta(seconds=60)
            ):
                return self._token

            credentials = f"{self.client_id}:{self.client_secret}".encode("utf-8")
            authorization = base64.b64encode(credentials).decode("utf-8")
            response = self._session.post(
                self.TOKEN_URL,
                data={"grant_type": "client_credentials"},
                headers={
                    "Authorization": f"Basic {authorization}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=self.timeout,
            )
            response.raise_for_status()

            payload = response.json()
            self._token = payload["access_token"]
            self._token_expires_at = timezone.now() + timedelta(seconds=payload.get("expires_in", 3600))
            return self._token

    def _respect_rate_limit(self):
        with self._throttle_lock:
            now = time.monotonic()
            diff = now - self._last_request_at
            if diff < self.rate_limit_interval:
                time.sleep(self.rate_limit_interval - diff)
            self._last_request_at = time.monotonic()

    def _request(self, method: str, url: str, *, params=None, retried=False):
        self._respect_rate_limit()
        token = self.get_access_token(force_refresh=retried)
        response = self._session.request(
            method,
            url,
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=self.timeout,
        )

        if response.status_code == 401 and not retried:
            return self._request(method, url, params=params, retried=True)

        response.raise_for_status()
        return response.json()

    def search_track(self, query: str, limit: int = 5):
        normalized_query = normalize_text(query)
        cache_key = f"{normalized_query}:{limit}:{self.market}"
        cached = MetadataCacheRepository.get("spotify_search", cache_key)
        if cached is not None:
            return cached

        payload = self._request(
            "GET",
            self.SEARCH_URL,
            params={
                "q": query,
                "type": "track",
                "limit": limit,
                "market": self.market,
            },
        )
        items = payload.get("tracks", {}).get("items", [])
        return MetadataCacheRepository.set("spotify_search", cache_key, items, settings.MUSIC_METADATA_CACHE_TTL)

    def get_track_details(self, track_id: str):
        cache_key = track_id
        cached = MetadataCacheRepository.get("spotify_track", cache_key)
        if cached is not None:
            return cached

        payload = self._request("GET", self.TRACK_URL.format(track_id=track_id), params={"market": self.market})
        return MetadataCacheRepository.set("spotify_track", cache_key, payload, settings.MUSIC_METADATA_CACHE_TTL)

    def choose_best_track(self, query: str, items, artist_hint: str = ""):
        normalized_query = normalize_text(query)
        normalized_artist_hint = normalize_text(artist_hint)

        def score(item):
            track_name = item.get("name", "")
            artists = " ".join(artist.get("name", "") for artist in item.get("artists", []))
            normalized_name = normalize_text(track_name)
            normalized_artists = normalize_text(artists)
            item_score = 0

            if item.get("preview_url"):
                item_score += 5
            if normalized_query and normalized_query in normalized_name:
                item_score += 4
            if normalized_query and normalized_query in f"{normalized_name} {normalized_artists}":
                item_score += 3
            if normalized_artist_hint and normalized_artist_hint in normalized_artists:
                item_score += 4

            item_score += score_track_title(track_name) * 3
            item_score += int(item.get("popularity") or 0) / 25
            return item_score

        prioritized = sorted(items, key=score, reverse=True)
        return prioritized[0] if prioritized else None
