import re
from django.contrib.auth import authenticate

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .constants import (
    MUSIC_CLASSIFICATION_MAP,
    MUSIC_CLASSIFICATION_SET,
    USER_FUNCTION_OPTIONS,
    USER_FUNCTION_SET,
)
from .models import (
    ConviteMinisterio,
    Culto,
    Escala,
    Igreja,
    ItemSetlist,
    LogAuditoria,
    Ministerio,
    Musica,
    RegistroLogin,
    Team,
    Usuario,
    VinculoIgrejaUsuario,
    VinculoMinisterioUsuario,
)
from .services.institutional_context import (
    get_user_igreja_membership,
    get_user_ministerio_membership,
    sync_user_memberships,
)


class IgrejaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Igreja
        fields = [
            "id",
            "nome",
            "slug",
            "logo_url",
            "configuracoes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class VinculoIgrejaUsuarioSerializer(serializers.ModelSerializer):
    igreja_id = serializers.IntegerField(source="igreja.id", read_only=True)
    igreja_nome = serializers.CharField(source="igreja.nome", read_only=True)
    igreja_slug = serializers.CharField(source="igreja.slug", read_only=True)

    class Meta:
        model = VinculoIgrejaUsuario
        fields = [
            "id",
            "igreja_id",
            "igreja_nome",
            "igreja_slug",
            "papel_institucional",
            "is_active",
            "joined_at",
        ]


class VinculoMinisterioUsuarioSerializer(serializers.ModelSerializer):
    ministerio_id = serializers.IntegerField(source="ministerio.id", read_only=True)
    ministerio_nome = serializers.CharField(source="ministerio.nome", read_only=True)
    ministerio_slug = serializers.CharField(source="ministerio.slug", read_only=True)

    class Meta:
        model = VinculoMinisterioUsuario
        fields = [
            "id",
            "ministerio_id",
            "ministerio_nome",
            "ministerio_slug",
            "papel_no_ministerio",
            "is_primary",
            "is_active",
            "joined_at",
        ]


class MinisterioSerializer(serializers.ModelSerializer):
    igreja_id = serializers.IntegerField(source="igreja.id", read_only=True)
    igreja_nome = serializers.CharField(source="igreja.nome", read_only=True)
    igreja_slug = serializers.CharField(source="igreja.slug", read_only=True)

    class Meta:
        model = Ministerio
        fields = [
            "id",
            "igreja",
            "igreja_id",
            "igreja_nome",
            "igreja_slug",
            "nome",
            "slug",
            "access_code",
            "logo_url",
            "is_open",
            "configuracoes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class MinisterioInvitePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ministerio
        fields = ["id", "nome", "slug"]


class UsuarioSerializer(serializers.ModelSerializer):
    ministerio_nome = serializers.CharField(source="ministerio.nome", read_only=True)
    ministerio_slug = serializers.CharField(source="ministerio.slug", read_only=True)
    nivel_acesso_label = serializers.CharField(source="get_nivel_acesso_display", read_only=True)
    escopo_acesso = serializers.SerializerMethodField()
    papel_display = serializers.SerializerMethodField()
    igreja_vinculo = serializers.SerializerMethodField()
    ministerio_vinculo_principal = serializers.SerializerMethodField()
    funcoes = serializers.ListField(
        child=serializers.ChoiceField(choices=USER_FUNCTION_OPTIONS),
        required=False,
    )

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
            "ministerio_slug",
            "igreja_vinculo",
            "ministerio_vinculo_principal",
            "funcao_principal",
            "funcoes",
            "nivel_acesso",
            "nivel_acesso_label",
            "escopo_acesso",
            "papel_display",
            "is_global_admin",
            "is_active",
        ]
        extra_kwargs = {
            "password": {"write_only": True, "required": False},
            "funcao_principal": {"required": False, "allow_blank": True},
        }

    def get_escopo_acesso(self, obj):
        return "GLOBAL" if obj.is_global_admin or obj.is_superuser else "MINISTERIO"

    def get_papel_display(self, obj):
        if obj.is_global_admin or obj.is_superuser:
            return "Admin Global"
        return obj.get_nivel_acesso_display()

    def get_igreja_vinculo(self, obj):
        membership = get_user_igreja_membership(obj)
        if membership is None:
            return None
        return VinculoIgrejaUsuarioSerializer(membership).data

    def get_ministerio_vinculo_principal(self, obj):
        membership = get_user_ministerio_membership(obj)
        if membership is None:
            return None
        return VinculoMinisterioUsuarioSerializer(membership).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["funcoes"] = instance.get_normalized_funcoes()
        data["funcao_principal"] = instance.funcao_principal or ""
        return data

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Este campo e obrigatorio na criacao."},
            )

        requested_funcoes = attrs.get("funcoes")
        legacy_funcao = attrs.get("funcao_principal")

        if requested_funcoes is None:
            requested_funcoes = list(getattr(self.instance, "funcoes", []) or [])

        normalized_funcoes = []
        for value in requested_funcoes:
            if value not in USER_FUNCTION_SET:
                raise serializers.ValidationError({"funcoes": "Funcao invalida informada."})
            if value not in normalized_funcoes:
                normalized_funcoes.append(value)

        if legacy_funcao:
            cleaned_legacy = legacy_funcao.strip()
            if cleaned_legacy not in USER_FUNCTION_SET:
                raise serializers.ValidationError({"funcao_principal": "Funcao principal invalida."})
            if cleaned_legacy not in normalized_funcoes:
                normalized_funcoes.insert(0, cleaned_legacy)

        attrs["funcoes"] = normalized_funcoes
        attrs["funcao_principal"] = normalized_funcoes[0] if normalized_funcoes else ""
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Usuario.objects.create_user(password=password, **validated_data)
        sync_user_memberships(user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        sync_user_memberships(user)
        return user


class MusicaSerializer(serializers.ModelSerializer):
    duracao = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    classificacao_meta = serializers.SerializerMethodField()

    class Meta:
        model = Musica
        fields = "__all__"

    def to_internal_value(self, data):
        mutable_data = data.copy()
        if mutable_data.get("duracao", None) == "":
            mutable_data["duracao"] = None
        return super().to_internal_value(mutable_data)

    def validate_duracao(self, value):
        if value is None:
            return None
        normalized = value.strip()
        if normalized and not re.fullmatch(r"\d{2}:\d{2}", normalized):
            raise serializers.ValidationError("Use o formato mm:ss.")
        if normalized and int(normalized.split(":")[1]) > 59:
            raise serializers.ValidationError("Use o formato mm:ss.")
        return normalized or None

    def validate_classificacao(self, value):
        if value in (None, ""):
            return None
        if value not in MUSIC_CLASSIFICATION_SET:
            raise serializers.ValidationError("Classificacao invalida.")
        return value

    def get_classificacao_meta(self, obj):
        if not obj.classificacao:
            return None
        return MUSIC_CLASSIFICATION_MAP.get(obj.classificacao)


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
    horario_termino = serializers.TimeField(required=False, allow_null=True)
    local = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Culto
        fields = "__all__"

    def to_internal_value(self, data):
        mutable_data = data.copy()
        if mutable_data.get("horario_termino", None) == "":
            mutable_data["horario_termino"] = None
        if mutable_data.get("local", None) == "":
            mutable_data["local"] = None
        return super().to_internal_value(mutable_data)

    def validate_local(self, value):
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class EscalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escala
        fields = "__all__"


class ItemSetlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemSetlist
        fields = "__all__"


class TeamSerializer(serializers.ModelSerializer):
    ministerio_id = serializers.IntegerField(source="ministerio.id", read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "ministerio", "ministerio_id", "created_at"]
        read_only_fields = ["id", "created_at", "ministerio", "ministerio_id"]


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
    nivel_acesso_label = serializers.CharField(source="get_nivel_acesso_display", read_only=True)

    class Meta:
        model = ConviteMinisterio
        fields = [
            "id",
            "ministerio",
            "ministerio_id",
            "email",
            "nome_convidado",
            "nivel_acesso",
            "nivel_acesso_label",
            "token",
            "access_code",
            "status",
            "max_uses",
            "uses_count",
            "expires_at",
            "is_active",
        ]


class ConviteMinisterioPublicSerializer(serializers.ModelSerializer):
    ministerio = MinisterioInvitePublicSerializer(read_only=True)
    nivel_acesso_label = serializers.CharField(source="get_nivel_acesso_display", read_only=True)
    code_source = serializers.SerializerMethodField()

    class Meta:
        model = ConviteMinisterio
        fields = [
            "id",
            "ministerio",
            "email",
            "nome_convidado",
            "nivel_acesso",
            "nivel_acesso_label",
            "code_source",
            "expires_at",
        ]

    def get_code_source(self, obj):
        return "CONVITE"


class MinisterioAccessCodePublicSerializer(serializers.ModelSerializer):
    ministerio = serializers.SerializerMethodField()
    nivel_acesso = serializers.SerializerMethodField()
    nivel_acesso_label = serializers.SerializerMethodField()
    code_source = serializers.SerializerMethodField()
    expires_at = serializers.SerializerMethodField()

    class Meta:
        model = Ministerio
        fields = [
            "id",
            "ministerio",
            "nivel_acesso",
            "nivel_acesso_label",
            "code_source",
            "expires_at",
        ]

    def get_ministerio(self, obj):
        return MinisterioInvitePublicSerializer(obj).data

    def get_nivel_acesso(self, obj):
        return 3

    def get_nivel_acesso_label(self, obj):
        return "Membro"

    def get_code_source(self, obj):
        return "MINISTERIO"

    def get_expires_at(self, obj):
        return None


class ConviteAcceptSerializer(serializers.Serializer):
    code = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField()
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    telefone = serializers.CharField(required=False, allow_blank=True)
    funcao_principal = serializers.ChoiceField(
        choices=USER_FUNCTION_OPTIONS,
        required=False,
        allow_blank=True,
    )
    funcoes = serializers.ListField(
        child=serializers.ChoiceField(choices=USER_FUNCTION_OPTIONS),
        required=False,
    )

    def validate_code(self, value):
        normalized_value = value.strip()
        target = ConviteMinisterio.objects.select_related("ministerio").filter(token=normalized_value).first()
        code_source = "CONVITE"
        if target is None:
            target = ConviteMinisterio.objects.select_related("ministerio").filter(access_code=normalized_value.upper()).first()

        if target is None:
            target = Ministerio.objects.filter(access_code=normalized_value.upper(), is_active=True).first()
            code_source = "MINISTERIO"

        if target is None:
            raise serializers.ValidationError("Convite nao encontrado.")

        if code_source == "MINISTERIO" and not target.is_open:
            raise serializers.ValidationError("As portas deste ministerio estao fechadas para entrada por codigo fixo.")

        if code_source == "CONVITE" and not target.can_be_used():
            raise serializers.ValidationError("Convite expirado, revogado ou sem usos disponiveis.")

        return {"code_source": code_source, "target": target}

    def validate(self, attrs):
        code_info = attrs["code"]
        code_source = code_info["code_source"]
        target = code_info["target"]
        ministry = target.ministerio if code_source == "CONVITE" else target
        username = attrs["username"].strip()
        email = attrs.get("email", "").strip()
        user_model = get_user_model()
        existing_user = user_model.objects.filter(username=username).first()

        if existing_user and existing_user.is_global_admin:
            raise serializers.ValidationError({"username": "Este usuario e um admin global e nao pode aceitar convite de ministerio."})

        if existing_user and existing_user.ministerio_id and existing_user.ministerio_id != ministry.id:
            raise serializers.ValidationError({"username": "Este usuario ja pertence a outro ministerio."})

        if code_source == "CONVITE" and target.email and email and target.email.lower() != email.lower():
            raise serializers.ValidationError({"email": "Este convite foi emitido para outro email."})

        if code_source == "CONVITE" and target.email and not email:
            attrs["email"] = target.email

        funcoes = attrs.get("funcoes") or []
        funcao_principal = attrs.get("funcao_principal", "").strip()
        if funcao_principal and funcao_principal not in funcoes:
            funcoes.insert(0, funcao_principal)

        attrs["code"] = target
        attrs["code_source"] = code_source
        attrs["username"] = username
        attrs["existing_user"] = existing_user
        attrs["funcoes"] = funcoes
        attrs["funcao_principal"] = funcoes[0] if funcoes else ""
        return attrs


class MemberLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    default_error_messages = {
        "missing_identifier": "Informe um e-mail valido para entrar.",
        "not_found": "Credenciais invalidas.",
        "duplicate_email": "Existe mais de uma conta com este e-mail. Contate o administrador.",
        "invalid_password": "Credenciais invalidas.",
        "global_admin": "Use a rota de login admin para administradores globais.",
        "inactive": "Esta conta esta inativa.",
    }

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        username = attrs.get("username", "").strip()
        password = attrs["password"]
        user_model = get_user_model()

        if not email and not username:
            raise serializers.ValidationError({"email": self.error_messages["missing_identifier"]})

        if email:
            matching_users = list(user_model.objects.filter(email__iexact=email))
            if not matching_users:
                raise serializers.ValidationError({"email": self.error_messages["not_found"]})
            if len(matching_users) > 1:
                raise serializers.ValidationError({"email": self.error_messages["duplicate_email"]})
            user = matching_users[0]
        else:
            user = user_model.objects.filter(username=username).first()
            if user is None:
                raise serializers.ValidationError({"username": self.error_messages["not_found"]})

        authenticated_user = authenticate(username=user.username, password=password)
        if authenticated_user is None:
            raise serializers.ValidationError({"password": self.error_messages["invalid_password"]})

        if authenticated_user.is_global_admin or authenticated_user.is_superuser:
            raise serializers.ValidationError({"email": self.error_messages["global_admin"]})
        if not authenticated_user.is_active:
            raise serializers.ValidationError({"email": self.error_messages["inactive"]})

        attrs["user"] = authenticated_user
        return attrs


class AccessCodeBindSerializer(serializers.Serializer):
    code = serializers.CharField()

    def validate_code(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("Informe um codigo de acesso valido.")

        target = ConviteMinisterio.objects.select_related("ministerio").filter(token=normalized).first()
        code_source = "CONVITE"
        if target is None:
            target = ConviteMinisterio.objects.select_related("ministerio").filter(access_code=normalized.upper()).first()

        if target is None:
            target = Ministerio.objects.filter(access_code=normalized.upper(), is_active=True).first()
            code_source = "MINISTERIO"

        if target is None:
            raise serializers.ValidationError("Codigo de acesso invalido.")

        if code_source == "MINISTERIO" and not target.is_open:
            raise serializers.ValidationError("As portas deste ministerio estao fechadas para entrada por codigo fixo.")

        if code_source == "CONVITE" and not target.can_be_used():
            raise serializers.ValidationError("Convite expirado, revogado ou sem usos disponiveis.")

        return {
            "raw": normalized,
            "code_source": code_source,
            "target": target,
        }

    def validate(self, attrs):
        user = self.context["request"].user
        if user.is_global_admin or user.is_superuser:
            raise serializers.ValidationError({"code": "Admins globais nao podem usar codigos de ministerio."})

        code_info = attrs["code"]
        code_source = code_info["code_source"]
        target = code_info["target"]
        ministry = target.ministerio if code_source == "CONVITE" else target

        if user.ministerio_id and user.ministerio_id != ministry.id:
            raise serializers.ValidationError({"code": "Sua conta ja esta vinculada a outro ministerio."})

        if code_source == "CONVITE" and target.email and user.email and target.email.lower() != user.email.lower():
            raise serializers.ValidationError({"code": "Este convite foi emitido para outro e-mail."})

        attrs["code"] = target
        attrs["code_source"] = code_source
        attrs["ministerio"] = ministry
        return attrs
