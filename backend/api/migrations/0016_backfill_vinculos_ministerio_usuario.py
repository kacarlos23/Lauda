from django.db import migrations
from django.utils import timezone


def backfill_vinculos_ministerio_usuario(apps, schema_editor):
    Usuario = apps.get_model("api", "Usuario")
    VinculoMinisterioUsuario = apps.get_model("api", "VinculoMinisterioUsuario")

    queryset = Usuario.objects.select_related("ministerio").filter(ministerio__isnull=False)

    for usuario in queryset.iterator():
        vinculo, created = VinculoMinisterioUsuario.objects.get_or_create(
            usuario_id=usuario.id,
            ministerio_id=usuario.ministerio_id,
            defaults={
                "papel_no_ministerio": "MEMBRO",
                "is_primary": True,
                "is_active": True,
                "joined_at": timezone.now(),
            },
        )
        update_fields = []
        if not vinculo.is_active:
            vinculo.is_active = True
            update_fields.append("is_active")
        if not vinculo.is_primary:
            vinculo.is_primary = True
            update_fields.append("is_primary")
        if vinculo.papel_no_ministerio != "MEMBRO":
            vinculo.papel_no_ministerio = "MEMBRO"
            update_fields.append("papel_no_ministerio")
        if update_fields:
            update_fields.append("updated_at")
            vinculo.save(update_fields=update_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0015_backfill_vinculos_igreja_usuario"),
    ]

    operations = [
        migrations.RunPython(backfill_vinculos_ministerio_usuario, migrations.RunPython.noop),
    ]
