from django.apps import AppConfig


class SystemConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'system'

    def ready(self):
        try:
            import system.signals  # noqa: F401
        except ImportError:
            pass
