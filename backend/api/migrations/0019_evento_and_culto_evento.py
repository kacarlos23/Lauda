from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0018_seed_music_module_and_backfill_igreja_modulos"),
    ]

    operations = [
        migrations.CreateModel(
            name="Evento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(max_length=150)),
                ("descricao", models.TextField(blank=True, null=True)),
                ("data", models.DateField()),
                ("horario_inicio", models.TimeField()),
                ("horario_termino", models.TimeField(blank=True, null=True)),
                ("local", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("AGENDADO", "Agendado"), ("REALIZADO", "Realizado"), ("CANCELADO", "Cancelado")],
                        default="AGENDADO",
                        max_length=20,
                    ),
                ),
                ("source_module", models.SlugField(blank=True, null=True)),
                ("source_type", models.CharField(blank=True, max_length=50, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "igreja",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="eventos",
                        to="api.igreja",
                    ),
                ),
                (
                    "ministerio",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="eventos",
                        to="api.ministerio",
                    ),
                ),
            ],
            options={
                "verbose_name": "Evento",
                "verbose_name_plural": "Eventos",
                "ordering": ["data", "horario_inicio", "nome"],
            },
        ),
        migrations.AddField(
            model_name="culto",
            name="evento",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="culto_musical",
                to="api.evento",
            ),
        ),
    ]
