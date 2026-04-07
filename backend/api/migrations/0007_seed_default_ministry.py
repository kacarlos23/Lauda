# -*- coding: utf-8 -*-
from django.db import migrations


def seed_default_ministry(apps, schema_editor):
    Ministerio = apps.get_model("api", "Ministerio")
    Usuario = apps.get_model("api", "Usuario")
    Musica = apps.get_model("api", "Musica")
    Culto = apps.get_model("api", "Culto")
    Escala = apps.get_model("api", "Escala")
    ItemSetlist = apps.get_model("api", "ItemSetlist")

    default_ministry, _ = Ministerio.objects.get_or_create(
        slug="ministerio-inicial",
        defaults={"nome": "Ministerio Inicial", "configuracoes": {}},
    )

    global_admin_ids = list(
        Usuario.objects.filter(is_superuser=True).values_list("id", flat=True),
    )
    if global_admin_ids:
        Usuario.objects.filter(id__in=global_admin_ids).update(is_global_admin=True, ministerio=None)

    Usuario.objects.filter(is_global_admin=False, ministerio__isnull=True).update(ministerio=default_ministry)
    Musica.objects.filter(ministerio__isnull=True).update(ministerio=default_ministry)
    Culto.objects.filter(ministerio__isnull=True).update(ministerio=default_ministry)

    for escala in Escala.objects.select_related("culto", "membro").filter(ministerio__isnull=True):
        escala.ministerio_id = escala.culto.ministerio_id or escala.membro.ministerio_id or default_ministry.id
        escala.save(update_fields=["ministerio"])

    for item in ItemSetlist.objects.select_related("culto", "musica").filter(ministerio__isnull=True):
        item.ministerio_id = item.culto.ministerio_id or item.musica.ministerio_id or default_ministry.id
        item.save(update_fields=["ministerio"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_ministerio_usuario_invite_accepted_at_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_default_ministry, noop),
    ]
