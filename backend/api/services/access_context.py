from api.models import Ministerio

from .institutional_context import get_user_ministerio


def normalize_ministry_id(value):
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_scoped_ministry_id(user, token=None):
    if not user or not user.is_authenticated:
        return None
    if user.is_global_admin or user.is_superuser:
        token_get = getattr(token, "get", None)
        return normalize_ministry_id(token_get("ministerio_id") if callable(token_get) else None)
    ministerio = get_user_ministerio(user)
    return ministerio.id if ministerio else user.ministerio_id


def resolve_scoped_ministry(user, token=None):
    ministry_id = resolve_scoped_ministry_id(user, token)
    if ministry_id is None:
        return get_user_ministerio(user)
    if getattr(user, "ministerio_id", None) == ministry_id and getattr(user, "ministerio", None) is not None:
        return user.ministerio
    return Ministerio.objects.select_related("igreja").filter(id=ministry_id).first()
