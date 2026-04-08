from api.models import ApiRequestErrorLog
from api.services.access_context import resolve_scoped_ministry
from api.services.institutional_context import get_user_igreja, get_user_ministerio


def _extract_error_detail(data):
    if data is None:
        return None, None

    if isinstance(data, dict):
        error_code = data.get("code") or data.get("error_code")
        detail = data.get("detail")
        if detail is None:
            detail = str(data)
        return error_code, str(detail)[:500]

    if isinstance(data, list):
        return None, str(data)[:500]

    return None, str(data)[:500]


def capture_api_error(request, response, view=None):
    if request is None or response is None:
        return

    user = getattr(request, "user", None)
    token = getattr(request, "auth", None)
    if user and getattr(user, "is_authenticated", False):
        ministerio = resolve_scoped_ministry(user, token) or get_user_ministerio(user)
        igreja = get_user_igreja(user, ministerio=ministerio)
        usuario = user
    else:
        ministerio = None
        igreja = None
        usuario = None

    modulo = getattr(view, "authorization_module", None) if view is not None else None
    error_code, detail = _extract_error_detail(getattr(response, "data", None))

    ApiRequestErrorLog.objects.create(
        usuario=usuario,
        igreja=igreja,
        ministerio=ministerio,
        modulo=modulo,
        method=request.method,
        path=request.path[:255],
        status_code=int(response.status_code),
        error_code=error_code,
        detail=detail,
    )
