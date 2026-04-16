from rest_framework import serializers

from system.access_context import resolve_scoped_ministry, resolve_scoped_ministry_id
from system.institutional_context import get_user_ministerio


class MinistryScopedViewSetMixin:
    ministry_field = "ministerio"

    def is_global_admin(self):
        user = self.request.user
        return bool(user and user.is_authenticated and (user.is_global_admin or user.is_superuser))

    def get_request_token(self):
        return getattr(self.request, "auth", None)

    def get_effective_request_ministry(self):
        if not hasattr(self, "_effective_request_ministry"):
            self._effective_request_ministry = resolve_scoped_ministry(
                self.request.user,
                self.get_request_token(),
            )
        return self._effective_request_ministry

    def get_user_ministry_id(self):
        return resolve_scoped_ministry_id(self.request.user, self.get_request_token())

    def get_queryset(self):
        queryset = super().get_queryset()
        return self.apply_ministry_scope(queryset)

    def apply_ministry_scope(self, queryset):
        ministry_id = self.get_user_ministry_id()
        if self.is_global_admin():
            if not ministry_id:
                return queryset
            return queryset.filter(**{f"{self.ministry_field}_id": ministry_id})

        if not ministry_id:
            return queryset.none()

        return queryset.filter(**{f"{self.ministry_field}_id": ministry_id})

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["is_global_admin"] = self.is_global_admin()
        context["request_user"] = self.request.user
        return context

    def get_effective_ministry(self, payload_ministry=None):
        if self.is_global_admin():
            return payload_ministry or self.get_effective_request_ministry()
        return get_user_ministerio(self.request.user)

    def ensure_same_ministry(self, obj, field_name):
        effective_ministry = self.get_effective_ministry()
        if effective_ministry is None:
            return

        if getattr(obj, "ministerio_id", None) is None:
            return

        if getattr(obj, "ministerio_id", None) != effective_ministry.id:
            raise serializers.ValidationError(
                {field_name: "O recurso informado pertence a outro ministerio."},
            )

    def require_ministry(self, ministry, field_name="ministerio"):
        if ministry is None:
            raise serializers.ValidationError(
                {field_name: "Um ministerio valido e obrigatorio para este recurso."},
            )
        return ministry
