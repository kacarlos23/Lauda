from django.db import migrations, models
import django.db.models.deletion

import api.models


def make_music_catalog_global(apps, schema_editor):
    Musica = apps.get_model("api", "Musica")
    Musica.objects.exclude(ministerio__isnull=True).update(ministerio=None)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_culto_optional_fields_and_musica_duracao"),
    ]

    operations = [
        migrations.AddField(
            model_name="ministerio",
            name="access_code",
            field=models.CharField(default=api.models.generate_access_code, max_length=20, unique=True),
        ),
        migrations.AlterField(
            model_name="musica",
            name="ministerio",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="musicas", to="api.ministerio"),
        ),
        migrations.RunPython(make_music_catalog_global, migrations.RunPython.noop),
    ]
