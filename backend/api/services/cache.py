from datetime import timedelta

from django.utils import timezone

from api.models import MusicMetadataCache


class MetadataCacheRepository:
    @staticmethod
    def get(provider: str, cache_key: str):
        cache_entry = (
            MusicMetadataCache.objects.filter(provider=provider, cache_key=cache_key)
            .filter(expires_at__gt=timezone.now())
            .first()
        )
        return cache_entry.payload if cache_entry else None

    @staticmethod
    def set(provider: str, cache_key: str, payload, ttl_seconds: int):
        expires_at = timezone.now() + timedelta(seconds=ttl_seconds)
        MusicMetadataCache.objects.update_or_create(
            provider=provider,
            cache_key=cache_key,
            defaults={
                "payload": payload,
                "expires_at": expires_at,
            },
        )
        return payload

    @staticmethod
    def purge_expired():
        MusicMetadataCache.objects.filter(expires_at__lte=timezone.now()).delete()
