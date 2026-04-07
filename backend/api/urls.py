from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcceptInviteView,
    BindAccessCodeView,
    ConviteMinisterioViewSet,
    CultoViewSet,
    EscalaViewSet,
    InviteLookupView,
    ItemSetlistViewSet,
    LogAuditoriaViewSet,
    MinisterioViewSet,
    MinistryInviteLinkView,
    MusicaViewSet,
    TeamViewSet,
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
router.register(r"equipes", TeamViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/invites/accept/", AcceptInviteView.as_view(), name="invite-accept"),
    path("auth/invites/<str:code>/", InviteLookupView.as_view(), name="invite-lookup"),
    path("auth/access-code/bind/", BindAccessCodeView.as_view(), name="access-code-bind"),
    path("auth/ministry-invite-link/", MinistryInviteLinkView.as_view(), name="ministry-invite-link"),
]
