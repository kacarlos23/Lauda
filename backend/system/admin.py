from django.contrib import admin

from system.models import ApiRequestErrorLog, IgrejaModulo, LogAuditoria, Modulo, UserPermissionGrant


@admin.register(Modulo)
class ModuloAdmin(admin.ModelAdmin):
    list_display = ("nome", "chave", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("nome", "chave", "descricao")
    ordering = ("nome",)


@admin.register(IgrejaModulo)
class IgrejaModuloAdmin(admin.ModelAdmin):
    list_display = ("igreja", "modulo", "is_enabled", "created_at")
    list_filter = ("igreja", "modulo", "is_enabled")
    search_fields = ("igreja__nome", "modulo__nome", "modulo__chave")
    ordering = ("igreja__nome", "modulo__nome")


@admin.register(UserPermissionGrant)
class UserPermissionGrantAdmin(admin.ModelAdmin):
    list_display = ("usuario", "permission_codename", "ministerio", "is_active", "granted_at")
    list_filter = ("is_active", "permission_codename")
    search_fields = ("usuario__username", "usuario__email", "ministerio__nome", "igreja__nome")
    readonly_fields = ("granted_at", "granted_by")
    ordering = ("-granted_at",)


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ("data_hora", "usuario", "acao", "modelo_afetado", "escopo", "modulo")
    list_filter = ("acao", "modelo_afetado", "escopo", "modulo")
    search_fields = ("usuario__username", "descricao", "modelo_afetado")
    readonly_fields = (
        "data_hora",
        "usuario",
        "igreja",
        "ministerio",
        "escopo",
        "modulo",
        "acao",
        "modelo_afetado",
        "descricao",
        "metadata",
        "instance_content_type",
        "instance_id",
    )
    ordering = ("-data_hora",)


@admin.register(ApiRequestErrorLog)
class ApiRequestErrorLogAdmin(admin.ModelAdmin):
    list_display = ("occurred_at", "method", "path", "status_code", "modulo", "usuario")
    list_filter = ("status_code", "method", "modulo")
    search_fields = ("path", "detail", "usuario__username", "usuario__email")
    readonly_fields = ("occurred_at",)
    ordering = ("-occurred_at",)
