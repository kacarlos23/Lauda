from django.apps import AppConfig


class MusicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'music'

    def ready(self):
        try:
            import music.signals  # noqa: F401
        except ImportError:
            pass
