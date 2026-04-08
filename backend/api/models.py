import secrets
import string

from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from .constants import (
    MODULE_KEY_EVENTS,
    MODULE_KEY_MUSIC,
    MUSIC_CLASSIFICATION_CHOICES,
    USER_FUNCTION_SET,
)


def generate_invite_token():
    return secrets.token_urlsafe(24)


def generate_access_code(length=10):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class Igreja(models.Model):
    nome = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    logo_url = models.URLField(blank=True, null=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Igreja"
        verbose_name_plural = "Igrejas"

    def __str__(self):
        return self.nome


class Modulo(models.Model):
    nome = models.CharField(max_length=150)
    chave = models.SlugField(unique=True)
    descricao = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Modulo"
        verbose_name_plural = "Modulos"

    def __str__(self):
        return self.nome

    @classmethod
    def official_defaults(cls, module_key):
        from api.services.module_blueprint import get_module_catalog_entry

        definition = get_module_catalog_entry(module_key)
        if definition is None:
            raise ValueError(f'Modulo oficial desconhecido: "{module_key}".')

        return {
            "nome": definition["nome"],
            "chave": definition["key"],
            "descricao": definition["descricao"],
            "is_active": definition["default_is_active"],
            "configuracoes": {},
        }

    @classmethod
    def music_defaults(cls):
        return cls.official_defaults(MODULE_KEY_MUSIC)

    @classmethod
    def events_defaults(cls):
        return cls.official_defaults(MODULE_KEY_EVENTS)


class Ministerio(models.Model):
    igreja = models.ForeignKey(
        Igreja,
        on_delete=models.SET_NULL,
        related_name="ministerios",
        blank=True,
        null=True,
    )
    nome = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    access_code = models.CharField(max_length=20, unique=True, default=generate_access_code)
    logo_url = models.URLField(blank=True, null=True)
    is_open = models.BooleanField(default=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Ministerio"
        verbose_name_plural = "Ministerios"

    def __str__(self):
        return self.nome


class Usuario(AbstractUser):
    NIVEL_ACESSO_CHOICES = [
        (1, "Administrador"),
        (2, "Lider de Louvor"),
        (3, "Membro"),
    ]

    telefone = models.CharField(max_length=20, blank=True, null=True)
    foto_perfil = models.ImageField(upload_to="perfil/", blank=True, null=True)
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.SET_NULL,
        related_name="usuarios",
        blank=True,
        null=True,
    )
    funcao_principal = models.CharField(max_length=50, blank=True, default="")
    funcoes_secundarias = models.TextField(
        blank=True,
        null=True,
        help_text="Ex: Violao, Teclado",
    )
    funcoes = models.JSONField(default=list, blank=True)
    nivel_acesso = models.IntegerField(choices=NIVEL_ACESSO_CHOICES, default=3)
    is_global_admin = models.BooleanField(default=False)
    invite_accepted_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Desmarque para inativar o membro em vez de deletar",
    )

    def get_normalized_funcoes(self):
        normalized = []
        for value in self.funcoes or []:
            if not isinstance(value, str):
                continue
            cleaned = value.strip()
            if cleaned and cleaned in USER_FUNCTION_SET and cleaned not in normalized:
                normalized.append(cleaned)

        legacy_values = []
        if self.funcao_principal:
            legacy_values.append(self.funcao_principal)
        if self.funcoes_secundarias:
            legacy_values.extend(self.funcoes_secundarias.split(","))

        for value in legacy_values:
            cleaned = value.strip()
            if cleaned and cleaned in USER_FUNCTION_SET and cleaned not in normalized:
                normalized.append(cleaned)

        return normalized

    def sync_access_flags(self):
        self.is_staff = bool(self.is_global_admin or self.is_superuser)

    def save(self, *args, **kwargs):
        if self.is_global_admin:
            self.ministerio = None
        self.funcoes = self.get_normalized_funcoes()
        self.funcao_principal = self.funcoes[0] if self.funcoes else ""
        self.funcoes_secundarias = ", ".join(self.funcoes[1:]) if len(self.funcoes) > 1 else ""
        self.sync_access_flags()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_nivel_acesso_display()})"

    class Meta(AbstractUser.Meta):
        indexes = [
            models.Index(fields=["ministerio", "is_active"]),
            models.Index(fields=["is_global_admin", "is_active"]),
            models.Index(fields=["nivel_acesso", "is_active"]),
        ]


class VinculoIgrejaUsuario(models.Model):
    PAPEL_INSTITUCIONAL_CHOICES = [
        ("MEMBRO", "Membro"),
    ]

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="vinculos_igreja",
    )
    igreja = models.ForeignKey(
        Igreja,
        on_delete=models.CASCADE,
        related_name="vinculos_usuarios",
    )
    papel_institucional = models.CharField(
        max_length=30,
        choices=PAPEL_INSTITUCIONAL_CHOICES,
        default="MEMBRO",
    )
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "-joined_at", "-id"]
        verbose_name = "Vinculo Igreja Usuario"
        verbose_name_plural = "Vinculos Igreja Usuario"
        indexes = [
            models.Index(fields=["usuario", "is_active"]),
            models.Index(fields=["igreja", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "igreja"],
                name="unique_vinculo_igreja_usuario",
            ),
        ]

    def __str__(self):
        return f"{self.usuario.username} -> {self.igreja.nome}"


class VinculoMinisterioUsuario(models.Model):
    PAPEL_MINISTERIO_CHOICES = [
        ("MEMBRO", "Membro"),
    ]

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="vinculos_ministerio",
    )
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="vinculos_usuarios",
    )
    papel_no_ministerio = models.CharField(
        max_length=30,
        choices=PAPEL_MINISTERIO_CHOICES,
        default="MEMBRO",
    )
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_primary", "-is_active", "-joined_at", "-id"]
        verbose_name = "Vinculo Ministerio Usuario"
        verbose_name_plural = "Vinculos Ministerio Usuario"
        indexes = [
            models.Index(fields=["usuario", "is_active", "is_primary"]),
            models.Index(fields=["ministerio", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "ministerio"],
                name="unique_vinculo_ministerio_usuario",
            ),
        ]

    def __str__(self):
        return f"{self.usuario.username} -> {self.ministerio.nome}"


class IgrejaModulo(models.Model):
    igreja = models.ForeignKey(
        Igreja,
        on_delete=models.CASCADE,
        related_name="modulos_habilitados",
    )
    modulo = models.ForeignKey(
        Modulo,
        on_delete=models.CASCADE,
        related_name="igrejas_habilitadas",
    )
    is_enabled = models.BooleanField(default=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["igreja__nome", "modulo__nome"]
        verbose_name = "Igreja Modulo"
        verbose_name_plural = "Igrejas Modulos"
        indexes = [
            models.Index(fields=["igreja", "is_enabled"]),
            models.Index(fields=["modulo", "is_enabled"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["igreja", "modulo"],
                name="unique_igreja_modulo",
            ),
        ]

    def __str__(self):
        return f"{self.igreja.nome} -> {self.modulo.nome}"


class Musica(models.Model):
    ministerio = models.ForeignKey(
        Ministerio,
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
        indexes = [
            models.Index(fields=["is_active", "classificacao"]),
            models.Index(fields=["artista", "titulo"]),
            models.Index(fields=["metadata_last_synced_at"]),
        ]


class Evento(models.Model):
    STATUS_CHOICES = [
        ("AGENDADO", "Agendado"),
        ("REALIZADO", "Realizado"),
        ("CANCELADO", "Cancelado"),
    ]

    igreja = models.ForeignKey(
        Igreja,
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="eventos",
        blank=True,
        null=True,
    )
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True, null=True)
    data = models.DateField()
    horario_inicio = models.TimeField()
    horario_termino = models.TimeField(blank=True, null=True)
    local = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AGENDADO")
    source_module = models.SlugField(blank=True, null=True)
    source_type = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["data", "horario_inicio", "nome"]
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        indexes = [
            models.Index(fields=["igreja", "status", "data"]),
            models.Index(fields=["ministerio", "status", "data"]),
            models.Index(fields=["source_module", "status"]),
        ]

    def __str__(self):
        return f"{self.nome} - {self.data.strftime('%d/%m/%Y')}"


class Culto(models.Model):
    STATUS_CHOICES = [
        ("AGENDADO", "Agendado"),
        ("REALIZADO", "Realizado"),
        ("CANCELADO", "Cancelado"),
    ]

    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="cultos",
        blank=True,
        null=True,
    )
    evento = models.OneToOneField(
        Evento,
        on_delete=models.SET_NULL,
        related_name="culto_musical",
        blank=True,
        null=True,
    )
    nome = models.CharField(max_length=150)
    data = models.DateField()
    horario_inicio = models.TimeField()
    horario_termino = models.TimeField(blank=True, null=True)
    local = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AGENDADO")

    def __str__(self):
        return f"{self.nome} - {self.data.strftime('%d/%m/%Y')}"

    class Meta:
        indexes = [
            models.Index(fields=["ministerio", "status", "data"]),
        ]


class Escala(models.Model):
    STATUS_CONFIRMACAO = [
        ("PENDENTE", "Pendente"),
        ("CONFIRMADO", "Confirmado"),
        ("RECUSADO", "Recusado"),
    ]

    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="escalas",
        blank=True,
        null=True,
    )
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

    class Meta:
        indexes = [
            models.Index(fields=["ministerio", "status_confirmacao"]),
            models.Index(fields=["culto", "membro"]),
        ]


class ItemSetlist(models.Model):
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="setlists",
        blank=True,
        null=True,
    )
    culto = models.ForeignKey(Culto, on_delete=models.CASCADE, related_name="setlists")
    musica = models.ForeignKey(Musica, on_delete=models.RESTRICT)
    ordem = models.PositiveIntegerField(default=1)
    tom_execucao = models.CharField(max_length=10)
    observacoes = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ["ordem"]
        indexes = [
            models.Index(fields=["ministerio", "culto", "ordem"]),
        ]

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

    class Meta:
        indexes = [
            models.Index(fields=["usuario", "data_hora"]),
        ]


class LogAuditoria(models.Model):
    ACAO_CHOICES = [
        ("CREATE", "Criacao"),
        ("UPDATE", "Atualizacao"),
        ("DELETE", "Exclusao"),
    ]

    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    igreja = models.ForeignKey(
        Igreja,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs_auditoria",
    )
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs_auditoria",
    )
    escopo = models.CharField(max_length=20, default="platform")
    modulo = models.SlugField(blank=True, null=True)
    acao = models.CharField(max_length=10, choices=ACAO_CHOICES)
    modelo_afetado = models.CharField(max_length=50)
    descricao = models.CharField(max_length=255)
    data_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-data_hora"]
        indexes = [
            models.Index(fields=["escopo", "data_hora"]),
            models.Index(fields=["igreja", "data_hora"]),
            models.Index(fields=["ministerio", "data_hora"]),
            models.Index(fields=["modulo", "data_hora"]),
            models.Index(fields=["acao", "data_hora"]),
            models.Index(fields=["usuario", "data_hora"]),
        ]

    def __str__(self):
        nome = self.usuario.first_name if self.usuario else "Sistema"
        return f"{self.acao} em {self.modelo_afetado} por {nome}"


class ApiRequestErrorLog(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    igreja = models.ForeignKey(
        Igreja,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="api_error_logs",
    )
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="api_error_logs",
    )
    modulo = models.SlugField(blank=True, null=True)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    status_code = models.PositiveSmallIntegerField()
    error_code = models.CharField(max_length=100, blank=True, null=True)
    detail = models.CharField(max_length=500, blank=True, null=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["status_code", "occurred_at"]),
            models.Index(fields=["path", "occurred_at"]),
            models.Index(fields=["igreja", "occurred_at"]),
            models.Index(fields=["ministerio", "occurred_at"]),
            models.Index(fields=["modulo", "occurred_at"]),
        ]

    def __str__(self):
        return f"{self.method} {self.path} -> {self.status_code}"


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


class ConviteMinisterio(models.Model):
    STATUS_CHOICES = [
        ("PENDENTE", "Pendente"),
        ("ACEITO", "Aceito"),
        ("REVOGADO", "Revogado"),
        ("EXPIRADO", "Expirado"),
    ]

    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="convites",
    )
    email = models.EmailField(blank=True, null=True)
    nome_convidado = models.CharField(max_length=150, blank=True, null=True)
    nivel_acesso = models.IntegerField(choices=Usuario.NIVEL_ACESSO_CHOICES, default=3)
    token = models.CharField(max_length=128, unique=True, default=generate_invite_token)
    access_code = models.CharField(max_length=20, unique=True, default=generate_access_code)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDENTE")
    max_uses = models.PositiveIntegerField(default=1)
    uses_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(blank=True, null=True)
    accepted_at = models.DateTimeField(blank=True, null=True)
    invited_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convites_enviados",
    )
    accepted_by = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convites_aceitos",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Convite de Ministerio"
        verbose_name_plural = "Convites de Ministerio"

    def __str__(self):
        return f"{self.ministerio.nome} - {self.access_code}"

    @property
    def is_expired(self):
        return bool(self.expires_at and self.expires_at <= timezone.now())

    def can_be_used(self):
        if not self.is_active:
            return False
        if self.status in {"REVOGADO", "EXPIRADO"}:
            return False
        if self.is_expired:
            return False
        return self.uses_count < self.max_uses

    def mark_as_accepted(self, user):
        self.accepted_by = user
        self.accepted_at = timezone.now()
        self.uses_count += 1
        if self.uses_count >= self.max_uses:
            self.status = "ACEITO"
        self.save(update_fields=["accepted_by", "accepted_at", "uses_count", "status", "updated_at"])


class Team(models.Model):
    name = models.CharField(max_length=150)
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - {self.ministerio.nome}"
