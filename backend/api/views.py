from django.db import transaction
from urllib.parse import quote, urlsplit

from django.utils.timezone import localtime, now
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    ApiRequestErrorLog,
    ConviteMinisterio,
    Culto,
    Escala,
    Evento,
    Igreja,
    IgrejaModulo,
    ItemSetlist,
    LogAuditoria,
    Ministerio,
    Modulo,
    Musica,
    RegistroLogin,
    Team,
    Usuario,
)
from .permissions import (
    AuthenticatedReadOnlyOrManageAgenda,
    AuthenticatedReadOnlyOrManageEscalas,
    HasChurchCapability,
)
from .serializers import (
    ApiRequestErrorLogSerializer,
    AccessCodeBindSerializer,
    ConviteAcceptSerializer,
    ConviteMinisterioSerializer,
    MinisterioAccessCodePublicSerializer,
    ConviteMinisterioPublicSerializer,
    CultoSerializer,
    EscalaSerializer,
    EventoSerializer,
    IgrejaSerializer,
    IgrejaModuloSerializer,
    ItemSetlistSerializer,
    LogAuditoriaSerializer,
    MinisterioSerializer,
    ModuloSerializer,
    MusicaSerializer,
    MusicEnrichmentRequestSerializer,
    MemberLoginSerializer,
    TeamSerializer,
    UsuarioSerializer,
)
from .constants import CAPABILITY_MANAGE_CHURCH, MODULE_KEY_MUSIC
from .services.access_context import normalize_ministry_id, resolve_scoped_ministry
from .services.agenda import (
    delete_linked_evento_for_culto,
    get_visible_eventos_queryset,
    sync_culto_evento,
    validate_evento_scope_for_write,
)
from .services.institutional_context import (
    get_user_igreja,
    get_user_igreja_membership,
    get_user_ministerio,
    get_user_ministerio_membership,
    sync_user_memberships,
)
from .services.governance import get_governance_snapshot
from .services.module_blueprint import build_module_expansion_blueprint
from .services.session_payload import build_auth_payload, build_user_payload
from .view_mixins import MinistryScopedViewSetMixin
from institutions.services import generate_unique_access_code
from system.permissions import CanManageCulto, CanManageMusic
from system.services import registrar_log


class AuditoriaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def resolve_access_code(code):
    normalized_code = code.strip()
    invite = ConviteMinisterio.objects.select_related("ministerio").filter(token=normalized_code).first()
    if invite is None:
        invite = ConviteMinisterio.objects.select_related("ministerio").filter(access_code=normalized_code.upper()).first()

    if invite is not None:
        return "CONVITE", invite

    ministry = Ministerio.objects.filter(access_code=normalized_code.upper(), is_active=True).first()
    if ministry is not None:
        if not ministry.is_open:
            return "MINISTERIO_FECHADO", ministry
        return "MINISTERIO", ministry

    return None, None
def build_frontend_base_url(request):
    origin = request.headers.get("Origin", "").strip()
    if origin:
        return origin.rstrip("/")

    referer = request.headers.get("Referer", "").strip()
    if referer:
        parsed = urlsplit(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

    return request.build_absolute_uri("/").rstrip("/")


class IsAdminLevel(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_global_admin or request.user.is_superuser)
        )


class IsGlobalAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_global_admin or request.user.is_superuser)
        )


class IsAuthenticatedReadOnlyOrGlobalAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(user.is_global_admin or user.is_superuser)


class CanManageChurch(HasChurchCapability):
    capability = CAPABILITY_MANAGE_CHURCH


class IsAuthenticatedReadOnlyOrAdminLevel(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(user.is_global_admin or user.is_superuser)


class IsMusicEditor(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_global_admin or user.is_superuser)
        )


class IsAuthenticatedReadOnlyOrMusicEditor(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(user.is_global_admin or user.is_superuser)


class BaseTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({"user": build_user_payload(self.user)})
        return data

    def register_login(self):
        request = self.context.get("request")
        ip = get_client_ip(request) if request else None
        RegistroLogin.objects.create(usuario=self.user, ip_address=ip)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        igreja = get_user_igreja(user)
        igreja_membership = get_user_igreja_membership(user)
        ministerio_membership = get_user_ministerio_membership(user)
        ministerio = get_user_ministerio(user)
        token["is_global_admin"] = user.is_global_admin
        token["is_superuser"] = user.is_superuser
        token["nivel_acesso"] = user.nivel_acesso
        token["ministerio_id"] = ministerio.id if ministerio else user.ministerio_id
        token["ministerio_slug"] = ministerio.slug if ministerio else None
        token["igreja_id"] = igreja.id if igreja else None
        token["igreja_slug"] = igreja.slug if igreja else None
        token["igreja_membership_id"] = igreja_membership.id if igreja_membership else None
        token["ministerio_membership_id"] = ministerio_membership.id if ministerio_membership else None
        return token


class MinistryTokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.is_global_admin or self.user.is_superuser:
            raise serializers.ValidationError("Use a rota de login admin para administradores globais.")
        if not self.user.ministerio_id:
            raise serializers.ValidationError("Usuario sem ministerio vinculado. Aceite um convite valido antes de entrar.")
        self.register_login()
        return data


class AdminTokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not (self.user.is_global_admin or self.user.is_superuser):
            raise serializers.ValidationError("Acesso restrito ao admin global.")
        self.register_login()
        return data


class LegacyTokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        self.register_login()
        return data


class LegacyTokenObtainPairView(TokenObtainPairView):
    serializer_class = LegacyTokenObtainPairSerializer


class MinistryTokenObtainPairView(TokenObtainPairView):
    serializer_class = MinistryTokenObtainPairSerializer


class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


class MemberLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MemberLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        RegistroLogin.objects.create(usuario=user, ip_address=get_client_ip(request))
        return Response(build_auth_payload(user))


class InviteLookupView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        code_source, target = resolve_access_code(code)
        if target is None:
            return Response({"detail": "Convite nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if code_source == "MINISTERIO_FECHADO":
            return Response(
                {"detail": "As portas deste ministerio estao fechadas para entrada por codigo fixo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if code_source == "MINISTERIO":
            return Response(MinisterioAccessCodePublicSerializer(target).data)

        invite = target
        if invite.is_expired and invite.status == "PENDENTE":
            invite.status = "EXPIRADO"
            invite.save(update_fields=["status", "updated_at"])

        if not invite.can_be_used():
            return Response({"detail": "Convite expirado, revogado ou sem usos disponiveis."}, status=status.HTTP_410_GONE)

        return Response(ConviteMinisterioPublicSerializer(invite).data)


class AcceptInviteView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = ConviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code_source = serializer.validated_data["code_source"]
        target = serializer.validated_data["code"]
        existing_user = serializer.validated_data["existing_user"]
        ministry = target.ministerio if code_source == "CONVITE" else target
        nivel_acesso = target.nivel_acesso if code_source == "CONVITE" else 3
        payload = {
            "username": serializer.validated_data["username"],
            "first_name": serializer.validated_data["first_name"],
            "last_name": serializer.validated_data.get("last_name", ""),
            "email": serializer.validated_data.get("email", ""),
            "telefone": serializer.validated_data.get("telefone", ""),
            "funcao_principal": serializer.validated_data.get("funcao_principal", ""),
            "funcoes": serializer.validated_data.get("funcoes", []),
            "ministerio": ministry,
            "nivel_acesso": nivel_acesso,
            "is_active": True,
            "invite_accepted_at": now(),
        }

        if existing_user:
            for field, value in payload.items():
                setattr(existing_user, field, value)
            existing_user.set_password(serializer.validated_data["password"])
            existing_user.save()
            user = existing_user
        else:
            user = Usuario.objects.create_user(
                password=serializer.validated_data["password"],
                **payload,
            )

        if code_source == "CONVITE":
            target.mark_as_accepted(user)
            registrar_log(user, "CREATE", "ConviteMinisterio", f'Convite aceito para o ministerio "{ministry.nome}".')
        else:
            registrar_log(user, "CREATE", "Ministerio", f'Codigo fixo aceito para o ministerio "{ministry.nome}".')
        sync_user_memberships(user)
        RegistroLogin.objects.create(usuario=user, ip_address=get_client_ip(request))
        return Response(build_auth_payload(user), status=status.HTTP_201_CREATED)


class BindAccessCodeView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = AccessCodeBindSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        code_source = serializer.validated_data["code_source"]
        target = serializer.validated_data["code"]
        ministry = serializer.validated_data["ministerio"]

        user.ministerio = ministry
        user.invite_accepted_at = now()
        if code_source == "CONVITE":
            user.nivel_acesso = target.nivel_acesso
            target.mark_as_accepted(user)
            if target.email and not user.email:
                user.email = target.email
            registrar_log(
                user,
                "UPDATE",
                "ConviteMinisterio",
                f'Usuario "{user.username}" vinculado ao ministerio "{ministry.nome}" por convite.',
            )
        else:
            user.nivel_acesso = 3
            registrar_log(
                user,
                "UPDATE",
                "Ministerio",
                f'Usuario "{user.username}" vinculado ao ministerio "{ministry.nome}" por codigo fixo.',
            )

        user.save()
        sync_user_memberships(user)
        return Response(build_auth_payload(user), status=status.HTTP_200_OK)


class MinistryInviteLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        ministry = resolve_scoped_ministry(user, getattr(request, "auth", None))
        if ministry is None:
            return Response(
                {"detail": "Somente usuarios vinculados a um ministerio podem gerar links de convite."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not (user.is_global_admin or user.is_superuser):
            return Response(
                {"detail": "Apenas o admin global pode gerar links de convite."},
                status=status.HTTP_403_FORBIDDEN,
            )

        invite_url = f"{build_frontend_base_url(request)}/invite?code={quote(ministry.access_code)}"
        return Response(
            {
                "ministerio_id": ministry.id,
                "ministerio_nome": ministry.nome,
                "access_code": ministry.access_code,
                "invite_url": invite_url,
            }
        )


class IgrejaViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Igreja.objects.all()
    serializer_class = IgrejaSerializer
    permission_classes = [CanManageChurch]


class ModuloViewSet(viewsets.ModelViewSet):
    queryset = Modulo.objects.all()
    serializer_class = ModuloSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            permission_classes = [CanManageChurch]
        else:
            permission_classes = [IsGlobalAdmin]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=["get"], permission_classes=[CanManageChurch])
    def blueprint(self, request):
        return Response(build_module_expansion_blueprint())


class IgrejaModuloViewSet(viewsets.ModelViewSet):
    queryset = IgrejaModulo.objects.select_related("igreja", "modulo").all()
    serializer_class = IgrejaModuloSerializer
    permission_classes = [CanManageChurch]

    def get_queryset(self):
        queryset = IgrejaModulo.objects.select_related("igreja", "modulo").all()
        igreja_id = normalize_ministry_id(self.request.query_params.get("igreja"))
        if igreja_id is not None:
            queryset = queryset.filter(igreja_id=igreja_id)

        if self.request.user.is_global_admin or self.request.user.is_superuser:
            return queryset

        igreja = get_user_igreja(self.request.user)
        if igreja is None:
            return queryset.none()
        return queryset.filter(igreja=igreja)

    def _validate_target_igreja(self, igreja):
        if self.request.user.is_global_admin or self.request.user.is_superuser:
            return
        current_igreja = get_user_igreja(self.request.user)
        if current_igreja is None or igreja != current_igreja:
            raise serializers.ValidationError(
                {"igreja": "Voce nao pode gerenciar modulos de outra igreja."},
            )

    def perform_create(self, serializer):
        self._validate_target_igreja(serializer.validated_data["igreja"])
        instance = serializer.save()
        registrar_log(
            self.request.user,
            "CREATE",
            "IgrejaModulo",
            f'Modulo "{instance.modulo.nome}" associado a igreja "{instance.igreja.nome}".',
            instance=instance,
        )

    def perform_update(self, serializer):
        self._validate_target_igreja(
            serializer.validated_data.get("igreja", serializer.instance.igreja),
        )
        instance = serializer.save()
        action_label = "habilitado" if instance.is_enabled else "desabilitado"
        registrar_log(
            self.request.user,
            "UPDATE",
            "IgrejaModulo",
            f'Modulo "{instance.modulo.nome}" {action_label} na igreja "{instance.igreja.nome}".',
            instance=instance,
        )


class MinisterioViewSet(viewsets.ModelViewSet):
    queryset = Ministerio.objects.select_related("igreja").all()
    serializer_class = MinisterioSerializer
    permission_classes = [IsGlobalAdmin]

    @action(detail=False, methods=["get", "put", "patch"], permission_classes=[IsAuthenticated])
    def current(self, request):
        user = request.user
        ministry = resolve_scoped_ministry(user, getattr(request, "auth", None))
        if ministry is None:
            if user.is_global_admin or user.is_superuser:
                return Response({"detail": "Admin global nao possui ministerio atual."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": "Usuario sem ministerio vinculado."}, status=status.HTTP_400_BAD_REQUEST)

        if request.method == "GET":
            serializer = self.get_serializer(ministry)
            return Response(serializer.data)

        if not (user.is_global_admin or user.is_superuser):
            return Response(
                {"detail": "Apenas o admin global pode editar as configuracoes do ministerio."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = {"nome": request.data.get("nome", ministry.nome)}
        serializer = self.get_serializer(ministry, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        registrar_log(
            user,
            "UPDATE",
            "Ministerio",
            f'Configuracoes atualizadas para o ministerio "{ministry.nome}".',
            instance=ministry,
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminLevel], url_path="regenerate-access-code")
    def regenerate_access_code(self, request, pk=None):
        ministry = self.get_object()
        with transaction.atomic():
            new_code = generate_unique_access_code()
            ministry.access_code = new_code
            ministry.save(update_fields=["access_code", "updated_at"])

        registrar_log(
            request.user,
            "UPDATE",
            "Ministerio",
            f'Codigo de acesso do ministerio "{ministry.nome}" regenerado.',
            instance=ministry,
        )
        return Response(
            {"access_code": new_code, "message": "Codigo regenerado com sucesso."},
            status=status.HTTP_200_OK,
        )


class ConviteMinisterioViewSet(viewsets.ModelViewSet):
    queryset = ConviteMinisterio.objects.select_related("ministerio", "invited_by", "accepted_by")
    serializer_class = ConviteMinisterioSerializer
    permission_classes = [IsGlobalAdmin]

    def perform_create(self, serializer):
        instance = serializer.save(invited_by=self.request.user)
        registrar_log(
            self.request.user,
            "CREATE",
            "ConviteMinisterio",
            f'Convite {instance.access_code} criado para o ministerio "{instance.ministerio.nome}".',
            instance=instance,
        )


class UsuarioViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminLevel]

    def get_queryset(self):
        queryset = Usuario.objects.prefetch_related(
            "vinculos_ministerio",
            "vinculos_ministerio__ministerio",
            "vinculos_igreja",
            "vinculos_igreja__igreja",
            "permission_grants",
        ).all()

        effective_ministry = self.get_effective_request_ministry()
        if self.is_global_admin():
            if effective_ministry is None:
                return queryset
            return queryset.filter(
                vinculos_ministerio__ministerio=effective_ministry,
                vinculos_ministerio__is_active=True,
            ).distinct()

        if effective_ministry is None:
            return queryset.none()

        return queryset.filter(
            vinculos_ministerio__ministerio=effective_ministry,
            vinculos_ministerio__is_active=True,
        ).distinct()

    def build_me_response(self, user):
        data = self.get_serializer(user).data
        data.update(build_user_payload(user, scoped_ministry=self.get_effective_request_ministry()))
        return data

    @action(detail=False, methods=["get", "put", "patch"], permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user

        if request.method == "GET":
            return Response(self.build_me_response(user))

        mutable_data = request.data.copy()
        if not self.is_global_admin():
            mutable_data.pop("is_global_admin", None)
            mutable_data.pop("ministerio", None)

        serializer = self.get_serializer(user, data=mutable_data, partial=True)
        serializer.is_valid(raise_exception=True)
        ministry, is_global_admin = self.resolve_user_assignment(serializer)
        instance = serializer.save(ministerio=ministry, is_global_admin=is_global_admin)
        return Response(self.build_me_response(instance))

    def resolve_user_assignment(self, serializer):
        requested_global_admin = serializer.validated_data.get(
            "is_global_admin",
            getattr(serializer.instance, "is_global_admin", False),
        )
        requested_ministry = serializer.validated_data.get(
            "ministerio",
            getattr(serializer.instance, "ministerio", None),
        )

        if self.is_global_admin():
            if requested_global_admin:
                if serializer.validated_data.get("ministerio") is not None:
                    raise serializers.ValidationError(
                        {"ministerio": "Admin global nao pode ser vinculado a ministerio."},
                    )
                return None, True

            return self.require_ministry(requested_ministry or self.get_effective_request_ministry()), False

        if serializer.instance and serializer.instance.ministerio_id != self.request.user.ministerio_id:
            raise serializers.ValidationError(
                {"ministerio": "Voce nao pode alterar usuarios de outro ministerio."},
            )

        if requested_global_admin:
            raise serializers.ValidationError({"is_global_admin": "Apenas admin global pode promover admin global."})

        return self.require_ministry(self.get_effective_request_ministry()), False

    def perform_create(self, serializer):
        ministry, is_global_admin = self.resolve_user_assignment(serializer)
        instance = serializer.save(ministerio=ministry, is_global_admin=is_global_admin)
        registrar_log(self.request.user, "CREATE", "Usuario", f'Usuario "{instance.username}" criado.', instance=instance)

    def perform_update(self, serializer):
        ministry, is_global_admin = self.resolve_user_assignment(serializer)
        serializer.save(ministerio=ministry, is_global_admin=is_global_admin)


class TeamViewSet(MinistryScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Team.objects.select_related("ministerio").all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    ministry_field = "ministerio"


class EventoViewSet(viewsets.ModelViewSet):
    queryset = Evento.objects.select_related("igreja", "ministerio").all()
    serializer_class = EventoSerializer
    permission_classes = [AuthenticatedReadOnlyOrManageAgenda]

    def get_queryset(self):
        queryset = get_visible_eventos_queryset(self.request.user, getattr(self.request, "auth", None)).select_related(
            "igreja",
            "ministerio",
        ).prefetch_related(
            "culto_musical",
            "culto_musical__setlists",
            "culto_musical__escalas",
        )
        status_param = self.request.query_params.get("status")
        source_module = self.request.query_params.get("source_module")
        ministerio_id = normalize_ministry_id(self.request.query_params.get("ministerio"))

        if status_param:
            queryset = queryset.filter(status=status_param)
        if source_module:
            queryset = queryset.filter(source_module=source_module)
        if ministerio_id:
            queryset = queryset.filter(ministerio_id=ministerio_id)
        return queryset

    def perform_create(self, serializer):
        try:
            igreja, ministerio = validate_evento_scope_for_write(
                self.request.user,
                token=getattr(self.request, "auth", None),
                igreja=serializer.validated_data.get("igreja"),
                ministerio=serializer.validated_data.get("ministerio"),
            )
        except PermissionError as exc:
            raise serializers.ValidationError({"detail": str(exc)})
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)})

        instance = serializer.save(igreja=igreja, ministerio=ministerio)
        registrar_log(self.request.user, "CREATE", "Evento", f'Evento "{instance.nome}" criado.', instance=instance)

    def perform_update(self, serializer):
        try:
            igreja, ministerio = validate_evento_scope_for_write(
                self.request.user,
                token=getattr(self.request, "auth", None),
                igreja=serializer.validated_data.get("igreja", serializer.instance.igreja),
                ministerio=serializer.validated_data.get("ministerio", serializer.instance.ministerio),
            )
        except PermissionError as exc:
            raise serializers.ValidationError({"detail": str(exc)})
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)})

        instance = serializer.save(igreja=igreja, ministerio=ministerio)
        registrar_log(self.request.user, "UPDATE", "Evento", f'Evento "{instance.nome}" atualizado.', instance=instance)

    def perform_destroy(self, instance):
        nome = instance.nome
        evento = instance
        instance.delete()
        registrar_log(self.request.user, "DELETE", "Evento", f'Evento "{nome}" excluido.', instance=evento)


class CultoViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Culto.objects.all()
    serializer_class = CultoSerializer
    permission_classes = [CanManageCulto]
    authorization_module = MODULE_KEY_MUSIC

    def get_queryset(self):
        queryset = Culto.objects.select_related(
            "ministerio",
            "evento",
            "evento__igreja",
            "evento__ministerio",
        ).prefetch_related(
            "setlists",
            "escalas",
        )
        return self.apply_ministry_scope(queryset)

    def perform_create(self, serializer):
        ministry = self.require_ministry(self.get_effective_ministry(serializer.validated_data.get("ministerio")))
        with transaction.atomic():
            instance = serializer.save(ministerio=ministry)
            sync_culto_evento(instance)
        registrar_log(self.request.user, "CREATE", "Culto", f'Culto "{instance.nome}" agendado.', instance=instance)

    def perform_update(self, serializer):
        ministry = self.get_effective_ministry(
            serializer.validated_data.get("ministerio", serializer.instance.ministerio),
        )
        with transaction.atomic():
            instance = serializer.save(ministerio=self.require_ministry(ministry))
            sync_culto_evento(instance)
        registrar_log(self.request.user, "UPDATE", "Culto", f'Culto "{instance.nome}" atualizado.', instance=instance)

    def perform_destroy(self, instance):
        nome = instance.nome
        culto = instance
        with transaction.atomic():
            delete_linked_evento_for_culto(instance)
            instance.delete()
        registrar_log(self.request.user, "DELETE", "Culto", f'Culto "{nome}" excluido.', instance=culto)


class EscalaViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Escala.objects.all()
    serializer_class = EscalaSerializer
    permission_classes = [AuthenticatedReadOnlyOrManageEscalas]
    authorization_module = MODULE_KEY_MUSIC

    def validate_related_objects(self, serializer):
        culto = serializer.validated_data.get("culto", getattr(serializer.instance, "culto", None))
        membro = serializer.validated_data.get("membro", getattr(serializer.instance, "membro", None))
        payload_ministry = serializer.validated_data.get("ministerio")
        ministry = self.get_effective_ministry(payload_ministry)

        if not self.is_global_admin() and ministry is None:
            raise serializers.ValidationError("Usuario sem ministerio vinculado.")

        if culto:
            self.ensure_same_ministry(culto, "culto")
        if membro:
            self.ensure_same_ministry(membro, "membro")
        if culto and membro and culto.ministerio_id != membro.ministerio_id:
            raise serializers.ValidationError({"membro": "Membro e culto precisam pertencer ao mesmo ministerio."})

        return self.require_ministry(ministry or getattr(culto, "ministerio", None) or getattr(membro, "ministerio", None))

    def perform_create(self, serializer):
        ministry = self.validate_related_objects(serializer)
        instance = serializer.save(ministerio=ministry)
        registrar_log(
            self.request.user,
            "CREATE",
            "Escala",
            f'Escala criada para o culto "{instance.culto.nome}".',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    def perform_update(self, serializer):
        ministry = self.validate_related_objects(serializer)
        instance = serializer.save(ministerio=ministry)
        registrar_log(
            self.request.user,
            "UPDATE",
            "Escala",
            f'Escala atualizada para o culto "{instance.culto.nome}".',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    def perform_destroy(self, instance):
        culto_nome = instance.culto.nome
        escala = instance
        instance.delete()
        registrar_log(
            self.request.user,
            "DELETE",
            "Escala",
            f'Escala removida do culto "{culto_nome}".',
            instance=escala,
            modulo=MODULE_KEY_MUSIC,
        )


class ItemSetlistViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ItemSetlist.objects.all()
    serializer_class = ItemSetlistSerializer
    permission_classes = [CanManageMusic]
    authorization_module = MODULE_KEY_MUSIC

    def validate_related_objects(self, serializer):
        culto = serializer.validated_data.get("culto", getattr(serializer.instance, "culto", None))
        musica = serializer.validated_data.get("musica", getattr(serializer.instance, "musica", None))
        payload_ministry = serializer.validated_data.get("ministerio")
        ministry = self.get_effective_ministry(payload_ministry)

        if not self.is_global_admin() and ministry is None:
            raise serializers.ValidationError("Usuario sem ministerio vinculado.")

        if culto:
            self.ensure_same_ministry(culto, "culto")
        if musica:
            self.ensure_same_ministry(musica, "musica")
        if culto and musica and musica.ministerio_id is not None and culto.ministerio_id != musica.ministerio_id:
            raise serializers.ValidationError({"musica": "Musica e culto precisam pertencer ao mesmo ministerio."})

        return self.require_ministry(ministry or getattr(culto, "ministerio", None) or getattr(musica, "ministerio", None))

    def perform_create(self, serializer):
        ministry = self.validate_related_objects(serializer)
        instance = serializer.save(ministerio=ministry)
        registrar_log(
            self.request.user,
            "CREATE",
            "ItemSetlist",
            f'Item "{instance.musica.titulo}" adicionado a setlist do culto "{instance.culto.nome}".',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    def perform_update(self, serializer):
        ministry = self.validate_related_objects(serializer)
        instance = serializer.save(ministerio=ministry)
        registrar_log(
            self.request.user,
            "UPDATE",
            "ItemSetlist",
            f'Item "{instance.musica.titulo}" atualizado na setlist do culto "{instance.culto.nome}".',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    def perform_destroy(self, instance):
        musica_titulo = instance.musica.titulo
        culto_nome = instance.culto.nome
        item = instance
        instance.delete()
        registrar_log(
            self.request.user,
            "DELETE",
            "ItemSetlist",
            f'Item "{musica_titulo}" removido da setlist do culto "{culto_nome}".',
            instance=item,
            modulo=MODULE_KEY_MUSIC,
        )


class LogAuditoriaViewSet(MinistryScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = LogAuditoria.objects.select_related("usuario", "igreja", "ministerio").all().order_by("-data_hora")
    serializer_class = LogAuditoriaSerializer
    permission_classes = [IsAdminLevel]
    pagination_class = AuditoriaPagination

    def get_queryset(self):
        qs = LogAuditoria.objects.select_related("usuario", "igreja", "ministerio").all().order_by("-data_hora")
        ministry_id = self.get_user_ministry_id()
        if ministry_id:
            qs = qs.filter(ministerio_id=ministry_id)
        elif not self.is_global_admin():
            return qs.none()

        acao = self.request.query_params.get("acao")
        usuario_id = self.request.query_params.get("usuario")
        igreja_id = normalize_ministry_id(self.request.query_params.get("igreja"))
        ministerio_id = normalize_ministry_id(self.request.query_params.get("ministerio"))
        modulo = self.request.query_params.get("modulo")
        escopo = self.request.query_params.get("escopo")

        if acao:
            qs = qs.filter(acao=acao)
        if usuario_id:
            qs = qs.filter(usuario=usuario_id)
        if igreja_id is not None:
            qs = qs.filter(igreja_id=igreja_id)
        if ministerio_id is not None:
            qs = qs.filter(ministerio_id=ministerio_id)
        if modulo:
            qs = qs.filter(modulo=modulo)
        if escopo:
            qs = qs.filter(escopo=escopo)
        return qs

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        hoje = localtime(now()).date()
        queryset = self.get_queryset()
        api_errors_qs = ApiRequestErrorLog.objects.all()
        ministry_id = self.get_user_ministry_id()
        if ministry_id:
            api_errors_qs = api_errors_qs.filter(ministerio_id=ministry_id)
        return Response(
            {
                "total_eventos": queryset.count(),
                "eventos_hoje": queryset.filter(data_hora__date=hoje).count(),
                "musicas_alteradas": queryset.filter(modelo_afetado="Musica").count(),
                "cultos_alterados": queryset.filter(modelo_afetado="Culto").count(),
                "eventos_base_alterados": queryset.filter(modelo_afetado="Evento").count(),
                "erros_api_registrados": api_errors_qs.count(),
            },
        )

    @action(detail=False, methods=["get"], url_path="metricas")
    def metricas(self, request):
        return Response(get_governance_snapshot())

    @action(detail=False, methods=["get"], url_path="erros-api")
    def erros_api(self, request):
        queryset = ApiRequestErrorLog.objects.select_related("usuario", "igreja", "ministerio").all()
        ministry_id = self.get_user_ministry_id()
        if ministry_id:
            queryset = queryset.filter(ministerio_id=ministry_id)
        elif not self.is_global_admin():
            queryset = queryset.none()

        status_code = self.request.query_params.get("status_code")
        modulo = self.request.query_params.get("modulo")
        if status_code:
            queryset = queryset.filter(status_code=status_code)
        if modulo:
            queryset = queryset.filter(modulo=modulo)

        serializer = ApiRequestErrorLogSerializer(queryset[:50], many=True)
        return Response(serializer.data)
