from django.db import migrations


def seed_music_module_and_backfill_igreja_modulos(apps, schema_editor):
    Igreja = apps.get_model("api", "Igreja")
    Modulo = apps.get_model("api", "Modulo")
    IgrejaModulo = apps.get_model("api", "IgrejaModulo")

    music_module, _ = Modulo.objects.get_or_create(
        chave="music",
        defaults={
            "nome": "Musica",
            "descricao": "Modulo oficial de musica e louvor do Lauda.",
            "is_active": True,
            "configuracoes": {},
        },
    )

    updated_fields = []
    if not music_module.nome:
        music_module.nome = "Musica"
        updated_fields.append("nome")
    if music_module.is_active is False:
        music_module.is_active = True
        updated_fields.append("is_active")
    if music_module.descricao in (None, ""):
        music_module.descricao = "Modulo oficial de musica e louvor do Lauda."
        updated_fields.append("descricao")
    if music_module.configuracoes is None:
        music_module.configuracoes = {}
        updated_fields.append("configuracoes")
    if updated_fields:
        music_module.save(update_fields=updated_fields + ["updated_at"])

    for igreja in Igreja.objects.all():
        igreja_modulo, _ = IgrejaModulo.objects.get_or_create(
            igreja=igreja,
            modulo=music_module,
            defaults={
                "is_enabled": True,
                "configuracoes": {},
            },
        )
        if igreja_modulo.is_enabled is False:
            igreja_modulo.is_enabled = True
            igreja_modulo.save(update_fields=["is_enabled", "updated_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_modulo_igrejamodulo"),
    ]

    operations = [
        migrations.RunPython(
            seed_music_module_and_backfill_igreja_modulos,
            migrations.RunPython.noop,
        ),
    ]
