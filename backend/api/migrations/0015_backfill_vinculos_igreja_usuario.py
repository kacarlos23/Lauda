from django.db import migrations
from django.utils import timezone


def backfill_vinculos_igreja_usuario(apps, schema_editor):
    Usuario = apps.get_model("api", "Usuario")
    VinculoIgrejaUsuario = apps.get_model("api", "VinculoIgrejaUsuario")

    queryset = Usuario.objects.select_related("ministerio", "ministerio__igreja").filter(
        ministerio__isnull=False,
        ministerio__igreja__isnull=False,
    )

    for usuario in queryset.iterator():
        vinculo, created = VinculoIgrejaUsuario.objects.get_or_create(
            usuario_id=usuario.id,
            igreja_id=usuario.ministerio.igreja_id,
            defaults={
                "papel_institucional": "MEMBRO",
                "is_active": True,
                "joined_at": timezone.now(),
            },
        )
        if created:
            continue
        update_fields = []
        if not vinculo.is_active:
            vinculo.is_active = True
            update_fields.append("is_active")
        if vinculo.papel_institucional != "MEMBRO":
            vinculo.papel_institucional = "MEMBRO"
            update_fields.append("papel_institucional")
        if update_fields:
            update_fields.append("updated_at")
            vinculo.save(update_fields=update_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0014_vinculoigrejausuario_vinculoministeriousuario"),
    ]

    operations = [
        migrations.RunPython(backfill_vinculos_igreja_usuario, migrations.RunPython.noop),
    ]
