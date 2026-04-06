from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ConviteMinisterio, Culto, Escala, ItemSetlist, Ministerio, Musica, Team, Usuario


@admin.register(Ministerio)
class MinisterioAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "access_code", "is_open", "is_active", "created_at")
    list_filter = ("is_open", "is_active")
    search_fields = ("nome", "slug", "access_code")


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
