from datetime import timedelta

from django.db.models import Count, Q
from django.utils.timezone import now

from api.constants import (
    AUTH_SCOPE_CHURCH,
    AUTH_SCOPE_MINISTRY,
    AUTH_SCOPE_MODULE,
    AUTH_SCOPE_PLATFORM,
    MODULE_KEY_MUSIC,
)
from api.models import (
    ApiRequestErrorLog,
    Culto,
    Escala,
    Evento,
    Igreja,
    IgrejaModulo,
    ItemSetlist,
    LogAuditoria,
    Musica,
    RegistroLogin,
    VinculoIgrejaUsuario,
)
from api.services.institutional_context import get_user_igreja, get_user_ministerio


DATA_OWNERSHIP_MAP = {
    AUTH_SCOPE_PLATFORM: [
        "catalogo de modulos",
        "configuracoes globais do produto",
        "observabilidade agregada",
    ],
    AUTH_SCOPE_CHURCH: [
        "identidade institucional da igreja",
        "configuracoes da igreja",
        "agenda institucional base",
        "membros vinculados a igreja",
    ],
    AUTH_SCOPE_MINISTRY: [
        "usuarios em contexto operacional do ministerio",
        "cultos e eventos departamentais",
        "equipes e convites do ministerio",
    ],
    AUTH_SCOPE_MODULE: [
        "catalogo musical ativo",
        "escalas",
        "setlists",
        "metadados especificos do modulo de musica",
    ],
}

STORAGE_GOVERNANCE = {
    "database_fields": [
        "Usuario.foto_perfil",
        "Musica.cifra_pdf",
    ],
    "policy": (
        "Uploads continuam referenciados pelo banco, mas a estrategia recomendada "
        "e usar storage externo/objeto para arquivos binarios, mantendo no banco "
        "apenas metadados e caminhos."
    ),
}


def derive_scope_from_context(igreja=None, ministerio=None, modulo=None):
    if modulo:
        return AUTH_SCOPE_MODULE
    if ministerio is not None:
        return AUTH_SCOPE_MINISTRY
    if igreja is not None:
        return AUTH_SCOPE_CHURCH
    return AUTH_SCOPE_PLATFORM


def derive_audit_context(user=None, instance=None, modulo=None, igreja=None, ministerio=None, modelo=None):
    resolved_ministry = ministerio
    resolved_church = igreja
    resolved_module = modulo

    if instance is not None:
        if getattr(instance, "ministerio_id", None):
            resolved_ministry = resolved_ministry or getattr(instance, "ministerio", None)
        if getattr(instance, "igreja_id", None):
            resolved_church = resolved_church or getattr(instance, "igreja", None)
        if getattr(instance, "source_module", None):
            resolved_module = resolved_module or instance.source_module

        if resolved_ministry is None and hasattr(instance, "ministerio"):
            resolved_ministry = getattr(instance, "ministerio", None)
        if resolved_church is None and hasattr(instance, "igreja"):
            resolved_church = getattr(instance, "igreja", None)

    if resolved_ministry is None and user is not None:
        resolved_ministry = get_user_ministerio(user)
    if resolved_church is None:
        if resolved_ministry is not None and getattr(resolved_ministry, "igreja", None) is not None:
            resolved_church = resolved_ministry.igreja
        elif user is not None:
            resolved_church = get_user_igreja(user, ministerio=resolved_ministry)

    if resolved_module is None and modelo in {"Musica", "Culto", "Escala", "ItemSetlist"}:
        resolved_module = MODULE_KEY_MUSIC
    if resolved_module is None and getattr(instance, "culto_id", None):
        resolved_module = MODULE_KEY_MUSIC

    return {
        "igreja": resolved_church,
        "ministerio": resolved_ministry,
        "modulo": resolved_module,
        "escopo": derive_scope_from_context(
            igreja=resolved_church,
            ministerio=resolved_ministry,
            modulo=resolved_module,
        ),
    }


def get_governance_snapshot():
    last_24h = now() - timedelta(hours=24)
    last_7d = now() - timedelta(days=7)

    active_churches = Igreja.objects.filter(is_active=True)
    active_music_links = IgrejaModulo.objects.filter(
        is_enabled=True,
        modulo__chave=MODULE_KEY_MUSIC,
        modulo__is_active=True,
    )

    users_by_church = (
        VinculoIgrejaUsuario.objects.filter(is_active=True, igreja__is_active=True)
        .values("igreja_id", "igreja__nome")
        .annotate(total=Count("id"))
        .order_by("igreja__nome")
    )

    active_modules_by_church = (
        active_churches.annotate(
            total_modulos_ativos=Count(
                "modulos_habilitados",
                filter=Q(
                    modulos_habilitados__is_enabled=True,
                    modulos_habilitados__modulo__is_active=True,
                ),
            )
        )
        .values("id", "nome", "total_modulos_ativos")
        .order_by("nome")
    )

    top_api_errors = (
        ApiRequestErrorLog.objects.filter(occurred_at__gte=last_7d)
        .values("path", "status_code", "modulo")
        .annotate(total=Count("id"))
        .order_by("-total", "path")[:5]
    )

    return {
        "ownership": DATA_OWNERSHIP_MAP,
        "metrics": {
            "igrejas_ativas": active_churches.count(),
            "modulos_ativos_por_igreja": list(active_modules_by_church),
            "usuarios_por_igreja": list(users_by_church),
            "modulo_musica": {
                "igrejas_com_modulo_ativo": active_music_links.values("igreja_id").distinct().count(),
                "musicas_ativas": Musica.objects.filter(is_active=True).count(),
                "cultos_total": Culto.objects.count(),
                "eventos_total": Evento.objects.count(),
                "escalas_total": Escala.objects.count(),
                "setlists_total": ItemSetlist.objects.count(),
            },
            "atividade_recente": {
                "logins_24h": RegistroLogin.objects.filter(data_hora__gte=last_24h).count(),
                "auditoria_24h": LogAuditoria.objects.filter(data_hora__gte=last_24h).count(),
            },
            "top_api_errors_7d": list(top_api_errors),
        },
        "storage": STORAGE_GOVERNANCE,
        "critical_queries_reviewed": [
            "login e sessao por username/token",
            "carregamento de contexto institucional",
            "modulos ativos por igreja",
            "listagem do modulo de musica",
            "auditoria e observabilidade por escopo",
        ],
    }
