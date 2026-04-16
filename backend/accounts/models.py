from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

from system.constants import USER_FUNCTION_SET


class UsuarioManager(UserManager):
    use_in_migrations = True

    def _create_user_object(self, username, email, password, **extra_fields):
        ministerio = extra_fields.pop("ministerio", None)
        user = super()._create_user_object(username, email, password, **extra_fields)
        if ministerio is not None:
            user.ministerio = ministerio
        return user


class Usuario(AbstractUser):
    NIVEL_ACESSO_CHOICES = [
        (1, "Administrador"),
        (2, "Lider de Louvor"),
        (3, "Membro"),
    ]

    objects = UsuarioManager()

    email = models.EmailField(unique=True)
    telefone = models.CharField(max_length=20, blank=True)
    foto_perfil = models.ImageField(upload_to="perfil/", blank=True, null=True)
    funcao_principal = models.CharField(max_length=100, blank=True, default="")
    funcoes_secundarias = models.TextField(
        blank=True,
        null=True,
        help_text="Ex: Violao, Teclado",
    )
    funcoes = models.JSONField(default=list, blank=True)
    nivel_acesso = models.IntegerField(choices=NIVEL_ACESSO_CHOICES, default=3)
    is_global_admin = models.BooleanField(default=False)
    invite_accepted_at = models.DateTimeField(blank=True, null=True)
    access_code = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Desmarque para inativar o membro em vez de deletar",
    )

    @property
    def ministerio(self):
        if hasattr(self, "_ministerio_override"):
            return self._ministerio_override

        vinculo = (
            self.vinculos_ministerio.filter(is_primary=True, is_active=True)
            .select_related("ministerio")
            .first()
        )
        return vinculo.ministerio if vinculo else None

    @ministerio.setter
    def ministerio(self, value):
        self._ministerio_override = value

    @property
    def ministerio_id(self):
        ministerio = self.ministerio
        return ministerio.id if ministerio else None

    @staticmethod
    def normalize_funcoes(funcoes_input: list) -> tuple:
        normalized = []
        for value in funcoes_input:
            if not isinstance(value, str):
                continue
            cleaned = value.strip()
            if cleaned and cleaned in USER_FUNCTION_SET and cleaned not in normalized:
                normalized.append(cleaned)
        return normalized, normalized[0] if normalized else ""

    def get_normalized_funcoes(self):
        values = list(self.funcoes or [])
        if self.funcao_principal:
            values.insert(0, self.funcao_principal)
        if self.funcoes_secundarias:
            values.extend(self.funcoes_secundarias.split(","))
        normalized, _ = self.normalize_funcoes(values)
        return normalized

    def sync_access_flags(self):
        self.is_staff = bool(self.is_global_admin or self.is_superuser)

    def save(self, *args, **kwargs):
        self.funcoes = self.get_normalized_funcoes()
        self.funcao_principal = self.funcoes[0] if self.funcoes else ""
        self.funcoes_secundarias = ", ".join(self.funcoes[1:]) if len(self.funcoes) > 1 else ""
        self.sync_access_flags()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_nivel_acesso_display()})"

    class Meta(AbstractUser.Meta):
        db_table = "api_usuario"
        app_label = "accounts"
        indexes = [
            models.Index(fields=["nivel_acesso"], name="idx_usuario_nivel"),
            models.Index(fields=["is_active"], name="idx_usuario_ativo"),
            models.Index(fields=["is_global_admin", "is_active"]),
            models.Index(fields=["nivel_acesso", "is_active"]),
        ]


class RegistroLogin(models.Model):
    usuario = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="historico_logins",
    )
    data_hora = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)

    def __str__(self):
        return f"{self.usuario.username} logou em {self.data_hora.strftime('%d/%m/%Y %H:%M')}"

    class Meta:
        app_label = "api"
        indexes = [
            models.Index(fields=["usuario", "data_hora"]),
        ]
