from django.contrib.contenttypes.fields import GenericForeignKey
from django.db import models

from accounts.models import Usuario
from institutions.models import Igreja, Ministerio
from system.constants import MODULE_KEY_EVENTS, MODULE_KEY_MUSIC


class Modulo(models.Model):
    nome = models.CharField(max_length=150)
    chave = models.SlugField(unique=True)
    descricao = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "api"
        ordering = ["nome"]
        verbose_name = "Modulo"
        verbose_name_plural = "Modulos"

    def __str__(self):
        return self.nome

    @classmethod
    def official_defaults(cls, module_key):
        from system.module_blueprint import get_module_catalog_entry

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


class IgrejaModulo(models.Model):
    igreja = models.ForeignKey(
        "api.Igreja",
        on_delete=models.CASCADE,
        related_name="modulos_habilitados",
    )
    modulo = models.ForeignKey(
        "api.Modulo",
        on_delete=models.CASCADE,
        related_name="igrejas_habilitadas",
    )
    is_enabled = models.BooleanField(default=True)
    configuracoes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "api"
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


class LogAuditoria(models.Model):
    ACAO_CHOICES = [
        ("CREATE", "Criacao"),
        ("UPDATE", "Atualizacao"),
        ("DELETE", "Exclusao"),
    ]

    usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs_auditoria",
    )
    igreja = models.ForeignKey(
        "api.Igreja",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs_auditoria",
    )
    ministerio = models.ForeignKey(
        "api.Ministerio",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs_auditoria",
    )
    instance_content_type = models.ForeignKey(
        "contenttypes.ContentType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    instance_id = models.PositiveIntegerField(null=True, blank=True)
    instance = GenericForeignKey("instance_content_type", "instance_id")
    escopo = models.CharField(max_length=50, default="platform", null=True, blank=True)
    modulo = models.SlugField(blank=True, null=True)
    acao = models.CharField(max_length=100, choices=ACAO_CHOICES)
    modelo_afetado = models.CharField(max_length=100)
    descricao = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    data_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_logauditoria"
        app_label = "api"
        ordering = ["-data_hora"]
        verbose_name = "Log de Auditoria"
        verbose_name_plural = "Logs de Auditoria"
        indexes = [
            models.Index(fields=["escopo", "data_hora"]),
            models.Index(fields=["igreja", "data_hora"]),
            models.Index(fields=["ministerio", "data_hora"]),
            models.Index(fields=["modulo", "data_hora"]),
            models.Index(fields=["acao", "data_hora"]),
            models.Index(fields=["usuario", "data_hora"]),
            models.Index(fields=["instance_content_type", "instance_id"]),
        ]

    def __str__(self):
        nome = self.usuario.first_name if self.usuario else "Sistema"
        return f"{self.acao} em {self.modelo_afetado} por {nome}"


class ApiRequestErrorLog(models.Model):
    usuario = models.ForeignKey("accounts.Usuario", on_delete=models.SET_NULL, null=True, blank=True)
    igreja = models.ForeignKey(
        "api.Igreja",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="api_error_logs",
    )
    ministerio = models.ForeignKey(
        "api.Ministerio",
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
        app_label = "api"
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


class UserPermissionGrant(models.Model):
    """Permissoes granulares sobrepostas as regras padrao de papel/nivel."""

    PERMISSION_CHOICES = [
        ("music.add_musica", "Criar Musica"),
        ("music.change_musica", "Editar Musica"),
        ("music.delete_musica", "Excluir Musica"),
        ("events.add_culto", "Criar Culto"),
        ("events.change_culto", "Editar Culto"),
        ("events.delete_culto", "Excluir Culto"),
    ]

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="permission_grants")
    permission_codename = models.CharField(max_length=100, choices=PERMISSION_CHOICES)
    igreja = models.ForeignKey(Igreja, on_delete=models.CASCADE, null=True, blank=True, related_name="permission_grants")
    ministerio = models.ForeignKey(
        Ministerio,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="permission_grants",
    )
    granted_by = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name="granted_permissions")
    granted_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "system_userpermissiongrant"
        unique_together = ["usuario", "permission_codename", "igreja", "ministerio"]
        indexes = [models.Index(fields=["usuario", "is_active"])]

    def __str__(self):
        return f"{self.usuario.username} -> {self.permission_codename} (Ativo: {self.is_active})"
