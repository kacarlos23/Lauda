import logging

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from system.models import LogAuditoria

logger = logging.getLogger("api.audit")


def registrar_log(
    usuario,
    acao,
    modelo_afetado,
    descricao,
    instance=None,
    instance_id=None,
    ministerio=None,
    igreja=None,
    escopo=None,
    metadata=None,
    modulo=None,
):
    """
    Registra uma acao de auditoria no banco e emite log estruturado.
    Nunca interrompe a transacao principal por falha de observabilidade.
    """

    try:
        from system.governance import derive_audit_context

        audit_context = derive_audit_context(
            user=usuario,
            instance=instance,
            modulo=modulo,
            igreja=igreja,
            ministerio=ministerio,
            modelo=modelo_afetado,
        )

        content_type = None
        resolved_instance_id = instance_id
        if instance is not None and getattr(instance, "pk", None) is not None:
            content_type = ContentType.objects.get_for_model(instance, for_concrete_model=False)
            resolved_instance_id = resolved_instance_id or instance.pk

        log_entry = LogAuditoria.objects.create(
            usuario=usuario if getattr(usuario, "pk", None) else None,
            acao=acao,
            modelo_afetado=modelo_afetado,
            descricao=descricao,
            instance_content_type=content_type,
            instance_id=resolved_instance_id,
            ministerio=ministerio or audit_context["ministerio"],
            igreja=igreja or audit_context["igreja"],
            escopo=escopo or audit_context["escopo"],
            modulo=modulo or audit_context["modulo"],
            metadata=metadata or {},
            data_hora=timezone.now(),
        )

        logger.info(
            "AUDIT_EVENT",
            extra={
                "user_id": getattr(usuario, "pk", None),
                "action": acao,
                "model": modelo_afetado,
                "description": descricao,
                "instance_id": resolved_instance_id,
            },
        )
        return log_entry
    except Exception as exc:  # pragma: no cover
        logger.error("Falha ao registrar auditoria: %s", exc, exc_info=True)
        return None
