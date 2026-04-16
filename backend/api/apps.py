from django.apps import AppConfig
from django.db.models.base import ModelBase


class ApiConfig(AppConfig):
    name = 'api'

    def get_model(self, model_name, require_ready=True):
        try:
            return super().get_model(model_name, require_ready=require_ready)
        except LookupError:
            if require_ready:
                self.apps.check_models_ready()

            # Compatibility fallback: expose re-exported models through the
            # legacy `api` app label without redefining them in `api/models.py`.
            from . import models as api_models

            candidate = getattr(api_models, model_name, None)
            if isinstance(candidate, ModelBase):
                return candidate
            raise
