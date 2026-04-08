from rest_framework import permissions

from .constants import (
    AUTH_SCOPE_CHURCH,
    AUTH_SCOPE_MINISTRY,
    AUTH_SCOPE_MODULE,
    AUTH_SCOPE_PLATFORM,
    CAPABILITY_MANAGE_CHURCH,
    CAPABILITY_MANAGE_CULTOS,
    CAPABILITY_MANAGE_ESCALAS,
    CAPABILITY_MANAGE_MINISTRY,
    CAPABILITY_MANAGE_MUSIC,
    CAPABILITY_MANAGE_SETLISTS,
    MODULE_KEY_MUSIC,
)
from .services.access_context import resolve_scoped_ministry
from .services.authorization import has_capability
from .services.institutional_context import get_user_igreja, get_user_ministerio


class CapabilityPermission(permissions.BasePermission):
    capability = None
    scope = None
    module = None

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not self.capability:
            return False

        token = getattr(request, "auth", None)
        ministry = resolve_scoped_ministry(user, token) or get_user_ministerio(user)
        church = get_user_igreja(user, ministerio=ministry)
        module = self.module or getattr(view, "authorization_module", None)
        return has_capability(
            user,
            self.capability,
            scope=self.scope,
            igreja=church,
            ministerio=ministry,
            module=module,
        )


class HasPlatformCapability(CapabilityPermission):
    scope = AUTH_SCOPE_PLATFORM


class HasChurchCapability(CapabilityPermission):
    scope = AUTH_SCOPE_CHURCH


class HasMinistryCapability(CapabilityPermission):
    scope = AUTH_SCOPE_MINISTRY


class HasModuleCapability(CapabilityPermission):
    scope = AUTH_SCOPE_MODULE


class AuthenticatedReadOnlyOrCapability(permissions.BasePermission):
    capability = None
    scope = None
    module = None

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        checker = CapabilityPermission()
        checker.capability = self.capability
        checker.scope = self.scope
        checker.module = self.module
        return checker.has_permission(request, view)


class AuthenticatedReadOnlyOrManageMusic(AuthenticatedReadOnlyOrCapability):
    capability = CAPABILITY_MANAGE_MUSIC
    scope = AUTH_SCOPE_MODULE
    module = MODULE_KEY_MUSIC


class AuthenticatedReadOnlyOrManageCultos(AuthenticatedReadOnlyOrCapability):
    capability = CAPABILITY_MANAGE_CULTOS
    scope = AUTH_SCOPE_MODULE
    module = MODULE_KEY_MUSIC


class AuthenticatedReadOnlyOrManageEscalas(AuthenticatedReadOnlyOrCapability):
    capability = CAPABILITY_MANAGE_ESCALAS
    scope = AUTH_SCOPE_MODULE
    module = MODULE_KEY_MUSIC


class AuthenticatedReadOnlyOrManageSetlists(AuthenticatedReadOnlyOrCapability):
    capability = CAPABILITY_MANAGE_SETLISTS
    scope = AUTH_SCOPE_MODULE
    module = MODULE_KEY_MUSIC


class AuthenticatedReadOnlyOrManageAgenda(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True

        token = getattr(request, "auth", None)
        ministry = resolve_scoped_ministry(user, token) or get_user_ministerio(user)
        church = get_user_igreja(user, ministerio=ministry)

        return has_capability(
            user,
            CAPABILITY_MANAGE_CHURCH,
            scope=AUTH_SCOPE_CHURCH,
            igreja=church,
            ministerio=ministry,
        ) or has_capability(
            user,
            CAPABILITY_MANAGE_MINISTRY,
            scope=AUTH_SCOPE_MINISTRY,
            igreja=church,
            ministerio=ministry,
        )
