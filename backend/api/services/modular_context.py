from .institutional_context import get_user_igreja


def get_globally_active_modules():
    from api.models import Modulo

    return Modulo.objects.filter(is_active=True).order_by("nome")


def get_globally_active_module_keys():
    return list(get_globally_active_modules().values_list("chave", flat=True))


def get_active_modules_for_church(igreja):
    from api.models import Modulo

    if igreja is None:
        return Modulo.objects.none()

    return (
        Modulo.objects.filter(
            is_active=True,
            igrejas_habilitadas__igreja=igreja,
            igrejas_habilitadas__is_enabled=True,
        )
        .distinct()
        .order_by("nome")
    )


def get_active_module_keys_for_church(igreja):
    if igreja is None:
        return []
    return list(get_active_modules_for_church(igreja).values_list("chave", flat=True))


def get_active_module_keys_for_user(user, igreja=None, ministerio=None):
    resolved_igreja = igreja or get_user_igreja(user, ministerio=ministerio)
    if resolved_igreja is not None:
        return get_active_module_keys_for_church(resolved_igreja)
    return get_globally_active_module_keys()


def church_has_active_module(igreja, module_key):
    if igreja is None or not module_key:
        return False
    return get_active_modules_for_church(igreja).filter(chave=module_key).exists()
