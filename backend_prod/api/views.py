from django.db import transaction
from django.utils.timezone import localtime, now
from rest_framework import permissions, serializers, status, viewsets
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
    ItemSetlist,
    LogAuditoria,
    Ministerio,
    Musica,
    RegistroLogin,
    Usuario,
)
from .serializers import (
    ConviteAcceptSerializer,
    ConviteMinisterioSerializer,
    CultoSerializer,
    EscalaSerializer,
    ItemSetlistSerializer,
    LogAuditoriaSerializer,
    MinisterioSerializer,
    MusicaSerializer,
    MusicEnrichmentRequestSerializer,
    UsuarioSerializer,
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


def build_auth_payload(user):
    refresh = RefreshToken.for_user(user)
    refresh["is_global_admin"] = user.is_global_admin
    refresh["nivel_acesso"] = user.nivel_acesso
    refresh["ministerio_id"] = user.ministerio_id
    refresh["ministerio_slug"] = user.ministerio.slug if user.ministerio_id else None

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "nivel_acesso": user.nivel_acesso,
            "is_global_admin": user.is_global_admin,
            "ministerio_id": user.ministerio_id,
            "ministerio_nome": user.ministerio.nome if user.ministerio_id else None,
            "ministerio_slug": user.ministerio.slug if user.ministerio_id else None,
        },
    }


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
            and (request.user.nivel_acesso == 1 or request.user.is_global_admin or request.user.is_superuser)
        )


class IsGlobalAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_global_admin or request.user.is_superuser)
        )


class MinistryScopedViewSetMixin:
    ministry_field = "ministerio"

    def is_global_admin(self):
        user = self.request.user
        return bool(user and user.is_authenticated and (user.is_global_admin or user.is_superuser))

    def get_user_ministry_id(self):
        user = self.request.user
        return getattr(user, "ministerio_id", None)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.is_global_admin():
            return queryset

        ministry_id = self.get_user_ministry_id()
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
            return payload_ministry
        return self.request.user.ministerio

    def ensure_same_ministry(self, obj, field_name):
        effective_ministry = self.get_effective_ministry()
        if self.is_global_admin() or effective_ministry is None:
            return

        if getattr(obj, "ministerio_id", None) != effective_ministry.id:
            raise serializers.ValidationError(
                {field_name: "O recurso informado pertence a outro ministerio."},
            )


class BaseTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data.update(
            {
                "user": {
                    "id": self.user.id,
                    "username": self.user.username,
                    "first_name": self.user.first_name,
                    "last_name": self.user.last_name,
                    "email": self.user.email,
                    "nivel_acesso": self.user.nivel_acesso,
                    "is_global_admin": self.user.is_global_admin,
                    "ministerio_id": self.user.ministerio_id,
                    "ministerio_nome": self.user.ministerio.nome if self.user.ministerio_id else None,
                    "ministerio_slug": self.user.ministerio.slug if self.user.ministerio_id else None,
                }
            }
        )
        return data

    def register_login(self):
        request = self.context.get("request")
        ip = get_client_ip(request) if request else None
        RegistroLogin.objects.create(usuario=self.user, ip_address=ip)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_global_admin"] = user.is_global_admin
        token["nivel_acesso"] = user.nivel_acesso
        token["ministerio_id"] = user.ministerio_id
        token["ministerio_slug"] = user.ministerio.slug if user.ministerio_id else None
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


class InviteLookupView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        invite = ConviteMinisterio.objects.select_related("ministerio").filter(token=code).first()
        if invite is None:
            invite = ConviteMinisterio.objects.select_related("ministerio").filter(access_code=code.upper()).first()

        if invite is None:
            return Response({"detail": "Convite nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if invite.is_expired and invite.status == "PENDENTE":
            invite.status = "EXPIRADO"
            invite.save(update_fields=["status", "updated_at"])

        if not invite.can_be_used():
            return Response({"detail": "Convite expirado, revogado ou sem usos disponiveis."}, status=status.HTTP_410_GONE)

        return Response(ConviteMinisterioSerializer(invite).data)


class AcceptInviteView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = ConviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invite = serializer.validated_data["code"]
        existing_user = serializer.validated_data["existing_user"]
        payload = {
            "username": serializer.validated_data["username"],
            "first_name": serializer.validated_data["first_name"],
            "last_name": serializer.validated_data.get("last_name", ""),
            "email": serializer.validated_data.get("email", ""),
            "telefone": serializer.validated_data.get("telefone", ""),
            "funcao_principal": serializer.validated_data.get("funcao_principal") or "Membro",
            "ministerio": invite.ministerio,
            "nivel_acesso": invite.nivel_acesso,
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

        invite.mark_as_accepted(user)
        registrar_log(user, "CREATE", "ConviteMinisterio", f'Convite aceito para o ministerio "{invite.ministerio.nome}".')
        RegistroLogin.objects.create(usuario=user, ip_address=get_client_ip(request))
        return Response(build_auth_payload(user), status=status.HTTP_201_CREATED)


class MinisterioViewSet(viewsets.ModelViewSet):
    queryset = Ministerio.objects.all()
    serializer_class = MinisterioSerializer
    permission_classes = [IsGlobalAdmin]


class ConviteMinisterioViewSet(viewsets.ModelViewSet):
    queryset = ConviteMinisterio.objects.select_related("ministerio", "invited_by", "accepted_by")
    serializer_class = ConviteMinisterioSerializer
    permission_classes = [IsGlobalAdmin]

    def perform_create(self, serializer):
        instance = serializer.save(invited_by=self.request.user)
        registrar_log(self.request.user, "CREATE", "ConviteMinisterio", f'Convite {instance.access_code} criado para o ministerio "{instance.ministerio.nome}".')


class UsuarioViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related("ministerio").all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminLevel]

    @action(detail=False, methods=["get", "put", "patch"], permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user

        if request.method == "GET":
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        mutable_data = request.data.copy()
        if not self.is_global_admin():
            mutable_data.pop("is_global_admin", None)
            mutable_data.pop("ministerio", None)

        serializer = self.get_serializer(user, data=mutable_data, partial=True)
        serializer.is_valid(raise_exception=True)
        if self.is_global_admin():
            serializer.save()
        else:
            serializer.save(ministerio=user.ministerio, is_global_admin=False)
        return Response(serializer.data)

    def perform_create(self, serializer):
        payload_ministry = serializer.validated_data.get("ministerio")
        ministry = self.get_effective_ministry(payload_ministry)
        if not self.is_global_admin() and serializer.validated_data.get("is_global_admin"):
            raise serializers.ValidationError({"is_global_admin": "Apenas admin global pode criar outro admin global."})

        instance = serializer.save(
            ministerio=ministry,
            is_global_admin=serializer.validated_data.get("is_global_admin", False) if self.is_global_admin() else False,
        )
        registrar_log(self.request.user, "CREATE", "Usuario", f'Usuario "{instance.username}" criado.')

    def perform_update(self, serializer):
        if not self.is_global_admin():
            if "ministerio" in serializer.validated_data and serializer.validated_data["ministerio"] != self.request.user.ministerio:
                raise serializers.ValidationError({"ministerio": "Voce nao pode mover usuarios para outro ministerio."})
            if serializer.validated_data.get("is_global_admin"):
                raise serializers.ValidationError({"is_global_admin": "Apenas admin global pode promover admin global."})
            serializer.save(ministerio=self.request.user.ministerio, is_global_admin=False)
            return

        serializer.save()


class MusicaViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Musica.objects.all()
    serializer_class = MusicaSerializer

    def perform_create(self, serializer):
        instance = serializer.save(ministerio=self.get_effective_ministry(serializer.validated_data.get("ministerio")))
        registrar_log(self.request.user, "CREATE", "Musica", f'Musica "{instance.titulo}" criada.')

    def perform_update(self, serializer):
        is_active_before = serializer.instance.is_active
        if not self.is_global_admin():
            instance = serializer.save(ministerio=self.request.user.ministerio)
        else:
            instance = serializer.save()
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

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="enriquecer")
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

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="sincronizar-metadados")
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

    def perform_create(self, serializer):
        instance = serializer.save(ministerio=self.get_effective_ministry(serializer.validated_data.get("ministerio")))
        registrar_log(self.request.user, "CREATE", "Culto", f'Culto "{instance.nome}" agendado.')

    def perform_update(self, serializer):
        if not self.is_global_admin():
            instance = serializer.save(ministerio=self.request.user.ministerio)
        else:
            instance = serializer.save()
        registrar_log(self.request.user, "UPDATE", "Culto", f'Culto "{instance.nome}" atualizado.')

    def perform_destroy(self, instance):
        nome = instance.nome
        instance.delete()
        registrar_log(self.request.user, "DELETE", "Culto", f'Culto "{nome}" excluido.')


class EscalaViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Escala.objects.all()
    serializer_class = EscalaSerializer

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

        return ministry or getattr(culto, "ministerio", None) or getattr(membro, "ministerio", None)

    def perform_create(self, serializer):
        ministry = self.validate_related_objects(serializer)
        serializer.save(ministerio=ministry)

    def perform_update(self, serializer):
        ministry = self.validate_related_objects(serializer)
        serializer.save(ministerio=ministry)


class ItemSetlistViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ItemSetlist.objects.all()
    serializer_class = ItemSetlistSerializer

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
        if culto and musica and culto.ministerio_id != musica.ministerio_id:
            raise serializers.ValidationError({"musica": "Musica e culto precisam pertencer ao mesmo ministerio."})

        return ministry or getattr(culto, "ministerio", None) or getattr(musica, "ministerio", None)

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
        qs = super().get_queryset()
        if not self.is_global_admin():
            ministry_id = self.get_user_ministry_id()
            if not ministry_id:
                return qs.none()
            qs = qs.filter(usuario__ministerio_id=ministry_id)

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
