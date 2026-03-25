from rest_framework import serializers
from .models import Usuario, Musica, Culto

class UsuarioSerializer(serializers.ModelSerializer):
    """
    Traduz os dados do Usuário para JSON.
    """
    class Meta:
        model = Usuario
        # Escolhemos quais campos o React vai poder ver
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
        ]
        extra_kwargs = {"password": {"write_only": True, "required": False}}

    def validate(self, attrs):
        # Exigimos senha ao criar usuário novo para evitar conta sem login.
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Este campo é obrigatório na criação."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        # Garante criação com hash de senha via manager padrão do Django.
        user = Usuario.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)  # Atualiza o resto
        if password:
            user.set_password(password)  # Criptografa a senha nova!
            user.save()
        return user

class MusicaSerializer(serializers.ModelSerializer):
    """
    Traduz os dados das Músicas para JSON.
    """
    class Meta:
        model = Musica
        fields = '__all__' # '__all__' significa que queremos enviar todos os campos

class CultoSerializer(serializers.ModelSerializer):
    """
    Traduz os dados dos Cultos para JSON.
    """
    class Meta:
        model = Culto
        fields = '__all__'
