from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import AdminImpersonateView, UsuarioViewSet

router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet, basename="usuario")

urlpatterns = [
    path("auth/impersonate/", AdminImpersonateView.as_view(), name="admin_impersonate"),
    path("", include(router.urls)),
]
