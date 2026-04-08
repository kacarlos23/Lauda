from django.db import migrations


def backfill_eventos_from_cultos(apps, schema_editor):
    Culto = apps.get_model("api", "Culto")
    Evento = apps.get_model("api", "Evento")

    for culto in Culto.objects.select_related("ministerio", "ministerio__igreja").all():
        ministerio = getattr(culto, "ministerio", None)
        igreja = getattr(ministerio, "igreja", None)
        if igreja is None:
            continue

        evento = getattr(culto, "evento", None)
        if evento is None:
            evento = Evento.objects.create(
                igreja=igreja,
                ministerio=ministerio,
                nome=culto.nome,
                descricao="Evento base gerado a partir do legado de cultos.",
                data=culto.data,
                horario_inicio=culto.horario_inicio,
                horario_termino=culto.horario_termino,
                local=culto.local,
                status=culto.status,
                source_module="music",
                source_type="MUSIC_CULTO",
            )
            culto.evento_id = evento.id
            culto.save(update_fields=["evento"])
            continue

        changed = False
        for field_name, value in {
            "igreja_id": igreja.id,
            "ministerio_id": ministerio.id if ministerio else None,
            "nome": culto.nome,
            "data": culto.data,
            "horario_inicio": culto.horario_inicio,
            "horario_termino": culto.horario_termino,
            "local": culto.local,
            "status": culto.status,
            "source_module": "music",
            "source_type": "MUSIC_CULTO",
        }.items():
            if getattr(evento, field_name) != value:
                setattr(evento, field_name, value)
                changed = True

        if changed:
            evento.save()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0019_evento_and_culto_evento"),
    ]

    operations = [
        migrations.RunPython(backfill_eventos_from_cultos, migrations.RunPython.noop),
    ]
