from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import AdminImpersonateView, UsuarioViewSet
from events.views import CultoViewSet, EscalaViewSet, EventoViewSet
from music.views import ItemSetlistViewSet, MusicaViewSet

from .views import (
    AcceptInviteView,
    BindAccessCodeView,
    ConviteMinisterioViewSet,
    IgrejaViewSet,
    IgrejaModuloViewSet,
    InviteLookupView,
    LogAuditoriaViewSet,
    MinisterioViewSet,
    ModuloViewSet,
    MinistryInviteLinkView,
    TeamViewSet,
)

router = DefaultRouter()
router.register(r"igrejas", IgrejaViewSet, basename="igreja")
router.register(r"modulos", ModuloViewSet, basename="modulo")
router.register(r"igreja-modulos", IgrejaModuloViewSet, basename="igreja-modulo")
router.register(r"ministerios", MinisterioViewSet)
router.register(r"convites", ConviteMinisterioViewSet)
router.register(r"usuarios", UsuarioViewSet)
router.register(r"eventos", EventoViewSet, basename="evento")
router.register(r"musicas", MusicaViewSet)
router.register(r"cultos", CultoViewSet)
router.register(r"escalas", EscalaViewSet)
router.register(r"setlists", ItemSetlistViewSet)
router.register(r"auditoria", LogAuditoriaViewSet)
router.register(r"equipes", TeamViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/impersonate/", AdminImpersonateView.as_view(), name="admin-impersonate"),
    path("auth/invites/accept/", AcceptInviteView.as_view(), name="invite-accept"),
    path("auth/invites/<str:code>/", InviteLookupView.as_view(), name="invite-lookup"),
    path("auth/access-code/bind/", BindAccessCodeView.as_view(), name="access-code-bind"),
    path("auth/ministry-invite-link/", MinistryInviteLinkView.as_view(), name="ministry-invite-link"),
]
