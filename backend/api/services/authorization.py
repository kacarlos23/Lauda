from api.constants import (
    AUTH_SCOPE_CHURCH,
    AUTH_SCOPE_MINISTRY,
    AUTH_SCOPE_MODULE,
    AUTH_SCOPE_PLATFORM,
    AUTH_SCOPES,
    CAPABILITY_MANAGE_CHURCH,
    CAPABILITY_MANAGE_CULTOS,
    CAPABILITY_MANAGE_ESCALAS,
    CAPABILITY_MANAGE_MEMBERS,
    CAPABILITY_MANAGE_MINISTRY,
    CAPABILITY_MANAGE_MUSIC,
    CAPABILITY_MANAGE_PLATFORM,
    CAPABILITY_MANAGE_SETLISTS,
    CAPABILITY_VIEW_AUDITORIA,
    CAPABILITY_VIEW_MEMBERS,
    CAPABILITY_VIEW_MUSIC_MODULE,
    ROLE_CAPABILITY_MATRIX,
    ROLE_CHURCH_ADMIN,
    ROLE_MEMBER,
    ROLE_MINISTRY_ADMIN,
    ROLE_MINISTRY_LEADER,
    ROLE_PLATFORM_SUPER_ADMIN,
)
from api.services.institutional_context import (
    get_user_igreja,
    get_user_igreja_membership,
    get_user_ministerio,
    get_user_ministerio_membership,
)


LEGACY_CHURCH_ROLE_ALIASES = {
    "MEMBRO": ROLE_MEMBER,
    "MEMBER": ROLE_MEMBER,
    "CHURCH_ADMIN": ROLE_CHURCH_ADMIN,
    "ADMIN_IGREJA": ROLE_CHURCH_ADMIN,
    "ADMINISTRADOR_IGREJA": ROLE_CHURCH_ADMIN,
}

LEGACY_MINISTRY_ROLE_ALIASES = {
    "MEMBRO": ROLE_MEMBER,
    "MEMBER": ROLE_MEMBER,
    "MINISTRY_ADMIN": ROLE_MINISTRY_ADMIN,
    "ADMIN_MINISTERIO": ROLE_MINISTRY_ADMIN,
    "ADMINISTRADOR_MINISTERIO": ROLE_MINISTRY_ADMIN,
    "MINISTRY_LEADER": ROLE_MINISTRY_LEADER,
    "LIDER_MINISTERIO": ROLE_MINISTRY_LEADER,
    "LEADER": ROLE_MINISTRY_LEADER,
}

LEGACY_LOCAL_ROLE_BY_LEVEL = {
    1: ROLE_MINISTRY_ADMIN,
    2: ROLE_MINISTRY_LEADER,
    3: ROLE_MEMBER,
}


def normalize_role(raw_role, role_aliases):
    if not raw_role:
        return None

    if raw_role in role_aliases.values():
        return raw_role

    cleaned = str(raw_role).strip().upper()
    return role_aliases.get(cleaned)


def resolve_platform_role(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "is_superuser", False) or getattr(user, "is_global_admin", False):
        return ROLE_PLATFORM_SUPER_ADMIN
    return None


def resolve_church_role(user, igreja=None):
    membership = get_user_igreja_membership(user)
    role = normalize_role(
        getattr(membership, "papel_institucional", None),
        LEGACY_CHURCH_ROLE_ALIASES,
    )
    if role:
        return role

    current_igreja = igreja or get_user_igreja(user)
    if current_igreja is not None:
        return ROLE_MEMBER
    return None


def resolve_ministry_role(user, ministerio=None):
    membership = get_user_ministerio_membership(user)
    role = normalize_role(
        getattr(membership, "papel_no_ministerio", None),
        LEGACY_MINISTRY_ROLE_ALIASES,
    )
    if role:
        return role

    current_ministerio = ministerio or get_user_ministerio(user)
    if current_ministerio is None:
        return None
    return LEGACY_LOCAL_ROLE_BY_LEVEL.get(getattr(user, "nivel_acesso", None), ROLE_MEMBER)


def resolve_scope_roles(user, igreja=None, ministerio=None, module=None):
    current_ministerio = ministerio or get_user_ministerio(user)
    current_igreja = igreja or get_user_igreja(user, ministerio=current_ministerio)
    ministry_role = resolve_ministry_role(user, ministerio=current_ministerio)
    return {
        AUTH_SCOPE_PLATFORM: resolve_platform_role(user),
        AUTH_SCOPE_CHURCH: resolve_church_role(user, igreja=current_igreja),
        AUTH_SCOPE_MINISTRY: ministry_role,
        AUTH_SCOPE_MODULE: ministry_role if module else ministry_role,
    }


def get_scope_capabilities(role, scope):
    if not role:
        return set()
    return set(ROLE_CAPABILITY_MATRIX.get(role, {}).get(scope, []))


def resolve_capabilities(user, igreja=None, ministerio=None, module=None):
    roles = resolve_scope_roles(user, igreja=igreja, ministerio=ministerio, module=module)
    capabilities = set()
    platform_role = roles.get(AUTH_SCOPE_PLATFORM)
    for scope in AUTH_SCOPES:
        role = roles.get(scope)
        capabilities.update(get_scope_capabilities(role, scope))
        if platform_role and scope != AUTH_SCOPE_PLATFORM:
            capabilities.update(get_scope_capabilities(platform_role, scope))
    return sorted(capabilities)


def has_capability(user, capability, scope=None, igreja=None, ministerio=None, module=None):
    roles = resolve_scope_roles(user, igreja=igreja, ministerio=ministerio, module=module)
    platform_role = roles.get(AUTH_SCOPE_PLATFORM)
    scopes_to_check = [scope] if scope else AUTH_SCOPES

    for current_scope in scopes_to_check:
        role = roles.get(current_scope)
        if capability in get_scope_capabilities(role, current_scope):
            return True
        if platform_role and capability in get_scope_capabilities(platform_role, current_scope):
            return True
    return False


def build_authorization_snapshot(user, igreja=None, ministerio=None, module=None):
    roles = resolve_scope_roles(user, igreja=igreja, ministerio=ministerio, module=module)
    return {
        "roles": roles,
        "capabilities": resolve_capabilities(user, igreja=igreja, ministerio=ministerio, module=module),
        "legacy_mapping": {
            "is_global_admin": bool(getattr(user, "is_global_admin", False)),
            "is_superuser": bool(getattr(user, "is_superuser", False)),
            "nivel_acesso": getattr(user, "nivel_acesso", None),
        },
    }


LOW_RISK_CAPABILITY_DEFAULTS = {
    "view_members": CAPABILITY_VIEW_MEMBERS,
    "manage_members": CAPABILITY_MANAGE_MEMBERS,
    "manage_music": CAPABILITY_MANAGE_MUSIC,
    "manage_cultos": CAPABILITY_MANAGE_CULTOS,
    "manage_escalas": CAPABILITY_MANAGE_ESCALAS,
    "manage_setlists": CAPABILITY_MANAGE_SETLISTS,
    "view_auditoria": CAPABILITY_VIEW_AUDITORIA,
    "view_music_module": CAPABILITY_VIEW_MUSIC_MODULE,
    "manage_ministry": CAPABILITY_MANAGE_MINISTRY,
    "manage_church": CAPABILITY_MANAGE_CHURCH,
    "manage_platform": CAPABILITY_MANAGE_PLATFORM,
}
