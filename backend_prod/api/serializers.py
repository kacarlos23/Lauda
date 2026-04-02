from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    ConviteMinisterio,
    Culto,
    Escala,
    ItemSetlist,
    LogAuditoria,
    Ministerio,
    Musica,
    RegistroLogin,
    Usuario,
)


class MinisterioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ministerio
        fields = [
            "id",
            "nome",
            "slug",
            "configuracoes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UsuarioSerializer(serializers.ModelSerializer):
    ministerio_nome = serializers.CharField(source="ministerio.nome", read_only=True)

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
            "ministerio",
            "ministerio_nome",
            "funcao_principal",
            "nivel_acesso",
            "is_global_admin",
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


class ConviteMinisterioSerializer(serializers.ModelSerializer):
    ministerio = MinisterioSerializer(read_only=True)
    ministerio_id = serializers.PrimaryKeyRelatedField(
        source="ministerio",
        queryset=Ministerio.objects.all(),
        write_only=True,
    )

    class Meta:
        model = ConviteMinisterio
        fields = [
            "id",
            "ministerio",
            "ministerio_id",
            "email",
            "nome_convidado",
            "nivel_acesso",
            "token",
            "access_code",
            "status",
            "max_uses",
            "uses_count",
            "expires_at",
            "is_active",
        ]


class ConviteAcceptSerializer(serializers.Serializer):
    code = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField()
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    telefone = serializers.CharField(required=False, allow_blank=True)
    funcao_principal = serializers.CharField(required=False, allow_blank=True)

    def validate_code(self, value):
        normalized_value = value.strip()
        try:
            invite = ConviteMinisterio.objects.select_related("ministerio").get(
                token=normalized_value,
            )
        except ConviteMinisterio.DoesNotExist:
            try:
                invite = ConviteMinisterio.objects.select_related("ministerio").get(
                    access_code=normalized_value.upper(),
                )
            except ConviteMinisterio.DoesNotExist as exc:
                raise serializers.ValidationError("Convite nao encontrado.") from exc

        if not invite.can_be_used():
            raise serializers.ValidationError("Convite expirado, revogado ou sem usos disponiveis.")

        return invite

    def validate(self, attrs):
        invite = attrs["code"]
        username = attrs["username"].strip()
        email = attrs.get("email", "").strip()
        user_model = get_user_model()
        existing_user = user_model.objects.filter(username=username).first()

        if existing_user and existing_user.is_global_admin:
            raise serializers.ValidationError({"username": "Este usuario e um admin global e nao pode aceitar convite de ministerio."})

        if existing_user and existing_user.ministerio_id and existing_user.ministerio_id != invite.ministerio_id:
            raise serializers.ValidationError({"username": "Este usuario ja pertence a outro ministerio."})

        if invite.email and email and invite.email.lower() != email.lower():
            raise serializers.ValidationError({"email": "Este convite foi emitido para outro email."})

        if invite.email and not email:
            attrs["email"] = invite.email

        attrs["code"] = invite
        attrs["username"] = username
        attrs["existing_user"] = existing_user
        return attrs
