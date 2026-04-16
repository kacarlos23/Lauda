import datetime
from pathlib import Path
import os
from decouple import Csv, config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    raw_value = config(name, default=default)
    if isinstance(raw_value, bool):
        return raw_value

    value = str(raw_value).strip().lower()
    if value in {"1", "true", "yes", "on", "debug", "local"}:
        return True
    if value in {"0", "false", "no", "off", "release", "prod", "production"}:
        return False
    return bool(default)


def env_csv(name, default=""):
    values = config(name, default=default, cast=Csv())
    return [value for value in values if value]


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config(
    'SECRET_KEY',
    default='lauda-local-fallback-secret-key-change-me-4f7b2c91a6d3e8h5k0m2p9q7r1s4t6',
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool('DEBUG', default=False)

ALLOWED_HOSTS = env_csv(
    'ALLOWED_HOSTS',
    default='127.0.0.1,localhost,.trycloudflare.com,.workers.dev,.pages.dev',
)

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', default=False)
SECURE_CONTENT_TYPE_NOSNIFF = env_bool('SECURE_CONTENT_TYPE_NOSNIFF', default=True)
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', default=False)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', default=False)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False)
SECURE_HSTS_PRELOAD = env_bool('SECURE_HSTS_PRELOAD', default=False)
X_FRAME_OPTIONS = config('X_FRAME_OPTIONS', default='DENY')

# Application definition

INSTALLED_APPS = [
    # Django Core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    # Apps do Dominio
    'accounts',
    'institutions',
    'music',
    'events',
    'system',

    # Manter temporariamente durante a migracao estrutural.
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = '/static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

AUTH_USER_MODEL = 'accounts.Usuario'

CORS_ALLOW_ALL_ORIGINS = env_bool('CORS_ALLOW_ALL_ORIGINS', default=False)

CORS_ALLOWED_ORIGINS = env_csv(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
)

CORS_ALLOWED_ORIGIN_REGEXES = env_csv(
    'CORS_ALLOWED_ORIGIN_REGEXES',
    default=r'^https://.*\.trycloudflare\.com$,^https://.*\.workers\.dev$,^https://.*\.pages\.dev$'
)

CSRF_TRUSTED_ORIGINS = env_csv(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173,https://*.trycloudflare.com,https://*.workers.dev,https://*.pages.dev'
)

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='localhost')
EMAIL_PORT = config('EMAIL_PORT', default=25, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', default=False)
EMAIL_USE_SSL = env_bool('EMAIL_USE_SSL', default=False)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='no-reply@localhost')

SENTRY_DSN = config('SENTRY_DSN', default='')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated', # Exige login para tudo!
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'MAX_PAGE_SIZE': 200,
    'PAGE_SIZE_QUERY_PARAM': 'page_size',
    'EXCEPTION_HANDLER': 'system.exception_handler.custom_exception_handler',
}

TEST_RUNNER = 'core.test_runner.NoMigrationsDiscoverRunner'

from rest_framework.pagination import PageNumberPagination

PageNumberPagination.page_size_query_param = 'page_size'
PageNumberPagination.max_page_size = 200

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': datetime.timedelta(
        hours=config('ACCESS_TOKEN_LIFETIME_HOURS', default=1, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': datetime.timedelta(
        days=config('REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('JWT_SECRET_KEY', default=SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

SPOTIFY_CLIENT_ID = config("SPOTIFY_CLIENT_ID", default="")
SPOTIFY_CLIENT_SECRET = config("SPOTIFY_CLIENT_SECRET", default="")
SPOTIFY_MARKET = config("SPOTIFY_MARKET", default="BR")
GENIUS_ACCESS_TOKEN = config("GENIUS_ACCESS_TOKEN", default="")
EXTERNAL_API_TIMEOUT = config("EXTERNAL_API_TIMEOUT", default=10, cast=int)
MUSIC_METADATA_CACHE_TTL = config("MUSIC_METADATA_CACHE_TTL", default=86400, cast=int)
SPOTIFY_THROTTLE_SECONDS = config("SPOTIFY_THROTTLE_SECONDS", default=0.35, cast=float)
GENIUS_THROTTLE_SECONDS = config("GENIUS_THROTTLE_SECONDS", default=0.9, cast=float)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": (
                "%(asctime)s %(name)s %(levelname)s %(message)s "
                "user_id=%(user_id)s user_email=%(user_email)s path=%(path)s "
                "method=%(method)s view=%(view)s exception_type=%(exception_type)s "
                "exception_msg=%(exception_msg)s"
            ),
        },
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "ERROR",
            "class": "logging.StreamHandler",
            "formatter": "json",
        }
    },
    "loggers": {
        "api.exceptions": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": True,
        }
    },
}
