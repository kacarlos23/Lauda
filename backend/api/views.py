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
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    ConviteMinisterio,
    Culto,
    Escala,
    Igreja,
    ItemSetlist,
    LogAuditoria,
    Ministerio,
    Musica,
    RegistroLogin,
    Team,
    Usuario,
)
from .serializers import (
    AccessCodeBindSerializer,
    ConviteAcceptSerializer,
    ConviteMinisterioSerializer,
    MinisterioAccessCodePublicSerializer,
    ConviteMinisterioPublicSerializer,
    CultoSerializer,
    EscalaSerializer,
    IgrejaSerializer,
    ItemSetlistSerializer,
    LogAuditoriaSerializer,
    MinisterioSerializer,
    MusicaSerializer,
    MusicEnrichmentRequestSerializer,
    MemberLoginSerializer,
    TeamSerializer,
    UsuarioSerializer,
)
from .services.institutional_context import get_user_igreja
from .services.institutional_context import (
    get_user_igreja_membership,
    get_user_ministerio,
    get_user_ministerio_membership,
    has_user_institutional_membership,
    sync_user_memberships,
)
from .services.music_facade import MusicFacade


class AuditoriaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def registrar_log(user, acao, modelo, descricao):
    if user and user.is_authenticated:
        LogAuditoria.objects.create(
            usuario=user,
            acao=acao,
            modelo_afetado=modelo,
            descricao=descricao,
        )


def normalize_ministry_id(value):
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_scoped_ministry_id(user, token=None):
    if not user or not user.is_authenticated:
        return None
    if user.is_global_admin or user.is_superuser:
        token_get = getattr(token, "get", None)
        return normalize_ministry_id(token_get("ministerio_id") if callable(token_get) else None)
    ministerio = get_user_ministerio(user)
    return ministerio.id if ministerio else user.ministerio_id


def resolve_scoped_ministry(user, token=None):
    ministry_id = resolve_scoped_ministry_id(user, token)
    if ministry_id is None:
        return get_user_ministerio(user)
    if getattr(user, "ministerio_id", None) == ministry_id and getattr(user, "ministerio", None) is not None:
        return user.ministerio
    return Ministerio.objects.select_related("igreja").filter(id=ministry_id).first()


def build_user_payload(user, scoped_ministry=None):
    is_global_admin = bool(user.is_global_admin or user.is_superuser)
    igreja_membership = get_user_igreja_membership(user)
    ministerio_membership = get_user_ministerio_membership(user)
    effective_ministry = scoped_ministry if is_global_admin else get_user_ministerio(user)
    effective_ministry_id = effective_ministry.id if effective_ministry else user.ministerio_id
    igreja = get_user_igreja(user, ministerio=effective_ministry)
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
        "telefone": user.telefone or "",
        "is_active": user.is_active,
        "funcao_principal": user.funcao_principal or "",
        "funcoes": user.get_normalized_funcoes(),
    }


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


def build_auth_payload(user, scoped_ministry=None):
    effective_ministry = scoped_ministry if scoped_ministry is not None else get_user_ministerio(user)
    igreja_membership = get_user_igreja_membership(user)
    ministerio_membership = get_user_ministerio_membership(user)
    igreja = get_user_igreja(user, ministerio=effective_ministry)
    refresh = RefreshToken.for_user(user)
    refresh["is_global_admin"] = user.is_global_admin
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


def apply_music_enrichment(instance: Musica, enrichment: dict):
    instance.titulo = enrichment.get("title") or instance.titulo
    instance.artista = enrichment.get("artist") or instance.artista
    instance.link_audio = enrichment.get("spotify_url") or instance.link_audio
    instance.link_letra = enrichment.get("lyrics_link") or instance.link_letra
    instance.spotify_id = enrichment.get("spotify_id") or instance.spotify_id
    instance.genius_id = enrichment.get("genius_id") or instance.genius_id
    instance.cover_url = enrichment.get("cover") or instance.cover_url
    instance.preview_url = enrichment.get("preview") or instance.preview_url
    instance.isrc = enrichment.get("isrc") or instance.isrc
    instance.metadata_source = enrichment.get("source") or instance.metadata_source
    instance.spotify_popularidade = enrichment.get("spotify_popularity") or instance.spotify_popularidade
    instance.genius_popularidade = enrichment.get("genius_popularity") or instance.genius_popularidade
    synced_at = enrichment.get("synced_at")
    if synced_at:
        from django.utils.dateparse import parse_datetime

        instance.metadata_last_synced_at = parse_datetime(synced_at) or instance.metadata_last_synced_at
    return instance


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
        return self.request.user.ministerio

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


class AdminImpersonateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not (user.is_global_admin or user.is_superuser):
            return Response(
                {"detail": "Acesso negado. Apenas admins globais podem assumir ministerios."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ministry = None
        ministry_id = normalize_ministry_id(request.data.get("ministerio_id"))
        if ministry_id is not None:
            ministry = Ministerio.objects.filter(id=ministry_id).first()
            if ministry is None:
                return Response(
                    {"detail": "Ministerio nao encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        return Response(build_auth_payload(user, scoped_ministry=ministry))


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
    permission_classes = [IsGlobalAdmin]


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
        registrar_log(user, "UPDATE", "Ministerio", f'Configuracoes atualizadas para o ministerio "{ministry.nome}".')
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminLevel], url_path="regenerate-access-code")
    def regenerate_access_code(self, request, pk=None):
        ministry = self.get_object()
        user = request.user
        if not (user.is_global_admin or user.is_superuser) and user.ministerio_id != ministry.id:
            return Response({"detail": "Voce nao pode regenerar o codigo de outro ministerio."}, status=status.HTTP_403_FORBIDDEN)

        for _ in range(5):
            ministry.access_code = Ministerio._meta.get_field("access_code").default()
            try:
                ministry.save(update_fields=["access_code", "updated_at"])
                break
            except Exception:  # pragma: no cover
                continue
        else:  # pragma: no cover
            return Response({"detail": "Nao foi possivel regenerar o codigo agora."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        registrar_log(user, "UPDATE", "Ministerio", f'Codigo de acesso regenerado para o ministerio "{ministry.nome}".')
        return Response(self.get_serializer(ministry).data)


class ConviteMinisterioViewSet(viewsets.ModelViewSet):
    queryset = ConviteMinisterio.objects.select_related("ministerio", "invited_by", "accepted_by")
    serializer_class = ConviteMinisterioSerializer
    permission_classes = [IsGlobalAdmin]

    def perform_create(self, serializer):
        instance = serializer.save(invited_by=self.request.user)
        registrar_log(self.request.user, "CREATE", "ConviteMinisterio", f'Convite {instance.access_code} criado para o ministerio "{instance.ministerio.nome}".')


class UsuarioViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related("ministerio", "ministerio__igreja").all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminLevel]

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
        registrar_log(self.request.user, "CREATE", "Usuario", f'Usuario "{instance.username}" criado.')

    def perform_update(self, serializer):
        ministry, is_global_admin = self.resolve_user_assignment(serializer)
        serializer.save(ministerio=ministry, is_global_admin=is_global_admin)


class TeamViewSet(MinistryScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Team.objects.select_related("ministerio").all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]
    ministry_field = "ministerio"


class MusicaViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Musica.objects.all()
    serializer_class = MusicaSerializer
    permission_classes = [IsAuthenticatedReadOnlyOrMusicEditor]

    def get_queryset(self):
        return Musica.objects.all()

    def perform_create(self, serializer):
        instance = serializer.save(ministerio=None)
        registrar_log(self.request.user, "CREATE", "Musica", f'Musica "{instance.titulo}" criada.')

    def perform_update(self, serializer):
        is_active_before = serializer.instance.is_active
        instance = serializer.save(ministerio=None)
        if is_active_before and not instance.is_active:
            registrar_log(
                self.request.user,
                "DELETE",
                "Musica",
                f'Musica "{instance.titulo}" movida para lixeira.',
            )
        else:
            registrar_log(self.request.user, "UPDATE", "Musica", f'Musica "{instance.titulo}" atualizada.')

    def perform_destroy(self, instance):
        titulo = instance.titulo
        instance.delete()
        registrar_log(self.request.user, "DELETE", "Musica", f'Musica "{titulo}" deletada definitivamente.')

    @action(detail=False, methods=["post"], permission_classes=[IsMusicEditor], url_path="enriquecer")
    def enriquecer(self, request):
        serializer = MusicEnrichmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        facade = MusicFacade()

        try:
            data = facade.find_complete_music_data(**serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except LookupError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:  # pragma: no cover
            return Response(
                {"detail": f"Falha ao consultar provedores externos: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[IsMusicEditor], url_path="sincronizar-metadados")
    def sincronizar_metadados(self, request, pk=None):
        musica = self.get_object()
        facade = MusicFacade()

        try:
            enrichment = facade.find_complete_music_data(title=musica.titulo, artist=musica.artista)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        apply_music_enrichment(musica, enrichment)
        musica.save()
        registrar_log(self.request.user, "UPDATE", "Musica", f'Metadados externos de "{musica.titulo}" sincronizados.')
        return Response(self.get_serializer(musica).data)


class CultoViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Culto.objects.all()
    serializer_class = CultoSerializer
    permission_classes = [IsAuthenticatedReadOnlyOrAdminLevel]

    def perform_create(self, serializer):
        ministry = self.require_ministry(self.get_effective_ministry(serializer.validated_data.get("ministerio")))
        instance = serializer.save(ministerio=ministry)
        registrar_log(self.request.user, "CREATE", "Culto", f'Culto "{instance.nome}" agendado.')

    def perform_update(self, serializer):
        ministry = self.get_effective_ministry(
            serializer.validated_data.get("ministerio", serializer.instance.ministerio),
        )
        instance = serializer.save(ministerio=self.require_ministry(ministry))
        registrar_log(self.request.user, "UPDATE", "Culto", f'Culto "{instance.nome}" atualizado.')

    def perform_destroy(self, instance):
        nome = instance.nome
        instance.delete()
        registrar_log(self.request.user, "DELETE", "Culto", f'Culto "{nome}" excluido.')


class EscalaViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Escala.objects.all()
    serializer_class = EscalaSerializer
    permission_classes = [IsAuthenticatedReadOnlyOrAdminLevel]

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
        serializer.save(ministerio=ministry)

    def perform_update(self, serializer):
        ministry = self.validate_related_objects(serializer)
        serializer.save(ministerio=ministry)


class ItemSetlistViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ItemSetlist.objects.all()
    serializer_class = ItemSetlistSerializer
    permission_classes = [IsAuthenticatedReadOnlyOrAdminLevel]

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
        serializer.save(ministerio=ministry)

    def perform_update(self, serializer):
        ministry = self.validate_related_objects(serializer)
        serializer.save(ministerio=ministry)


class LogAuditoriaViewSet(MinistryScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = LogAuditoria.objects.all().order_by("-data_hora")
    serializer_class = LogAuditoriaSerializer
    permission_classes = [IsAdminLevel]
    pagination_class = AuditoriaPagination

    def get_queryset(self):
        qs = LogAuditoria.objects.all().order_by("-data_hora")
        ministry_id = self.get_user_ministry_id()
        if ministry_id:
            qs = qs.filter(usuario__ministerio_id=ministry_id)
        elif not self.is_global_admin():
            return qs.none()

        acao = self.request.query_params.get("acao")
        usuario_id = self.request.query_params.get("usuario")

        if acao:
            qs = qs.filter(acao=acao)
        if usuario_id:
            qs = qs.filter(usuario=usuario_id)
        return qs

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        hoje = localtime(now()).date()
        queryset = self.get_queryset()
        return Response(
            {
                "total_eventos": queryset.count(),
                "eventos_hoje": queryset.filter(data_hora__date=hoje).count(),
                "musicas_alteradas": queryset.filter(modelo_afetado="Musica").count(),
                "cultos_alterados": queryset.filter(modelo_afetado="Culto").count(),
            },
        )
