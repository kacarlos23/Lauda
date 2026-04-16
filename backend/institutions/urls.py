from django.urls import include, path
from rest_framework.routers import DefaultRouter

from institutions.views import IgrejaViewSet, MinisterioViewSet

router = DefaultRouter()
router.register(r"igrejas", IgrejaViewSet, basename="igreja")
router.register(r"ministerios", MinisterioViewSet, basename="ministerio")

urlpatterns = [path("", include(router.urls))]
