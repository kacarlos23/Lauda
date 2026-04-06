import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_seed_default_ministry"),
    ]

    operations = [
        migrations.AlterField(
            model_name="culto",
            name="horario_termino",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="culto",
            name="local",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="musica",
            name="duracao",
            field=models.CharField(
                blank=True,
                help_text="Duracao no formato mm:ss",
                max_length=5,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Use o formato mm:ss.",
                        regex="^\\d{2}:[0-5]\\d$",
                    ),
                ],
            ),
        ),
    ]
