from rest_framework import permissions


class IsGlobalAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (user.is_global_admin or user.is_superuser)
        )


class IsGlobalAdminOrSelf(permissions.BasePermission):
    """
    Permite acesso global para admins.
    Usuarios comuns so podem ver/editar o proprio perfil.
    Lideres de ministerio/igreja podem ver membros do seu escopo (tratado no ViewSet).
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_global_admin or user.is_superuser:
            return True
        return obj.pk == user.pk
