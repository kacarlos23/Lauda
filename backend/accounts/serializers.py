from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from accounts.models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "telefone",
            "funcoes",
            "funcao_principal",
            "nivel_acesso",
            "is_global_admin",
            "is_active",
            "date_joined",
            "password",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate_funcoes(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Deve ser uma lista.")
        normalized, _ = Usuario.normalize_funcoes(value)
        return normalized

    def create(self, validated_data):
        funcoes = validated_data.get("funcoes", [])
        normalized, principal = Usuario.normalize_funcoes(funcoes)
        validated_data["funcoes"] = normalized
        validated_data["funcao_principal"] = principal
        validated_data["password"] = make_password(validated_data.get("password"))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "funcoes" in validated_data:
            normalized, principal = Usuario.normalize_funcoes(validated_data["funcoes"])
            validated_data["funcoes"] = normalized
            validated_data["funcao_principal"] = principal

        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)

        return super().update(instance, validated_data)
