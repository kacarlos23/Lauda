from django.core.validators import RegexValidator
from django.db import models

from system.constants import MUSIC_CLASSIFICATION_CHOICES


class Musica(models.Model):
    ministerio = models.ForeignKey(
        "api.Ministerio",
        on_delete=models.SET_NULL,
        related_name="musicas",
        blank=True,
        null=True,
    )
    titulo = models.CharField(max_length=200)
    artista = models.CharField(max_length=200)
    tom_original = models.CharField(max_length=10)
    bpm = models.IntegerField(blank=True, null=True)
    duracao = models.CharField(
        max_length=5,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r"^\d{2}:[0-5]\d$",
                message="Use o formato mm:ss.",
            ),
        ],
        help_text="Duracao no formato mm:ss",
    )
    compasso = models.CharField(max_length=10, blank=True, null=True)
    link_youtube = models.URLField(blank=True, null=True, help_text="Link do YouTube")
    link_audio = models.URLField(
        blank=True,
        null=True,
        help_text="Spotify, Deezer, Apple Music",
    )
    link_letra = models.URLField(
        blank=True,
        null=True,
        help_text="Link oficial para letra/licenca de referencia",
    )
    link_cifra = models.URLField(blank=True, null=True, help_text="CifraClub, etc")
    cifra_pdf = models.FileField(upload_to="cifras_pdf/", blank=True, null=True)
    cifra_texto = models.TextField(blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)
    tags = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Separe as tags por virgula. Ex: Adoracao, Ceia",
    )
    classificacao = models.CharField(
        max_length=32,
        choices=MUSIC_CLASSIFICATION_CHOICES,
        blank=True,
        null=True,
    )
    spotify_id = models.CharField(max_length=120, blank=True, null=True)
    genius_id = models.CharField(max_length=120, blank=True, null=True)
    isrc = models.CharField(max_length=32, blank=True, null=True)
    cover_url = models.URLField(blank=True, null=True)
    preview_url = models.URLField(blank=True, null=True)
    spotify_popularidade = models.PositiveIntegerField(blank=True, null=True)
    genius_popularidade = models.PositiveIntegerField(blank=True, null=True)
    metadata_source = models.CharField(max_length=50, blank=True, null=True)
    metadata_last_synced_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.titulo} - {self.artista}"

    class Meta:
        app_label = "api"
        indexes = [
            models.Index(fields=["titulo"], name="idx_musica_titulo"),
            models.Index(fields=["ministerio", "is_active"], name="idx_musica_min_active"),
            models.Index(fields=["is_active", "classificacao"]),
            models.Index(fields=["artista", "titulo"]),
            models.Index(fields=["metadata_last_synced_at"]),
        ]


class ItemSetlist(models.Model):
    ministerio = models.ForeignKey(
        "api.Ministerio",
        on_delete=models.CASCADE,
        related_name="setlists",
        blank=True,
        null=True,
    )
    culto = models.ForeignKey("api.Culto", on_delete=models.CASCADE, related_name="setlists")
    musica = models.ForeignKey("api.Musica", on_delete=models.RESTRICT)
    ordem = models.PositiveIntegerField(default=1)
    tom_execucao = models.CharField(max_length=10)
    observacoes = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        app_label = "api"
        ordering = ["ordem"]
        indexes = [
            models.Index(fields=["ministerio", "culto", "ordem"]),
        ]

    def __str__(self):
        return f"{self.ordem} - {self.musica.titulo} ({self.tom_execucao})"


class MusicMetadataCache(models.Model):
    provider = models.CharField(max_length=40)
    cache_key = models.CharField(max_length=255)
    payload = models.JSONField(blank=True, null=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "api"
        unique_together = ("provider", "cache_key")
        indexes = [models.Index(fields=["provider", "cache_key"]), models.Index(fields=["expires_at"])]

    def __str__(self):
        return f"{self.provider}:{self.cache_key}"
