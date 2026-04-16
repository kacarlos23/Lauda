from django.db import migrations


def _map_nivel_acesso_to_papel(nivel_acesso):
    return {
        1: "ADMINISTRADOR_MINISTERIO",
        2: "LIDER_MINISTERIO",
        3: "MEMBRO",
    }.get(nivel_acesso, "MEMBRO")


def migrate_ministerio_to_vinculo(apps, schema_editor):
    VinculoMinisterioUsuario = apps.get_model("api", "VinculoMinisterioUsuario")
    db_alias = schema_editor.connection.alias

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, ministerio_id, nivel_acesso
            FROM api_usuario
            WHERE ministerio_id IS NOT NULL
            """
        )
        usuarios_com_ministerio = cursor.fetchall()

    for usuario_id, ministerio_id, nivel_acesso in usuarios_com_ministerio:
        VinculoMinisterioUsuario.objects.using(db_alias).filter(usuario_id=usuario_id).update(is_primary=False)

        vinculo, created = VinculoMinisterioUsuario.objects.using(db_alias).get_or_create(
            usuario_id=usuario_id,
            ministerio_id=ministerio_id,
            defaults={
                "is_primary": True,
                "is_active": True,
                "papel_no_ministerio": _map_nivel_acesso_to_papel(nivel_acesso),
            },
        )

        if not created:
            update_fields = []
            if vinculo.papel_no_ministerio != _map_nivel_acesso_to_papel(nivel_acesso):
                vinculo.papel_no_ministerio = _map_nivel_acesso_to_papel(nivel_acesso)
                update_fields.append("papel_no_ministerio")
            if not vinculo.is_active:
                vinculo.is_active = True
                update_fields.append("is_active")
            if not vinculo.is_primary:
                vinculo.is_primary = True
                update_fields.append("is_primary")
            if update_fields:
                update_fields.append("updated_at")
                vinculo.save(using=db_alias, update_fields=update_fields)


def reverse_migrate(apps, schema_editor):
    VinculoMinisterioUsuario = apps.get_model("api", "VinculoMinisterioUsuario")
    db_alias = schema_editor.connection.alias

    vinculos = (
        VinculoMinisterioUsuario.objects.using(db_alias)
        .filter(is_primary=True, is_active=True)
        .order_by("usuario_id", "-joined_at", "-id")
        .values_list("usuario_id", "ministerio_id")
    )

    updates = []
    seen_users = set()
    for usuario_id, ministerio_id in vinculos:
        if usuario_id in seen_users:
            continue
        seen_users.add(usuario_id)
        updates.append((ministerio_id, usuario_id))

    if not updates:
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.executemany(
            """
            UPDATE api_usuario
            SET ministerio_id = %s
            WHERE id = %s AND ministerio_id IS NULL
            """,
            updates,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_migrate_usuario_to_accounts"),
        ("api", "0023_remove_usuario_api_usuario_ministe_c17344_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(migrate_ministerio_to_vinculo, reverse_migrate),
    ]
