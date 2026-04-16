from rest_framework import serializers

from events.models import Culto, Escala, Evento


class EventoSerializer(serializers.ModelSerializer):
    igreja_nome = serializers.CharField(source="igreja.nome", read_only=True)
    ministerio_nome = serializers.CharField(source="ministerio.nome", read_only=True, allow_null=True)

    class Meta:
        model = Evento
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class CultoSerializer(serializers.ModelSerializer):
    evento_nome = serializers.CharField(source="evento.nome", read_only=True, allow_null=True)

    class Meta:
        model = Culto
        fields = "__all__"
        read_only_fields = ["id"]


class EscalaSerializer(serializers.ModelSerializer):
    evento_nome = serializers.CharField(source="culto.evento.nome", read_only=True, allow_null=True)

    class Meta:
        model = Escala
        fields = "__all__"
        read_only_fields = ["id"]
