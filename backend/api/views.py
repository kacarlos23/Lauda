from rest_framework import viewsets
from .models import Usuario, Musica, Culto
from .serializers import UsuarioSerializer, MusicaSerializer, CultoSerializer

# O ModelViewSet é uma mágica do Django REST Framework. 
# Ele cria automaticamente as ações de Listar, Criar, Atualizar e Deletar (CRUD).

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

class MusicaViewSet(viewsets.ModelViewSet):
    queryset = Musica.objects.all()
    serializer_class = MusicaSerializer

class CultoViewSet(viewsets.ModelViewSet):
    queryset = Culto.objects.all()
    serializer_class = CultoSerializer