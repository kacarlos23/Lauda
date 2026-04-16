from django.contrib import admin

from events.models import Culto, Escala, Evento


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ("nome", "igreja", "ministerio", "data", "horario_inicio", "status")
    list_filter = ("igreja", "ministerio", "status", "source_module", "source_type")
    search_fields = ("nome", "descricao", "local", "igreja__nome", "ministerio__nome")
    ordering = ("-data", "horario_inicio", "nome")


@admin.register(Culto)
class CultoAdmin(admin.ModelAdmin):
    list_display = ("nome", "ministerio", "evento", "data", "horario_inicio", "status")
    list_filter = ("ministerio", "status", "data")
    search_fields = ("nome", "local", "ministerio__nome", "evento__nome")
    ordering = ("-data", "horario_inicio", "nome")


@admin.register(Escala)
class EscalaAdmin(admin.ModelAdmin):
    list_display = ("culto", "membro", "ministerio", "status_confirmacao")
    list_filter = ("ministerio", "status_confirmacao")
    search_fields = ("culto__nome", "membro__username", "membro__email", "ministerio__nome")
    ordering = ("culto", "membro")
