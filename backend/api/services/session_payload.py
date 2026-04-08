from rest_framework_simplejwt.tokens import RefreshToken

from .authorization import build_authorization_snapshot
from .institutional_context import (
    get_user_igreja,
    get_user_igreja_membership,
    get_user_ministerio,
    get_user_ministerio_membership,
    has_user_institutional_membership,
)
from .modular_context import get_active_module_keys_for_user


def build_user_payload(user, scoped_ministry=None):
    is_global_admin = bool(user.is_global_admin or user.is_superuser)
    igreja_membership = get_user_igreja_membership(user)
    ministerio_membership = get_user_ministerio_membership(user)
    effective_ministry = scoped_ministry if is_global_admin else get_user_ministerio(user)
    effective_ministry_id = effective_ministry.id if effective_ministry else user.ministerio_id
    igreja = get_user_igreja(user, ministerio=effective_ministry)
    authorization = build_authorization_snapshot(
        user,
        igreja=igreja,
        ministerio=effective_ministry,
    )
    active_modules = get_active_module_keys_for_user(
        user,
        igreja=igreja,
        ministerio=effective_ministry,
    )
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "nivel_acesso": user.nivel_acesso,
        "nivel_acesso_label": user.get_nivel_acesso_display(),
        "escopo_acesso": "GLOBAL" if is_global_admin else "MINISTERIO",
        "papel_display": "Admin Global" if is_global_admin else user.get_nivel_acesso_display(),
        "is_global_admin": user.is_global_admin,
        "is_superuser": user.is_superuser,
        "is_impersonating": bool(is_global_admin and effective_ministry_id),
        "ministerio_id": effective_ministry_id,
        "ministerio_nome": effective_ministry.nome if effective_ministry else None,
        "ministerio_slug": effective_ministry.slug if effective_ministry else None,
        "igreja_id": igreja.id if igreja else None,
        "igreja_nome": igreja.nome if igreja else None,
        "igreja_slug": igreja.slug if igreja else None,
        "igreja_membership_id": igreja_membership.id if igreja_membership else None,
        "igreja_membership_papel": igreja_membership.papel_institucional if igreja_membership else None,
        "ministerio_membership_id": ministerio_membership.id if ministerio_membership else None,
        "ministerio_membership_papel": ministerio_membership.papel_no_ministerio if ministerio_membership else None,
        "ministerio_membership_is_primary": ministerio_membership.is_primary if ministerio_membership else False,
        "has_institutional_membership": has_user_institutional_membership(user),
        "authorization_roles": authorization["roles"],
        "capabilities": authorization["capabilities"],
        "active_modules": active_modules,
        "telefone": user.telefone or "",
        "is_active": user.is_active,
        "funcao_principal": user.funcao_principal or "",
        "funcoes": user.get_normalized_funcoes(),
    }


def build_auth_payload(user, scoped_ministry=None):
    effective_ministry = scoped_ministry if scoped_ministry is not None else get_user_ministerio(user)
    igreja_membership = get_user_igreja_membership(user)
    ministerio_membership = get_user_ministerio_membership(user)
    igreja = get_user_igreja(user, ministerio=effective_ministry)
    refresh = RefreshToken.for_user(user)
    refresh["is_global_admin"] = user.is_global_admin
    refresh["is_superuser"] = user.is_superuser
    refresh["nivel_acesso"] = user.nivel_acesso
    refresh["ministerio_id"] = effective_ministry.id if effective_ministry else None
    refresh["ministerio_slug"] = effective_ministry.slug if effective_ministry else None
    refresh["igreja_id"] = igreja.id if igreja else None
    refresh["igreja_slug"] = igreja.slug if igreja else None
    refresh["igreja_membership_id"] = igreja_membership.id if igreja_membership else None
    refresh["ministerio_membership_id"] = ministerio_membership.id if ministerio_membership else None

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": build_user_payload(user, scoped_ministry=effective_ministry),
    }
