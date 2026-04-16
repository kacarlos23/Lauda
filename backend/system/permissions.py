from django.db.models import Q
from rest_framework import permissions

from system.models import UserPermissionGrant


class GranularPermissionMixin:
    member_level = 3
    permission_map = {}

    def is_global_admin(self, user):
        return bool(user and user.is_authenticated and (user.is_global_admin or user.is_superuser))

    def is_member(self, user):
        return getattr(user, "nivel_acesso", None) == self.member_level

    def get_codename(self, view):
        return self.permission_map.get(view.action or "list")

    def get_scope(self, request, view, obj=None):
        ministerio = getattr(obj, "ministerio", None)

        if ministerio is None and hasattr(request, "data") and hasattr(request.data, "get"):
            ministry_id = request.data.get("ministerio_id") or request.data.get("ministerio")
            if ministry_id:
                from institutions.models import Ministerio

                ministerio = Ministerio.objects.select_related("igreja").filter(id=ministry_id).first()

        if ministerio is None and hasattr(view, "get_effective_request_ministry"):
            ministerio = view.get_effective_request_ministry()

        if ministerio is None:
            ministerio = getattr(request.user, "ministerio", None)

        igreja = getattr(ministerio, "igreja", None) if ministerio is not None else None
        return igreja, ministerio

    def has_grant(self, user, codename, igreja=None, ministerio=None):
        grants = UserPermissionGrant.objects.filter(
            usuario=user,
            permission_codename=codename,
            is_active=True,
        )

        if ministerio is not None:
            igreja = igreja or getattr(ministerio, "igreja", None)
            grants = grants.filter(
                Q(ministerio=ministerio)
                | Q(ministerio__isnull=True, igreja=igreja)
                | Q(ministerio__isnull=True, igreja__isnull=True)
            )
        elif igreja is not None:
            grants = grants.filter(
                Q(ministerio__isnull=True, igreja=igreja)
                | Q(ministerio__isnull=True, igreja__isnull=True)
            )
        else:
            grants = grants.filter(ministerio__isnull=True, igreja__isnull=True)

        return grants.exists()

    def has_default_write_access(self, user):
        return not self.is_member(user)

    def has_object_scope_access(self, request, obj):
        ministry_ids = request.user.vinculos_ministerio.filter(is_active=True).values_list("ministerio_id", flat=True)
        return getattr(obj, "ministerio_id", None) in ministry_ids


class CanManageMusic(GranularPermissionMixin, permissions.BasePermission):
    permission_map = {
        "create": "music.add_musica",
        "update": "music.change_musica",
        "partial_update": "music.change_musica",
        "destroy": "music.delete_musica",
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if self.is_global_admin(user):
            return True

        codename = self.get_codename(view)
        igreja, ministerio = self.get_scope(request, view)
        if codename and self.has_grant(user, codename, igreja=igreja, ministerio=ministerio):
            return True

        return self.has_default_write_access(user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if self.is_global_admin(request.user):
            return True

        codename = self.get_codename(view)
        igreja, ministerio = self.get_scope(request, view, obj=obj)
        if codename and self.has_grant(request.user, codename, igreja=igreja, ministerio=ministerio):
            return True

        if not self.has_default_write_access(request.user):
            return False

        return self.has_object_scope_access(request, obj)


class CanManageCulto(GranularPermissionMixin, permissions.BasePermission):
    permission_map = {
        "create": "events.add_culto",
        "update": "events.change_culto",
        "partial_update": "events.change_culto",
        "destroy": "events.delete_culto",
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if self.is_global_admin(user):
            return True

        codename = self.get_codename(view)
        igreja, ministerio = self.get_scope(request, view)
        if codename and self.has_grant(user, codename, igreja=igreja, ministerio=ministerio):
            return True

        return self.has_default_write_access(user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if self.is_global_admin(request.user):
            return True

        codename = self.get_codename(view)
        igreja, ministerio = self.get_scope(request, view, obj=obj)
        if codename and self.has_grant(request.user, codename, igreja=igreja, ministerio=ministerio):
            return True

        if not self.has_default_write_access(request.user):
            return False

        return self.has_object_scope_access(request, obj)
