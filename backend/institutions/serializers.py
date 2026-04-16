from rest_framework import serializers

from institutions.models import Igreja, Ministerio


class IgrejaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Igreja
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class MinisterioSerializer(serializers.ModelSerializer):
    igreja_nome = serializers.CharField(source="igreja.nome", read_only=True)

    class Meta:
        model = Ministerio
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        igreja = data.get("igreja")
        user = self.context["request"].user
        if not (user.is_global_admin or user.is_superuser) and igreja:
            if not user.vinculos_igreja.filter(igreja=igreja, is_active=True).exists():
                raise serializers.ValidationError({"igreja": "Voce nao tem vinculo com esta igreja."})
        return data
