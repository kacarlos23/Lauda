from django.contrib import admin

from institutions.models import (
    ConviteMinisterio,
    Igreja,
    Ministerio,
    Team,
    VinculoIgrejaUsuario,
    VinculoMinisterioUsuario,
)


@admin.register(Igreja)
class IgrejaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("nome", "slug")
    ordering = ("nome",)


@admin.register(Ministerio)
class MinisterioAdmin(admin.ModelAdmin):
    list_display = ("nome", "igreja", "slug", "access_code", "is_open", "is_active")
    list_filter = ("igreja", "is_open", "is_active")
    search_fields = ("nome", "slug", "access_code", "igreja__nome")
    ordering = ("nome",)


@admin.register(VinculoIgrejaUsuario)
class VinculoIgrejaUsuarioAdmin(admin.ModelAdmin):
    list_display = ("usuario", "igreja", "papel_institucional", "is_active", "joined_at")
    list_filter = ("igreja", "papel_institucional", "is_active")
    search_fields = ("usuario__username", "usuario__email", "igreja__nome")
    ordering = ("-joined_at",)


@admin.register(VinculoMinisterioUsuario)
class VinculoMinisterioUsuarioAdmin(admin.ModelAdmin):
    list_display = ("usuario", "ministerio", "papel_no_ministerio", "is_primary", "is_active", "joined_at")
    list_filter = ("ministerio", "papel_no_ministerio", "is_primary", "is_active")
    search_fields = ("usuario__username", "usuario__email", "ministerio__nome")
    ordering = ("-joined_at",)


@admin.register(ConviteMinisterio)
class ConviteMinisterioAdmin(admin.ModelAdmin):
    list_display = ("ministerio", "email", "access_code", "status", "uses_count", "max_uses", "expires_at")
    list_filter = ("ministerio", "status", "is_active")
    search_fields = ("email", "access_code", "token", "nome_convidado")
    readonly_fields = ("token", "access_code", "uses_count", "accepted_at", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "ministerio", "created_at")
    list_filter = ("ministerio",)
    search_fields = ("name", "ministerio__nome")
    ordering = ("name",)
