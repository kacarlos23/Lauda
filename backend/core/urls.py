from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from api.views import AdminTokenObtainPairView, LegacyTokenObtainPairView, MemberLoginView
from system.views import HealthCheckView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', HealthCheckView.as_view(), name='api-health'),
    path('api/accounts/', include('accounts.urls')),
    path('api/music/', include('music.urls')),
    path('api/events/', include('events.urls')),
    path('api/system/', include('system.urls')),
    path('api/institutions/', include('institutions.urls')),
    path('api/token/', LegacyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/login/', MemberLoginView.as_view(), name='auth_login'),
    path('api/auth/admin/login/', AdminTokenObtainPairView.as_view(), name='auth_admin_login'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('api/', include('api.urls')),
]
