from django.urls import include, path
from rest_framework.routers import DefaultRouter

from music.views import ItemSetlistViewSet, MusicaViewSet

router = DefaultRouter()
router.register(r"musicas", MusicaViewSet, basename="musica")
router.register(r"itens-setlist", ItemSetlistViewSet, basename="itemsetlist")

urlpatterns = [path("", include(router.urls))]
