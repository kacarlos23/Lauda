from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from api.views import AdminTokenObtainPairView, LegacyTokenObtainPairView, MinistryTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/token/', LegacyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/login/', MinistryTokenObtainPairView.as_view(), name='auth_login'),
    path('api/auth/admin/login/', AdminTokenObtainPairView.as_view(), name='auth_admin_login'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
]
