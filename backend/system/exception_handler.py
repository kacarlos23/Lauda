import logging

from django.conf import settings
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("api.exceptions")


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    status_code = response.status_code if response is not None else 500
    if status_code >= 500:
        request = context.get("request")
        view = context.get("view")
        user = getattr(request, "user", None) if request is not None else None

        logger.error(
            f"SERVER_ERROR_{status_code}",
            extra={
                "user_id": getattr(user, "pk", None),
                "user_email": getattr(user, "email", "anonymous"),
                "path": request.path if request else "unknown",
                "method": request.method if request else "unknown",
                "view": view.__class__.__name__ if view else "unknown",
                "exception_type": type(exc).__name__,
                "exception_msg": str(exc),
            },
            exc_info=True,
        )

        if hasattr(settings, "SENTRY_DSN") and settings.SENTRY_DSN:
            try:
                import sentry_sdk

                sentry_sdk.capture_exception(exc)
            except ImportError:
                pass

        if settings.DEBUG:
            try:
                from system.models import ApiRequestErrorLog

                ApiRequestErrorLog.objects.create(
                    usuario_id=getattr(user, "pk", None),
                    path=request.path if request else None,
                    method=request.method if request else None,
                    status_code=status_code,
                    detail=str(exc),
                )
            except Exception:
                pass

    return response
