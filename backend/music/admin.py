from django.contrib import admin

from music.models import ItemSetlist, MusicMetadataCache, Musica


@admin.register(Musica)
class MusicaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "artista", "ministerio", "classificacao", "tom_original", "bpm", "is_active")
    list_filter = ("ministerio", "classificacao", "is_active")
    search_fields = ("titulo", "artista", "tags")
    ordering = ("titulo", "artista")


@admin.register(ItemSetlist)
class ItemSetlistAdmin(admin.ModelAdmin):
    list_display = ("culto", "ordem", "musica", "tom_execucao", "ministerio")
    list_filter = ("ministerio", "culto")
    search_fields = ("culto__nome", "musica__titulo", "musica__artista")
    ordering = ("culto", "ordem")


@admin.register(MusicMetadataCache)
class MusicMetadataCacheAdmin(admin.ModelAdmin):
    list_display = ("provider", "cache_key", "expires_at", "updated_at")
    list_filter = ("provider",)
    search_fields = ("provider", "cache_key")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-updated_at",)
