from django.db import migrations


DEFAULT_IGREJA_NOME = "Igreja Principal"
DEFAULT_IGREJA_SLUG = "igreja-principal"


def backfill_ministerios_igreja(apps, schema_editor):
    Igreja = apps.get_model("api", "Igreja")
    Ministerio = apps.get_model("api", "Ministerio")

    igreja = Igreja.objects.filter(slug=DEFAULT_IGREJA_SLUG).first()
    if igreja is None:
        igreja = Igreja.objects.filter(nome=DEFAULT_IGREJA_NOME).first()

    if igreja is None:
        igreja = Igreja.objects.create(
            nome=DEFAULT_IGREJA_NOME,
            slug=DEFAULT_IGREJA_SLUG,
            configuracoes={},
            is_active=True,
        )

    Ministerio.objects.filter(igreja__isnull=True).update(igreja=igreja)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_igreja_ministerio_igreja"),
    ]

    operations = [
        migrations.RunPython(backfill_ministerios_igreja, migrations.RunPython.noop),
    ]
