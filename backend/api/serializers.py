from rest_framework import serializers
from .models import Usuario, Musica, Culto

class UsuarioSerializer(serializers.ModelSerializer):
    """
    Traduz os dados do Usuário para JSON.
    """
    class Meta:
        model = Usuario
        # Escolhemos quais campos o React vai poder ver
        fields = ['id', 'username', 'first_name', 'email', 'telefone', 'funcao_principal', 'nivel_acesso']

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