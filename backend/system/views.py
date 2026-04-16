from django.conf import settings as django_settings
from django.db import connection, transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Usuario
from accounts.permissions import IsGlobalAdmin
from system.models import UserPermissionGrant
from system.serializers import UserPermissionGrantSerializer
from system.services import registrar_log


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False

        status_code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(
            {
                "status": "ok" if db_ok else "degraded",
                "database": "ok" if db_ok else "unavailable",
                "pagination_enabled": "DEFAULT_PAGINATION_CLASS" in django_settings.REST_FRAMEWORK,
                "jwt_blacklist_enabled": "rest_framework_simplejwt.token_blacklist"
                in django_settings.INSTALLED_APPS,
            },
            status=status_code,
        )


class UserPermissionGrantViewSet(viewsets.ModelViewSet):
    serializer_class = UserPermissionGrantSerializer
    permission_classes = [IsAuthenticated, IsGlobalAdmin]
    queryset = UserPermissionGrant.objects.select_related("usuario", "igreja", "ministerio", "granted_by")
    filterset_fields = ["usuario", "permission_codename", "igreja", "ministerio", "is_active"]
    search_fields = ["usuario__username", "usuario__email", "permission_codename"]

    def get_queryset(self):
        queryset = super().get_queryset()

        filters = {
            "usuario_id": self.request.query_params.get("usuario"),
            "permission_codename": self.request.query_params.get("permission_codename"),
            "igreja_id": self.request.query_params.get("igreja"),
            "ministerio_id": self.request.query_params.get("ministerio"),
            "is_active": self.request.query_params.get("is_active"),
        }
        for field, value in filters.items():
            if value in (None, ""):
                continue
            if field == "is_active":
                queryset = queryset.filter(is_active=value.lower() in {"1", "true", "t", "yes"})
                continue
            queryset = queryset.filter(**{field: value})

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(usuario__username__icontains=search)
                | Q(usuario__email__icontains=search)
                | Q(permission_codename__icontains=search)
            )

        return queryset.order_by("-granted_at", "-id")

    def _log_grant(self, action, grant, description):
        registrar_log(
            self.request.user,
            action,
            "UserPermissionGrant",
            description,
            instance=grant,
            igreja=grant.igreja,
            ministerio=grant.ministerio,
        )

    def perform_create(self, serializer):
        grant = serializer.save(granted_by=self.request.user)
        self._log_grant(
            "CREATE",
            grant,
            f'Permissao "{grant.permission_codename}" atribuida para "{grant.usuario.username}".',
        )

    def perform_update(self, serializer):
        grant = serializer.save(granted_by=self.request.user)
        self._log_grant(
            "UPDATE",
            grant,
            f'Permissao "{grant.permission_codename}" atualizada para "{grant.usuario.username}".',
        )

    @transaction.atomic
    @action(detail=False, methods=["post"], url_path="batch-grant")
    def batch_grant(self, request):
        user_id = request.data.get("user_id")
        permissions_data = request.data.get("permissions", [])

        if not user_id or not isinstance(permissions_data, list) or not permissions_data:
            raise ValidationError({"error": "user_id e permissions sao obrigatorios."})

        try:
            usuario = Usuario.objects.get(pk=user_id)
        except Usuario.DoesNotExist as exc:
            raise ValidationError({"user_id": "Usuario informado nao encontrado."}) from exc

        created_or_updated = []
        for perm in permissions_data:
            payload = {
                "usuario": usuario.pk,
                "permission_codename": perm.get("codename"),
                "igreja": perm.get("igreja_id"),
                "ministerio": perm.get("ministerio_id"),
            }

            serializer = self.get_serializer(data=payload)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            grant, created = UserPermissionGrant.objects.update_or_create(
                usuario=validated_data["usuario"],
                permission_codename=validated_data["permission_codename"],
                igreja=validated_data.get("igreja"),
                ministerio=validated_data.get("ministerio"),
                defaults={"is_active": True, "granted_by": request.user},
            )
            created_or_updated.append(grant)
            self._log_grant(
                "CREATE" if created else "UPDATE",
                grant,
                f'Permissao "{grant.permission_codename}" processada em lote para "{grant.usuario.username}".',
            )

        return Response(
            {
                "message": f"{len(created_or_updated)} permissoes processadas.",
                "grants": self.get_serializer(created_or_updated, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="revoke")
    def revoke(self, request, pk=None):
        grant = self.get_object()
        grant.is_active = False
        grant.save(update_fields=["is_active"])
        self._log_grant(
            "UPDATE",
            grant,
            f'Permissao "{grant.permission_codename}" revogada para "{grant.usuario.username}".',
        )
        return Response(
            {"message": f"Permissao '{grant.permission_codename}' revogada para {grant.usuario.username}."},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        return self.revoke(request, *args, **kwargs)
