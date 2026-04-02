import re
import unicodedata

LIVE_KEYWORDS = (" live", " worship", " ao vivo", " acoustic")


def normalize_text(value: str) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def build_query(title: str = "", artist: str = "", fallback_query: str = "") -> str:
    query = " ".join(part.strip() for part in [title, artist] if part and part.strip())
    return query or fallback_query.strip()


def score_track_title(title: str) -> int:
    normalized = f" {normalize_text(title)} "
    return sum(1 for keyword in LIVE_KEYWORDS if keyword in normalized)
