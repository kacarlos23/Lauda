import logging

from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from accounts.models import Usuario
from institutions.models import VinculoMinisterioUsuario
from system.models import UserPermissionGrant

logger = logging.getLogger("api.security")


def blacklist_user_tokens(user):
    """Bloqueia todos os refresh tokens ativos do usuario, forçando re-login."""
    if not user or getattr(user, "is_anonymous", False) or not user.pk:
        return

    try:
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception:
        logger.warning("Falha ao invalidar tokens de %s", user.pk, exc_info=True)


@receiver(pre_save, sender=Usuario)
def track_user_critical_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._critical_state_before_save = None
        return

    instance._critical_state_before_save = sender.objects.filter(pk=instance.pk).values(
        "is_global_admin",
        "nivel_acesso",
        "is_active",
    ).first()


@receiver(post_save, sender=Usuario)
def invalidate_on_user_change(sender, instance, created, update_fields=None, **kwargs):
    if created:
        return

    critical = {"is_global_admin", "nivel_acesso", "is_active"}
    if update_fields:
        if critical.intersection(set(update_fields)):
            blacklist_user_tokens(instance)
        return

    previous = getattr(instance, "_critical_state_before_save", None)
    if previous is None:
        return

    if any(previous[field] != getattr(instance, field) for field in critical):
        blacklist_user_tokens(instance)


@receiver(pre_delete, sender=Usuario)
def invalidate_on_user_delete(sender, instance, **kwargs):
    blacklist_user_tokens(instance)


@receiver(post_save, sender=UserPermissionGrant)
def invalidate_on_grant_change(sender, instance, created, **kwargs):
    blacklist_user_tokens(instance.usuario)


@receiver(post_delete, sender=UserPermissionGrant)
def invalidate_on_grant_delete(sender, instance, **kwargs):
    blacklist_user_tokens(instance.usuario)


@receiver(post_save, sender=VinculoMinisterioUsuario)
def invalidate_on_ministry_vinculo_save(sender, instance, **kwargs):
    blacklist_user_tokens(instance.usuario)


@receiver(post_delete, sender=VinculoMinisterioUsuario)
def invalidate_on_ministry_vinculo_delete(sender, instance, **kwargs):
    blacklist_user_tokens(instance.usuario)
