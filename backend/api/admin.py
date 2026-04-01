from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ConviteMinisterio, Culto, Escala, ItemSetlist, Ministerio, Musica, Usuario


@admin.register(Ministerio)
class MinisterioAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("nome", "slug")


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = (
        "username",
        "first_name",
        "ministerio",
        "funcao_principal",
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
                    "nivel_acesso",
                    "is_global_admin",
                )
            },
        ),
    )


@admin.register(Musica)
class MusicaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "artista", "ministerio", "tom_original", "bpm", "is_active")
    list_filter = ("ministerio", "is_active")
    search_fields = ("titulo", "artista", "tags")


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
