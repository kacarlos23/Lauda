from dataclasses import asdict, dataclass

from django.utils import timezone

from .genius_service import GeniusService
from .normalization import build_query
from .spotify_service import SpotifyService


@dataclass
class MusicMetadataDTO:
    title: str = ""
    artist: str = ""
    cover: str | None = None
    preview: str | None = None
    lyrics_link: str | None = None
    spotify_url: str | None = None
    spotify_id: str | None = None
    genius_id: str | None = None
    isrc: str | None = None
    spotify_popularity: int | None = None
    genius_popularity: int | None = None
    source: str = "manual"
    synced_at: str | None = None

    def to_dict(self):
        return asdict(self)


class MusicFacade:
    def __init__(self):
        self.spotify = SpotifyService()
        self.genius = GeniusService()

    def find_complete_music_data(self, *, query: str = "", title: str = "", artist: str = ""):
        search_query = build_query(title=title, artist=artist, fallback_query=query)
        if not search_query:
            raise ValueError("Informe pelo menos o titulo da musica para enriquecer os dados.")

        dto = MusicMetadataDTO(synced_at=timezone.now().isoformat())
        spotify_track = None
        spotify_details = None

        if self.spotify.is_configured():
            spotify_candidates = self.spotify.search_track(search_query)
            spotify_track = self.spotify.choose_best_track(search_query, spotify_candidates, artist_hint=artist)

            if not spotify_track and title:
                spotify_candidates = self.spotify.search_track(title)
                spotify_track = self.spotify.choose_best_track(title, spotify_candidates, artist_hint=artist)

            if spotify_track:
                spotify_details = self.spotify.get_track_details(spotify_track["id"])
                dto.title = spotify_details.get("name") or title or query
                dto.artist = ", ".join(artist_data.get("name", "") for artist_data in spotify_details.get("artists", [])) or artist
                dto.cover = ((spotify_details.get("album") or {}).get("images") or [{}])[0].get("url")
                dto.preview = spotify_details.get("preview_url")
                dto.spotify_url = (spotify_details.get("external_urls") or {}).get("spotify")
                dto.spotify_id = spotify_details.get("id")
                dto.isrc = (spotify_details.get("external_ids") or {}).get("isrc")
                dto.spotify_popularity = spotify_details.get("popularity")
                dto.source = "spotify"

        genius_title = dto.title or title or query
        genius_artist = dto.artist or artist

        if self.genius.is_configured():
            genius_query = build_query(title=genius_title, artist=genius_artist, fallback_query=search_query)
            genius_hits = self.genius.search_song(genius_query)
            genius_result = self.genius.choose_best_hit(genius_title, genius_hits, artist_hint=genius_artist)

            if genius_result:
                genius_details = self.genius.get_song_details(str(genius_result["id"]))
                dto.lyrics_link = genius_details.get("url") or genius_result.get("url")
                dto.genius_id = str(genius_details.get("id") or genius_result.get("id"))
                dto.genius_popularity = (genius_details.get("stats") or {}).get("pageviews")
                if dto.source == "spotify":
                    dto.source = "spotify_genius_hybrid"
                else:
                    dto.title = genius_details.get("title") or genius_title
                    dto.artist = (genius_details.get("primary_artist") or {}).get("name") or genius_artist
                    dto.cover = dto.cover or genius_details.get("header_image_thumbnail_url")
                    dto.source = "genius"

        if not any([dto.title, dto.artist, dto.cover, dto.preview, dto.lyrics_link, dto.spotify_url]):
            raise LookupError("Nenhum metadado externo encontrado para esta musica.")

        if not dto.title:
            dto.title = title or query
        if not dto.artist:
            dto.artist = artist

        return dto.to_dict()
