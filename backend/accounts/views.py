from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Usuario
from accounts.permissions import IsGlobalAdminOrSelf
from accounts.serializers import UsuarioSerializer
from institutions.models import Ministerio
from system.access_context import normalize_ministry_id
from system.permissions import GranularPermissionMixin
from system.services import registrar_log


class AdminImpersonateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not getattr(user, "is_global_admin", False):
            raise PermissionDenied("Apenas administradores globais podem assumir outros contextos.")

        ministry_id = normalize_ministry_id(request.data.get("ministerio_id"))
        ministry = None

        if ministry_id:
            ministry = Ministerio.objects.filter(id=ministry_id).first()
            if not ministry:
                raise ValidationError({"ministerio_id": "Ministerio especificado nao encontrado."})

        refresh = RefreshToken.for_user(user)
        refresh["impersonating_ministry_id"] = int(ministry.id) if ministry else None
        refresh["impersonating_ministry_name"] = str(ministry.nome) if ministry else ""
        refresh["is_impersonation"] = True
        refresh["scope_override"] = "ministry" if ministry else "platform"
        refresh["impersonated_by"] = str(user.id)

        registrar_log(
            user,
            "IMPERSONATE_START",
            "Ministerio",
            f'Admin {user.username} assumindo contexto: {ministry.nome if ministry else "Global"}',
            ministerio=ministry,
        )

        access_token_lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
        expires_in = int(access_token_lifetime.total_seconds()) if hasattr(access_token_lifetime, "total_seconds") else 3600

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "nivel_acesso": user.nivel_acesso,
                    "is_global_admin": user.is_global_admin,
                },
                "impersonation": {
                    "active": bool(ministry),
                    "ministry_id": ministry.id if ministry else None,
                    "ministry_name": ministry.nome if ministry else None,
                    "scope": refresh["scope_override"],
                    "expires_in": expires_in,
                },
            },
            status=status.HTTP_200_OK,
        )


class UsuarioViewSet(GranularPermissionMixin, viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, IsGlobalAdminOrSelf]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "username", "nivel_acesso"]

    def get_queryset(self):
        user = self.request.user
        qs = Usuario.objects.select_related().prefetch_related(
            "vinculos_ministerio",
            "vinculos_ministerio__ministerio",
            "vinculos_igreja",
            "vinculos_igreja__igreja",
            "permission_grants",
        )
        if getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
            return qs.order_by("-date_joined")
        return qs.filter(pk=user.pk)

    def perform_create(self, serializer):
        if not getattr(self.request.user, "is_global_admin", False):
            raise PermissionDenied("Apenas administradores globais podem criar usuarios diretamente.")
        instance = serializer.save()
        registrar_log(self.request.user, "CREATE", "Usuario", f'Usuario "{instance.username}" criado.', instance=instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, "UPDATE", "Usuario", f'Usuario "{instance.username}" atualizado.', instance=instance)

    @action(detail=True, methods=["post"], permission_classes=[IsGlobalAdminOrSelf])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get("new_password")
        if not new_password:
            raise ValidationError({"new_password": "Informe a nova senha."})
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Senha redefinida com sucesso."}, status=status.HTTP_200_OK)
