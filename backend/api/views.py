from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Musica, Culto, Escala, ItemSetlist, RegistroLogin
from .serializers import UsuarioSerializer, MusicaSerializer, CultoSerializer, EscalaSerializer, ItemSetlistSerializer, RegistroLoginSerializer

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

class EscalaViewSet(viewsets.ModelViewSet):
    queryset = Escala.objects.all()
    serializer_class = EscalaSerializer

class ItemSetlistViewSet(viewsets.ModelViewSet):
    queryset = ItemSetlist.objects.all()
    serializer_class = ItemSetlistSerializer

class IsAdminLevel(permissions.BasePermission):
    """
    Permite acesso APENAS a usuários que tenham nivel_acesso == 1 (Administrador).
    """
    def has_permission(self, request, view):
        # Verifica se o usuário está logado e se o nível dele é 1
        return bool(request.user and request.user.is_authenticated and request.user.nivel_acesso == 1)
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # O Django valida a senha normalmente aqui
        data = super().validate(attrs)
        
        # Se a senha estava correta e não deu erro, nós gravamos a auditoria!
        request = self.context.get('request')
        ip = request.META.get('REMOTE_ADDR') if request else None
        RegistroLogin.objects.create(usuario=self.user, ip_address=ip)
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    # APLICANDO A CATRACA: Só administradores podem acessar a rota de usuários agora!
    permission_classes = [IsAdminLevel]

class RegistroLoginViewSet(viewsets.ReadOnlyModelViewSet): # ReadOnly porque não faz sentido editar a auditoria
    queryset = RegistroLogin.objects.all().order_by('-data_hora') # Os mais recentes primeiro
    serializer_class = RegistroLoginSerializer
    # APLICANDO A CATRACA: Só administradores podem ver o histórico de acessos
    permission_classes = [IsAdminLevel]

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    # A catraca principal continua: Só admin acessa a lista geral
    permission_classes = [IsAdminLevel]

    # ---> NOVA ROTA: /api/usuarios/me/
    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Permite que o usuário logado veja e edite o seu próprio perfil, 
        independente do nível de acesso.
        """
        user = request.user
        
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
            
        else: # PUT ou PATCH (Atualizar dados)
            # partial=True permite que ele atualize só o telefone, sem precisar mandar a senha de novo, por exemplo
            serializer = self.get_serializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)