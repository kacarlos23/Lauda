import secrets
import string

from django.db import models
from django.utils import timezone

from accounts.models import Usuario


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
        app_label = "api"
        ordering = ["nome"]
        verbose_name = "Igreja"
        verbose_name_plural = "Igrejas"

    def __str__(self):
        return self.nome


class Ministerio(models.Model):
    igreja = models.ForeignKey(
        "api.Igreja",
        on_delete=models.SET_NULL,
        related_name="ministerios",
        blank=True,
        null=True,
    )
    nome = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    access_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        default=generate_access_code,
        help_text="Codigo unico para acesso/convite ao ministerio",
    )
    logo_url = models.URLField(blank=True, null=True)
    is_open = models.BooleanField(default=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_ministerio"
        app_label = "api"
        ordering = ["nome"]
        verbose_name = "Ministerio"
        verbose_name_plural = "Ministerios"
        indexes = [
            models.Index(fields=["nome", "is_active"], name="idx_minist_nome_active"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["access_code"],
                condition=models.Q(is_active=True),
                name="unique_active_ministerio_access_code",
            ),
        ]

    def __str__(self):
        return self.nome


class VinculoIgrejaUsuario(models.Model):
    PAPEL_INSTITUCIONAL_CHOICES = [
        ("MEMBRO", "Membro"),
    ]

    usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="vinculos_igreja",
    )
    igreja = models.ForeignKey(
        "api.Igreja",
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
        app_label = "api"
        ordering = ["-is_active", "-joined_at", "-id"]
        verbose_name = "Vinculo Igreja Usuario"
        verbose_name_plural = "Vinculos Igreja Usuario"
        indexes = [
            models.Index(fields=["usuario", "is_active"], name="idx_vig_user_active"),
            models.Index(fields=["igreja", "is_active"], name="idx_vig_igreja_active"),
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
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="vinculos_ministerio",
    )
    ministerio = models.ForeignKey(
        "api.Ministerio",
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
        app_label = "api"
        ordering = ["-is_primary", "-is_active", "-joined_at", "-id"]
        verbose_name = "Vinculo Ministerio Usuario"
        verbose_name_plural = "Vinculos Ministerio Usuario"
        indexes = [
            models.Index(fields=["usuario", "is_active"], name="idx_vmin_user_active"),
            models.Index(fields=["ministerio", "is_active"], name="idx_vmin_min_active"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "ministerio"],
                name="unique_vinculo_ministerio_usuario",
            ),
        ]

    def __str__(self):
        return f"{self.usuario.username} -> {self.ministerio.nome}"


class ConviteMinisterio(models.Model):
    STATUS_CHOICES = [
        ("PENDENTE", "Pendente"),
        ("ACEITO", "Aceito"),
        ("REVOGADO", "Revogado"),
        ("EXPIRADO", "Expirado"),
    ]

    ministerio = models.ForeignKey(
        "api.Ministerio",
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
        "accounts.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convites_enviados",
    )
    accepted_by = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convites_aceitos",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "api"
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
        "api.Ministerio",
        on_delete=models.CASCADE,
        related_name="teams",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "api"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - {self.ministerio.nome}"
