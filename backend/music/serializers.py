import re

from rest_framework import serializers

from music.models import ItemSetlist, Musica
from system.constants import (
    MUSIC_CLASSIFICATION_MAP,
    MUSIC_CLASSIFICATION_SET,
)


class MusicaSerializer(serializers.ModelSerializer):
    classificacao_meta = serializers.SerializerMethodField()
    ministerio_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Musica
        fields = "__all__"

    def create(self, validated_data):
        validated_data.pop("ministerio_id", None)
        validated_data.pop("created_by", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("ministerio_id", None)
        validated_data.pop("created_by", None)
        return super().update(instance, validated_data)

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


class ItemSetlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemSetlist
        fields = "__all__"
