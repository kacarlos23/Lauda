from rest_framework import serializers

from accounts.models import Usuario
from institutions.models import Igreja, Ministerio
from system.models import UserPermissionGrant


class UserPermissionGrantSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.username", read_only=True)
    usuario_email = serializers.CharField(source="usuario.email", read_only=True)
    igreja_nome = serializers.CharField(source="igreja.nome", read_only=True)
    ministerio_nome = serializers.CharField(source="ministerio.nome", read_only=True)
    granted_by_nome = serializers.CharField(source="granted_by.username", read_only=True)

    usuario = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all(), write_only=True)
    igreja = serializers.PrimaryKeyRelatedField(
        queryset=Igreja.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    ministerio = serializers.PrimaryKeyRelatedField(
        queryset=Ministerio.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = UserPermissionGrant
        fields = [
            "id",
            "usuario",
            "usuario_nome",
            "usuario_email",
            "permission_codename",
            "igreja",
            "igreja_nome",
            "ministerio",
            "ministerio_nome",
            "granted_by",
            "granted_by_nome",
            "granted_at",
            "is_active",
        ]
        read_only_fields = ["id", "granted_by", "granted_at", "is_active"]

    def validate(self, data):
        usuario = data.get("usuario") or getattr(self.instance, "usuario", None)
        igreja = data.get("igreja") if "igreja" in data else getattr(self.instance, "igreja", None)
        ministerio = data.get("ministerio") if "ministerio" in data else getattr(self.instance, "ministerio", None)

        if igreja is not None and ministerio is not None:
            raise serializers.ValidationError(
                {"non_field_errors": "Defina escopo por IGREJA ou MINISTERIO, nao ambos."}
            )

        if usuario is not None and (usuario.is_global_admin or usuario.is_superuser):
            raise serializers.ValidationError({"usuario": "Admins globais nao exigem permissoes granulares."})

        return data
