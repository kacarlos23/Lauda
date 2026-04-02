from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcceptInviteView,
    ConviteMinisterioViewSet,
    CultoViewSet,
    EscalaViewSet,
    InviteLookupView,
    ItemSetlistViewSet,
    LogAuditoriaViewSet,
    MinisterioViewSet,
    MusicaViewSet,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register(r"ministerios", MinisterioViewSet)
router.register(r"convites", ConviteMinisterioViewSet)
router.register(r"usuarios", UsuarioViewSet)
router.register(r"musicas", MusicaViewSet)
router.register(r"cultos", CultoViewSet)
router.register(r"escalas", EscalaViewSet)
router.register(r"setlists", ItemSetlistViewSet)
router.register(r"auditoria", LogAuditoriaViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/invites/accept/", AcceptInviteView.as_view(), name="invite-accept"),
    path("auth/invites/<str:code>/", InviteLookupView.as_view(), name="invite-lookup"),
]
