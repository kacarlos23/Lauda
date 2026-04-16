from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from institutions.models import Igreja, Ministerio
from institutions.permissions import CanManageChurch, CanManageMinistry
from institutions.serializers import IgrejaSerializer, MinisterioSerializer


class IgrejaViewSet(viewsets.ModelViewSet):
    queryset = Igreja.objects.all()
    serializer_class = IgrejaSerializer
    permission_classes = [IsAuthenticated, CanManageChurch]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
            return Igreja.objects.prefetch_related("vinculos_usuarios", "ministerios").order_by("-created_at")
        return (
            Igreja.objects.filter(
                vinculos_usuarios__usuario=user,
                vinculos_usuarios__is_active=True,
            )
            .prefetch_related("vinculos_usuarios", "ministerios")
            .distinct()
            .order_by("-created_at")
        )


class MinisterioViewSet(viewsets.ModelViewSet):
    queryset = Ministerio.objects.all()
    serializer_class = MinisterioSerializer
    permission_classes = [IsAuthenticated, CanManageMinistry]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Ministerio.objects.select_related("igreja").prefetch_related("vinculos_usuarios")
        if getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
            return base_queryset.order_by("-created_at")

        igrejas_ids = user.vinculos_igreja.filter(is_active=True).values_list("igreja_id", flat=True)
        return (
            base_queryset.filter(
                Q(vinculos_usuarios__usuario=user, vinculos_usuarios__is_active=True)
                | Q(igreja_id__in=igrejas_ids)
            )
            .distinct()
            .order_by("-created_at")
        )
