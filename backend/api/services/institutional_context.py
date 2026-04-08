from api.models import VinculoIgrejaUsuario, VinculoMinisterioUsuario


DEFAULT_INSTITUTIONAL_ROLE = "MEMBRO"
DEFAULT_MINISTRY_ROLE = "MEMBRO"


def get_user_igreja_membership(user):
    if not user or not getattr(user, "pk", None):
        return None

    queryset = VinculoIgrejaUsuario.objects.select_related("igreja").filter(usuario=user)
    membership = queryset.filter(is_active=True).order_by("-joined_at", "-id").first()
    return membership or queryset.order_by("-joined_at", "-id").first()


def get_user_ministerio_membership(user):
    if not user or not getattr(user, "pk", None):
        return None

    queryset = VinculoMinisterioUsuario.objects.select_related(
        "ministerio",
        "ministerio__igreja",
    ).filter(usuario=user)

    attempts = (
        {"is_active": True, "is_primary": True},
        {"is_active": True},
        {"is_primary": True},
        {},
    )
    for filters in attempts:
        membership = queryset.filter(**filters).order_by("-is_primary", "-joined_at", "-id").first()
        if membership is not None:
            return membership
    return None


def get_user_ministerio(user):
    membership = get_user_ministerio_membership(user)
    if membership and membership.ministerio_id:
        return membership.ministerio
    return getattr(user, "ministerio", None)


def get_user_igreja(user, ministerio=None):
    igreja_membership = get_user_igreja_membership(user)
    if igreja_membership and igreja_membership.igreja_id:
        return igreja_membership.igreja

    ministerio_membership = get_user_ministerio_membership(user)
    if ministerio_membership and ministerio_membership.ministerio_id:
        return getattr(ministerio_membership.ministerio, "igreja", None)

    effective_ministerio = ministerio if ministerio is not None else getattr(user, "ministerio", None)
    if effective_ministerio is None:
        return None
    return getattr(effective_ministerio, "igreja", None)


def has_user_institutional_membership(user):
    return bool(get_user_igreja_membership(user) or get_user_ministerio_membership(user))


def sync_user_igreja_membership(user, igreja, papel_institucional=DEFAULT_INSTITUTIONAL_ROLE):
    if not user or not getattr(user, "pk", None) or igreja is None:
        return None

    membership, created = VinculoIgrejaUsuario.objects.get_or_create(
        usuario=user,
        igreja=igreja,
        defaults={
            "papel_institucional": papel_institucional,
            "is_active": True,
        },
    )

    update_fields = []
    if created:
        return membership
    if membership.papel_institucional != papel_institucional:
        membership.papel_institucional = papel_institucional
        update_fields.append("papel_institucional")
    if not membership.is_active:
        membership.is_active = True
        update_fields.append("is_active")
    if update_fields:
        update_fields.append("updated_at")
        membership.save(update_fields=update_fields)
    return membership


def sync_user_ministerio_membership(
    user,
    ministerio,
    papel_no_ministerio=DEFAULT_MINISTRY_ROLE,
    is_primary=True,
):
    if not user or not getattr(user, "pk", None) or ministerio is None:
        return None

    membership, created = VinculoMinisterioUsuario.objects.get_or_create(
        usuario=user,
        ministerio=ministerio,
        defaults={
            "papel_no_ministerio": papel_no_ministerio,
            "is_primary": is_primary,
            "is_active": True,
        },
    )

    update_fields = []
    if membership.papel_no_ministerio != papel_no_ministerio:
        membership.papel_no_ministerio = papel_no_ministerio
        update_fields.append("papel_no_ministerio")
    if not membership.is_active:
        membership.is_active = True
        update_fields.append("is_active")
    if membership.is_primary != is_primary:
        membership.is_primary = is_primary
        update_fields.append("is_primary")
    if update_fields:
        update_fields.append("updated_at")
        membership.save(update_fields=update_fields)

    if is_primary:
        VinculoMinisterioUsuario.objects.filter(usuario=user).exclude(id=membership.id).update(is_primary=False)

    return membership


def sync_user_memberships(user):
    ministerio = getattr(user, "ministerio", None)
    if ministerio is None or getattr(user, "is_global_admin", False) or getattr(user, "is_superuser", False):
        return {
            "igreja_membership": get_user_igreja_membership(user),
            "ministerio_membership": get_user_ministerio_membership(user),
        }

    igreja = getattr(ministerio, "igreja", None)
    igreja_membership = sync_user_igreja_membership(user, igreja) if igreja is not None else None
    ministerio_membership = sync_user_ministerio_membership(user, ministerio, is_primary=True)
    return {
        "igreja_membership": igreja_membership,
        "ministerio_membership": ministerio_membership,
    }
