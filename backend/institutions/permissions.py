from rest_framework import permissions


class CanManageChurch(permissions.BasePermission):
    """Apenas Global Admins ou usuarios com vinculo ativo na igreja podem editar."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_global_admin or user.is_superuser:
            return True
        return user.vinculos_igreja.filter(is_active=True).exists()

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_global_admin or user.is_superuser:
            return True
        return user.vinculos_igreja.filter(igreja=obj, is_active=True).exists()


class CanManageMinistry(permissions.BasePermission):
    """Apenas Global Admins ou lideres do proprio ministerio podem editar."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_global_admin or user.is_superuser:
            return True
        return user.vinculos_ministerio.filter(is_active=True).exists()

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_global_admin or user.is_superuser:
            return True
        return user.vinculos_ministerio.filter(ministerio=obj, is_active=True).exists()
