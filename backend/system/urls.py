from django.urls import include, path
from rest_framework.routers import DefaultRouter

from system.views import UserPermissionGrantViewSet

router = DefaultRouter()
router.register(r"permission-grants", UserPermissionGrantViewSet, basename="permission-grant")

urlpatterns = [path("", include(router.urls))]
