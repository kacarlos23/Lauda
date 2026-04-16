from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from institutions.models import Ministerio
from music.models import ItemSetlist, Musica
from music.serializers import ItemSetlistSerializer, MusicEnrichmentRequestSerializer, MusicaSerializer
from music.services import MusicFacade, apply_music_enrichment
from system.constants import MODULE_KEY_MUSIC
from system.permissions import CanManageMusic
from system.services import registrar_log
from system.view_mixins import MinistryScopedViewSetMixin


class MusicaViewSet(MinistryScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Musica.objects.all()
    serializer_class = MusicaSerializer
    permission_classes = [CanManageMusic]
    authorization_module = MODULE_KEY_MUSIC
    lookup_field = "pk"

    def get_queryset(self):
        qs = Musica.objects.select_related(
            "ministerio",
            "ministerio__igreja",
        ).prefetch_related(
            "itemsetlist_set",
        )
        if hasattr(self, "apply_ministry_scope"):
            qs = self.apply_ministry_scope(qs)
        return qs.order_by("-id")

    def perform_create(self, serializer):
        user = self.request.user
        requested_ministry_id = serializer.validated_data.get("ministerio_id")
        target_ministry = serializer.validated_data.get("ministerio")

        if target_ministry is None and requested_ministry_id:
            target_ministry = Ministerio.objects.filter(id=requested_ministry_id).first()
            if not target_ministry:
                raise ValidationError({"ministerio_id": _("Ministerio especificado nao encontrado.")})

        if target_ministry is None:
            target_ministry = self.get_effective_request_ministry() or user.ministerio
            if target_ministry is None and not (user.is_global_admin or user.is_superuser):
                raise ValidationError(
                    {"ministerio": _("E necessario vincular a musica a um ministerio ou estar associado a um.")}
                )

        instance = serializer.save(ministerio=target_ministry, created_by=user)
        registrar_log(
            user,
            "CREATE",
            "Musica",
            f'Musica "{instance.titulo}" criada para ministerio "{target_ministry.nome if target_ministry else "Global"}".',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_log(
            self.request.user,
            "UPDATE",
            "Musica",
            f'Musica "{instance.titulo}" atualizada.',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    def perform_destroy(self, instance):
        titulo = instance.titulo
        super().perform_destroy(instance)
        registrar_log(
            self.request.user,
            "DELETE",
            "Musica",
            f'Musica "{titulo}" excluida.',
            instance=instance,
            modulo=MODULE_KEY_MUSIC,
        )

    @action(detail=False, methods=["post"], permission_classes=[CanManageMusic], url_path="enriquecer")
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

    @action(detail=True, methods=["post"], permission_classes=[CanManageMusic], url_path="sincronizar-metadados")
    def sincronizar_metadados(self, request, pk=None):
        musica = self.get_object()
        facade = MusicFacade()

        try:
            enrichment = facade.find_complete_music_data(title=musica.titulo, artist=musica.artista)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        apply_music_enrichment(musica, enrichment)
        musica.save()
        registrar_log(
            self.request.user,
            "UPDATE",
            "Musica",
            f'Metadados externos de "{musica.titulo}" sincronizados.',
            instance=musica,
            modulo=MODULE_KEY_MUSIC,
        )
        return Response(self.get_serializer(musica).data)


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
