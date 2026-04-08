from rest_framework.views import exception_handler as drf_exception_handler

from api.services.observability import capture_api_error


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
        request = context.get("request")
        view = context.get("view")
        if request is not None and getattr(request, "path", "").startswith("/api/") and response.status_code >= 400:
            try:
                capture_api_error(request, response, view=view)
            except Exception:
                pass

    return response
