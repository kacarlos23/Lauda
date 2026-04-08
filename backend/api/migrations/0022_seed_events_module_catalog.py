from django.db import migrations


def seed_events_module_catalog(apps, schema_editor):
    Modulo = apps.get_model("api", "Modulo")

    events_module, created = Modulo.objects.get_or_create(
        chave="events",
        defaults={
            "nome": "Eventos",
            "descricao": "Proximo modulo prioritario para agenda institucional e eventos da igreja.",
            "is_active": False,
            "configuracoes": {},
        },
    )

    if created:
        return

    updated_fields = []
    if events_module.nome != "Eventos":
        events_module.nome = "Eventos"
        updated_fields.append("nome")
    if (
        events_module.descricao
        != "Proximo modulo prioritario para agenda institucional e eventos da igreja."
    ):
        events_module.descricao = (
            "Proximo modulo prioritario para agenda institucional e eventos da igreja."
        )
        updated_fields.append("descricao")
    if events_module.is_active:
        events_module.is_active = False
        updated_fields.append("is_active")

    if updated_fields:
        updated_fields.append("updated_at")
        events_module.save(update_fields=updated_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0021_apirequesterrorlog_alter_evento_options_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_events_module_catalog, migrations.RunPython.noop),
    ]
