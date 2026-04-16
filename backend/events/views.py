from django.db import transaction
from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from events.services import delete_linked_evento_for_culto, sync_culto_evento, validate_evento_scope_for_write
from events.models import Culto, Escala, Evento
from events.serializers import CultoSerializer, EscalaSerializer, EventoSerializer
from system.constants import MODULE_KEY_MUSIC
from system.permissions import CanManageCulto
from system.services import registrar_log
from system.view_mixins import MinistryScopedViewSetMixin


class EventoViewSet(viewsets.ModelViewSet):
    queryset = Evento.objects.all()
    serializer_class = EventoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Evento.objects.select_related(
            "igreja",
            "ministerio",
            "ministerio__igreja",
        )

        if getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
            return qs.order_by("-data", "-horario_inicio")

        igrejas_ids = user.vinculos_igreja.filter(is_active=True).values_list("igreja_id", flat=True)
        ministerios_ids = user.vinculos_ministerio.filter(is_active=True).values_list("ministerio_id", flat=True)
        return (
            qs.filter(
                Q(igreja_id__in=igrejas_ids) | Q(ministerio_id__in=ministerios_ids)
            )
            .distinct()
            .order_by("-data", "-horario_inicio")
        )

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
    permission_classes = [IsAuthenticated, CanManageCulto]
    authorization_module = MODULE_KEY_MUSIC

    def get_queryset(self):
        user = self.request.user
        qs = Culto.objects.select_related(
            "ministerio",
            "evento",
            "evento__igreja",
            "evento__ministerio",
        ).prefetch_related(
            "setlists",
            "escalas",
        )

        if getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
            return qs.order_by("-data", "-horario_inicio")

        igrejas_ids = user.vinculos_igreja.filter(is_active=True).values_list("igreja_id", flat=True)
        ministerios_ids = user.vinculos_ministerio.filter(is_active=True).values_list("ministerio_id", flat=True)
        return (
            qs.filter(
                Q(evento__igreja_id__in=igrejas_ids)
                | Q(ministerio__igreja_id__in=igrejas_ids)
                | Q(ministerio_id__in=ministerios_ids)
            )
            .distinct()
            .order_by("-data", "-horario_inicio")
        )

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
    permission_classes = [IsAuthenticated, CanManageCulto]
    authorization_module = MODULE_KEY_MUSIC

    def get_queryset(self):
        user = self.request.user
        qs = Escala.objects.select_related(
            "ministerio",
            "culto",
            "culto__evento",
            "culto__evento__igreja",
            "membro",
        )

        if getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
            return qs.order_by("-culto__data", "-id")

        igrejas_ids = user.vinculos_igreja.filter(is_active=True).values_list("igreja_id", flat=True)
        ministerios_ids = user.vinculos_ministerio.filter(is_active=True).values_list("ministerio_id", flat=True)
        return (
            qs.filter(
                Q(culto__evento__igreja_id__in=igrejas_ids)
                | Q(culto__ministerio__igreja_id__in=igrejas_ids)
                | Q(ministerio_id__in=ministerios_ids)
                | Q(culto__ministerio_id__in=ministerios_ids)
            )
            .distinct()
            .order_by("-culto__data", "-id")
        )

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
