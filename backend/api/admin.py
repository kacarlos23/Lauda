from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    ConviteMinisterio,
    Culto,
    Escala,
    Igreja,
    ItemSetlist,
    Ministerio,
    Musica,
    Team,
    Usuario,
    VinculoIgrejaUsuario,
    VinculoMinisterioUsuario,
)


def admin_site_has_permission(request):
    user = request.user
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and (user.is_global_admin or user.is_superuser)
    )


admin.site.has_permission = admin_site_has_permission


@admin.register(Igreja)
class IgrejaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("nome", "slug")


@admin.register(Ministerio)
class MinisterioAdmin(admin.ModelAdmin):
    list_display = ("nome", "igreja", "slug", "access_code", "is_open", "is_active", "created_at")
    list_filter = ("igreja", "is_open", "is_active")
    search_fields = ("nome", "slug", "access_code", "igreja__nome", "igreja__slug")


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = (
        "username",
        "first_name",
        "ministerio",
        "funcao_principal",
        "funcoes",
        "nivel_acesso",
        "is_global_admin",
        "is_active",
        "is_staff",
    )
    list_filter = ("ministerio", "nivel_acesso", "is_global_admin", "is_active", "is_staff", "funcao_principal")
    search_fields = ("first_name", "last_name", "username", "email")

    fieldsets = UserAdmin.fieldsets + (
        (
            "Informacoes do Lauda",
            {
                "fields": (
                    "ministerio",
                    "telefone",
                    "foto_perfil",
                    "funcao_principal",
                    "funcoes_secundarias",
                    "funcoes",
                    "nivel_acesso",
                    "is_global_admin",
                    "invite_accepted_at",
                )
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
                    "ministerio",
                    "telefone",
                    "funcao_principal",
                    "funcoes_secundarias",
                    "funcoes",
                    "nivel_acesso",
                    "is_global_admin",
                )
            },
        ),
    )


@admin.register(VinculoIgrejaUsuario)
class VinculoIgrejaUsuarioAdmin(admin.ModelAdmin):
    list_display = ("usuario", "igreja", "papel_institucional", "is_active", "joined_at")
    list_filter = ("igreja", "papel_institucional", "is_active")
    search_fields = ("usuario__username", "usuario__first_name", "igreja__nome", "igreja__slug")


@admin.register(VinculoMinisterioUsuario)
class VinculoMinisterioUsuarioAdmin(admin.ModelAdmin):
    list_display = ("usuario", "ministerio", "papel_no_ministerio", "is_primary", "is_active", "joined_at")
    list_filter = ("ministerio", "papel_no_ministerio", "is_primary", "is_active")
    search_fields = ("usuario__username", "usuario__first_name", "ministerio__nome", "ministerio__slug")


@admin.register(Musica)
class MusicaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "artista", "classificacao", "ministerio", "tom_original", "bpm", "is_active")
    list_filter = ("ministerio", "classificacao", "is_active")
    search_fields = ("titulo", "artista", "classificacao", "tags")


@admin.register(Culto)
class CultoAdmin(admin.ModelAdmin):
    list_display = ("nome", "ministerio", "data", "horario_inicio", "status")
    list_filter = ("ministerio", "status", "data")


@admin.register(ConviteMinisterio)
class ConviteMinisterioAdmin(admin.ModelAdmin):
    list_display = ("ministerio", "email", "access_code", "status", "uses_count", "max_uses", "expires_at")
    list_filter = ("ministerio", "status", "is_active")
    search_fields = ("email", "access_code", "token", "nome_convidado")
    readonly_fields = ("token", "access_code", "uses_count", "accepted_at", "created_at", "updated_at")


admin.site.register(Escala)
admin.site.register(ItemSetlist)
admin.site.register(Team)
