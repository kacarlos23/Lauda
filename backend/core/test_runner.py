from django.conf import settings
from django.test.runner import DiscoverRunner


class _DisableMigrations(dict):
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


class NoMigrationsDiscoverRunner(DiscoverRunner):
    """Usa syncdb nos testes para contornar o grafo legado de migrations."""

    def setup_databases(self, **kwargs):
        self._old_migration_modules = getattr(settings, "MIGRATION_MODULES", {})
        settings.MIGRATION_MODULES = _DisableMigrations()
        return super().setup_databases(**kwargs)

    def teardown_databases(self, old_config, **kwargs):
        try:
            return super().teardown_databases(old_config, **kwargs)
        finally:
            settings.MIGRATION_MODULES = self._old_migration_modules
