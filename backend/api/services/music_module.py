def apply_music_enrichment(instance, enrichment):
    instance.titulo = enrichment.get("title") or instance.titulo
    instance.artista = enrichment.get("artist") or instance.artista
    instance.link_audio = enrichment.get("spotify_url") or instance.link_audio
    instance.link_letra = enrichment.get("lyrics_link") or instance.link_letra
    instance.spotify_id = enrichment.get("spotify_id") or instance.spotify_id
    instance.genius_id = enrichment.get("genius_id") or instance.genius_id
    instance.cover_url = enrichment.get("cover") or instance.cover_url
    instance.preview_url = enrichment.get("preview") or instance.preview_url
    instance.isrc = enrichment.get("isrc") or instance.isrc
    instance.metadata_source = enrichment.get("source") or instance.metadata_source
    instance.spotify_popularidade = enrichment.get("spotify_popularity") or instance.spotify_popularidade
    instance.genius_popularidade = enrichment.get("genius_popularity") or instance.genius_popularidade
    synced_at = enrichment.get("synced_at")
    if synced_at:
        from django.utils.dateparse import parse_datetime

        instance.metadata_last_synced_at = parse_datetime(synced_at) or instance.metadata_last_synced_at
    return instance
