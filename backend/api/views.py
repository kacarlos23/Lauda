from django.utils.timezone import localtime, now
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Culto, Escala, ItemSetlist, LogAuditoria, Musica, RegistroLogin, Usuario
from .serializers import (
    CultoSerializer,
    EscalaSerializer,
    ItemSetlistSerializer,
    LogAuditoriaSerializer,
    MusicaSerializer,
    MusicEnrichmentRequestSerializer,
    UsuarioSerializer,
)
from .services.music_facade import MusicFacade


class AuditoriaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def registrar_log(user, acao, modelo, descricao):
    if user and user.is_authenticated:
        LogAuditoria.objects.create(
            usuario=user,
            acao=acao,
            modelo_afetado=modelo,
            descricao=descricao,
        )


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
            and request.user.nivel_acesso == 1
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        request = self.context.get("request")
        ip = request.META.get("REMOTE_ADDR") if request else None
        RegistroLogin.objects.create(usuario=self.user, ip_address=ip)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdminLevel]

    @action(detail=False, methods=["get", "put", "patch"], permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user

        if request.method == "GET":
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MusicaViewSet(viewsets.ModelViewSet):
    queryset = Musica.objects.all()
    serializer_class = MusicaSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, "CREATE", "Musica", f'Musica "{instance.titulo}" criada.')

    def perform_update(self, serializer):
        is_active_before = serializer.instance.is_active
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
        except Exception as exc:  # pragma: no cover - defensive path
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


class CultoViewSet(viewsets.ModelViewSet):
    queryset = Culto.objects.all()
    serializer_class = CultoSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, "CREATE", "Culto", f'Culto "{instance.nome}" agendado.')

    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, "UPDATE", "Culto", f'Culto "{instance.nome}" atualizado.')

    def perform_destroy(self, instance):
        nome = instance.nome
        instance.delete()
        registrar_log(self.request.user, "DELETE", "Culto", f'Culto "{nome}" excluido.')


class EscalaViewSet(viewsets.ModelViewSet):
    queryset = Escala.objects.all()
    serializer_class = EscalaSerializer


class ItemSetlistViewSet(viewsets.ModelViewSet):
    queryset = ItemSetlist.objects.all()
    serializer_class = ItemSetlistSerializer


class LogAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogAuditoria.objects.all().order_by("-data_hora")
    serializer_class = LogAuditoriaSerializer
    permission_classes = [IsAdminLevel]
    pagination_class = AuditoriaPagination

    def get_queryset(self):
        qs = super().get_queryset()
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
        return Response(
            {
                "total_eventos": LogAuditoria.objects.count(),
                "eventos_hoje": LogAuditoria.objects.filter(data_hora__date=hoje).count(),
                "musicas_alteradas": LogAuditoria.objects.filter(modelo_afetado="Musica").count(),
                "cultos_alterados": LogAuditoria.objects.filter(modelo_afetado="Culto").count(),
            },
        )
