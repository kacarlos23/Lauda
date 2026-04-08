from django.db.models import Q

from api.constants import (
    AUTH_SCOPE_CHURCH,
    AUTH_SCOPE_MINISTRY,
    CAPABILITY_MANAGE_CHURCH,
    CAPABILITY_MANAGE_MINISTRY,
    MODULE_KEY_MUSIC,
)
from api.models import Evento
from api.services.access_context import resolve_scoped_ministry
from api.services.authorization import has_capability
from api.services.institutional_context import get_user_igreja, get_user_ministerio


AGENDA_SOURCE_TYPE_CULTO = "MUSIC_CULTO"


def is_platform_admin(user):
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False))
    )


def build_evento_payload_from_culto(culto):
    ministerio = culto.ministerio
    igreja = getattr(ministerio, "igreja", None)
    if igreja is None:
        return None

    return {
        "igreja": igreja,
        "ministerio": ministerio,
        "nome": culto.nome,
        "descricao": "Evento base sincronizado automaticamente a partir de um culto do modulo de musica.",
        "data": culto.data,
        "horario_inicio": culto.horario_inicio,
        "horario_termino": culto.horario_termino,
        "local": culto.local,
        "status": culto.status,
        "source_module": MODULE_KEY_MUSIC,
        "source_type": AGENDA_SOURCE_TYPE_CULTO,
    }


def sync_culto_evento(culto):
    payload = build_evento_payload_from_culto(culto)
    if payload is None:
        return None
    evento = getattr(culto, "evento", None)

    if evento is None:
        evento = Evento.objects.create(**payload)
        culto.evento = evento
        culto.save(update_fields=["evento"])
        return evento

    updated_fields = []
    for field_name, value in payload.items():
        if getattr(evento, field_name) != value:
            setattr(evento, field_name, value)
            updated_fields.append(field_name)

    if updated_fields:
        evento.save(update_fields=[*updated_fields, "updated_at"])

    return evento


def delete_linked_evento_for_culto(culto):
    evento = getattr(culto, "evento", None)
    if evento is not None:
        evento.delete()


def get_visible_eventos_queryset(user, token=None):
    queryset = Evento.objects.select_related("igreja", "ministerio").all()
    ministry = resolve_scoped_ministry(user, token) or get_user_ministerio(user)
    church = get_user_igreja(user, ministerio=ministry)

    if is_platform_admin(user):
        if ministry is not None:
            return queryset.filter(Q(ministerio=ministry) | Q(igreja=church, ministerio__isnull=True))
        if church is not None:
            return queryset.filter(igreja=church)
        return queryset

    if ministry is not None and church is not None:
        return queryset.filter(igreja=church).filter(Q(ministerio=ministry) | Q(ministerio__isnull=True))

    if church is not None:
        return queryset.filter(igreja=church)

    return queryset.none()


def format_evento_for_agenda(evento):
    return {
        "id": evento.id,
        "nome": evento.nome,
        "descricao": evento.descricao,
        "data": evento.data,
        "horario_inicio": evento.horario_inicio,
        "horario_termino": evento.horario_termino,
        "local": evento.local,
        "status": evento.status,
        "igreja_id": evento.igreja_id,
        "ministerio_id": evento.ministerio_id,
        "source_module": evento.source_module,
        "source_type": evento.source_type,
        "culto_id": getattr(getattr(evento, "culto_musical", None), "id", None),
    }


def list_institutional_agenda(user, token=None):
    return [format_evento_for_agenda(evento) for evento in get_visible_eventos_queryset(user, token)]


def validate_evento_scope_for_write(user, token=None, igreja=None, ministerio=None):
    scoped_ministry = resolve_scoped_ministry(user, token) or get_user_ministerio(user)
    scoped_church = get_user_igreja(user, ministerio=scoped_ministry)

    if is_platform_admin(user):
        if igreja is None and ministerio is not None:
            igreja = ministerio.igreja
        if igreja is None:
            raise ValueError("Uma igreja valida e obrigatoria para este evento.")
        if ministerio is not None and ministerio.igreja_id != igreja.id:
            raise ValueError("O ministerio informado precisa pertencer a igreja do evento.")
        return igreja, ministerio

    if scoped_church is None:
        raise ValueError("Usuario sem igreja vinculada para operar agenda base.")

    can_manage_church = has_capability(
        user,
        CAPABILITY_MANAGE_CHURCH,
        scope=AUTH_SCOPE_CHURCH,
        igreja=scoped_church,
        ministerio=scoped_ministry,
    )
    can_manage_ministry = has_capability(
        user,
        CAPABILITY_MANAGE_MINISTRY,
        scope=AUTH_SCOPE_MINISTRY,
        igreja=scoped_church,
        ministerio=scoped_ministry,
    )

    if not can_manage_church and not can_manage_ministry:
        raise PermissionError("Usuario sem permissao para gerenciar agenda base.")

    target_igreja = igreja or scoped_church
    if target_igreja.id != scoped_church.id:
        raise ValueError("O evento precisa pertencer a igreja em escopo.")

    if ministerio is not None and ministerio.igreja_id != scoped_church.id:
        raise ValueError("O ministerio informado pertence a outra igreja.")

    if can_manage_church:
        return target_igreja, ministerio

    if scoped_ministry is None:
        raise ValueError("Um ministerio valido e obrigatorio para este evento.")

    if ministerio is None:
        ministerio = scoped_ministry

    if ministerio.id != scoped_ministry.id:
        raise ValueError("Voce so pode gerenciar eventos do proprio ministerio.")

    return target_igreja, ministerio
