from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from accounts.models import RegistroLogin, Usuario


def admin_site_has_permission(request):
    user = request.user
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and (user.is_global_admin or user.is_superuser)
    )


admin.site.has_permission = admin_site_has_permission


@admin.register(Usuario)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "ministerio_atual",
        "funcao_principal",
        "nivel_acesso",
        "is_global_admin",
        "is_active",
    )
    list_filter = (
        "is_global_admin",
        "nivel_acesso",
        "is_active",
        "is_staff",
        "funcao_principal",
    )
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("ministerio_atual",)

    fieldsets = UserAdmin.fieldsets + (
        (
            "Informacoes do Lauda",
            {
                "fields": (
                    "ministerio_atual",
                    "telefone",
                    "foto_perfil",
                    "funcao_principal",
                    "funcoes_secundarias",
                    "funcoes",
                    "nivel_acesso",
                    "is_global_admin",
                    "invite_accepted_at",
                    "access_code",
                ),
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Informacoes do Lauda",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "telefone",
                    "funcao_principal",
                    "funcoes_secundarias",
                    "funcoes",
                    "nivel_acesso",
                    "is_global_admin",
                ),
            },
        ),
    )

    @admin.display(description="Ministerio")
    def ministerio_atual(self, obj):
        return obj.ministerio


@admin.register(RegistroLogin)
class RegistroLoginAdmin(admin.ModelAdmin):
    list_display = ("usuario", "data_hora", "ip_address")
    list_filter = ("data_hora",)
    search_fields = ("usuario__username", "usuario__email", "ip_address")
    ordering = ("-data_hora",)
