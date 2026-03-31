from rest_framework import serializers

from .models import (
    Culto,
    Escala,
    ItemSetlist,
    LogAuditoria,
    Musica,
    RegistroLogin,
    Usuario,
)


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "telefone",
            "funcao_principal",
            "nivel_acesso",
            "is_active",
        ]
        extra_kwargs = {"password": {"write_only": True, "required": False}}

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Este campo e obrigatorio na criacao."},
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return Usuario.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class MusicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Musica
        fields = "__all__"


class MusicEnrichmentRequestSerializer(serializers.Serializer):
    query = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(required=False, allow_blank=True)
    artist = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not any(attrs.get(field, "").strip() for field in ["query", "title", "artist"]):
            raise serializers.ValidationError(
                "Informe ao menos titulo, artista ou consulta livre para buscar metadados.",
            )
        return attrs


class CultoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Culto
        fields = "__all__"


class EscalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escala
        fields = "__all__"


class ItemSetlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemSetlist
        fields = "__all__"


class RegistroLoginSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.username", read_only=True)
    first_name = serializers.CharField(source="usuario.first_name", read_only=True)

    class Meta:
        model = RegistroLogin
        fields = ["id", "usuario", "usuario_nome", "first_name", "data_hora", "ip_address"]


class LogAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.first_name", read_only=True)

    class Meta:
        model = LogAuditoria
        fields = ["id", "usuario", "usuario_nome", "acao", "modelo_afetado", "descricao", "data_hora"]
