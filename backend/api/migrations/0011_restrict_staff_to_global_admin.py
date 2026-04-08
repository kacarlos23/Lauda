from django.db import migrations


def restrict_staff_to_global_admin(apps, schema_editor):
    Usuario = apps.get_model("api", "Usuario")
    Usuario.objects.filter(is_superuser=True).update(is_staff=True)
    Usuario.objects.filter(is_superuser=False, is_global_admin=True).update(is_staff=True)
    Usuario.objects.filter(is_superuser=False, is_global_admin=False).update(is_staff=False)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0010_ministerio_is_open_ministerio_logo_url_and_more"),
    ]

    operations = [
        migrations.RunPython(restrict_staff_to_global_admin, migrations.RunPython.noop),
    ]
