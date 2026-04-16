from django.db import migrations


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("api", "0023_remove_usuario_api_usuario_ministe_c17344_idx_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "unique_active_ministerio_access_code "
                "ON api_ministerio (access_code) WHERE is_active"
            ),
            reverse_sql="DROP INDEX IF EXISTS unique_active_ministerio_access_code",
        ),
    ]
