from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    NIVEL_ACESSO_CHOICES = [
        (1, "Administrador"),
        (2, "Lider de Louvor"),
        (3, "Membro"),
    ]

    telefone = models.CharField(max_length=20, blank=True, null=True)
    foto_perfil = models.ImageField(upload_to="perfil/", blank=True, null=True)
    funcao_principal = models.CharField(max_length=50)
    funcoes_secundarias = models.TextField(
        blank=True,
        null=True,
        help_text="Ex: Violao, Teclado",
    )
    nivel_acesso = models.IntegerField(choices=NIVEL_ACESSO_CHOICES, default=3)
    is_active = models.BooleanField(
        default=True,
        help_text="Desmarque para inativar o membro em vez de deletar",
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_nivel_acesso_display()})"


class Musica(models.Model):
    titulo = models.CharField(max_length=200)
    artista = models.CharField(max_length=200)
    tom_original = models.CharField(max_length=10)
    bpm = models.IntegerField(blank=True, null=True)
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


class Culto(models.Model):
    STATUS_CHOICES = [
        ("AGENDADO", "Agendado"),
        ("REALIZADO", "Realizado"),
        ("CANCELADO", "Cancelado"),
    ]

    nome = models.CharField(max_length=150)
    data = models.DateField()
    horario_inicio = models.TimeField()
    horario_termino = models.TimeField()
    local = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AGENDADO")

    def __str__(self):
        return f"{self.nome} - {self.data.strftime('%d/%m/%Y')}"


class Escala(models.Model):
    STATUS_CONFIRMACAO = [
        ("PENDENTE", "Pendente"),
        ("CONFIRMADO", "Confirmado"),
        ("RECUSADO", "Recusado"),
    ]

    culto = models.ForeignKey(Culto, on_delete=models.CASCADE, related_name="escalas")
    membro = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="minhas_escalas",
    )
    status_confirmacao = models.CharField(
        max_length=20,
        choices=STATUS_CONFIRMACAO,
        default="PENDENTE",
    )

    def __str__(self):
        return f"{self.membro.first_name} em {self.culto.nome}"


class ItemSetlist(models.Model):
    culto = models.ForeignKey(Culto, on_delete=models.CASCADE, related_name="setlists")
    musica = models.ForeignKey(Musica, on_delete=models.RESTRICT)
    ordem = models.PositiveIntegerField(default=1)
    tom_execucao = models.CharField(max_length=10)
    observacoes = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ["ordem"]

    def __str__(self):
        return f"{self.ordem} - {self.musica.titulo} ({self.tom_execucao})"


class RegistroLogin(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="historico_logins",
    )
    data_hora = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)

    def __str__(self):
        return f"{self.usuario.username} logou em {self.data_hora.strftime('%d/%m/%Y %H:%M')}"


class LogAuditoria(models.Model):
    ACAO_CHOICES = [
        ("CREATE", "Criacao"),
        ("UPDATE", "Atualizacao"),
        ("DELETE", "Exclusao"),
    ]

    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    acao = models.CharField(max_length=10, choices=ACAO_CHOICES)
    modelo_afetado = models.CharField(max_length=50)
    descricao = models.CharField(max_length=255)
    data_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-data_hora"]

    def __str__(self):
        nome = self.usuario.first_name if self.usuario else "Sistema"
        return f"{self.acao} em {self.modelo_afetado} por {nome}"


class MusicMetadataCache(models.Model):
    provider = models.CharField(max_length=40)
    cache_key = models.CharField(max_length=255)
    payload = models.JSONField(blank=True, null=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("provider", "cache_key")
        indexes = [models.Index(fields=["provider", "cache_key"]), models.Index(fields=["expires_at"])]

    def __str__(self):
        return f"{self.provider}:{self.cache_key}"
