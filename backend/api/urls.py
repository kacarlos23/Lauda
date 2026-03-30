from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogAuditoriaViewSet, UsuarioViewSet, MusicaViewSet, CultoViewSet, EscalaViewSet, ItemSetlistViewSet

# O Router cria automaticamente as URLs para o nosso CRUD (ex: /musicas/, /musicas/1/)
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'musicas', MusicaViewSet)
router.register(r'cultos', CultoViewSet)
router.register(r'escalas', EscalaViewSet)
router.register(r'setlists', ItemSetlistViewSet)
router.register(r'auditoria', LogAuditoriaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]