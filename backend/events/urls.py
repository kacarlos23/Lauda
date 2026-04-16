from django.urls import include, path
from rest_framework.routers import DefaultRouter

from events.views import CultoViewSet, EscalaViewSet, EventoViewSet

router = DefaultRouter()
router.register(r"cultos", CultoViewSet, basename="culto")
router.register(r"eventos", EventoViewSet, basename="evento")
router.register(r"escalas", EscalaViewSet, basename="escala")

urlpatterns = [path("", include(router.urls))]
