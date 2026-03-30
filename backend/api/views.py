from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.pagination import PageNumberPagination
from django.utils.timezone import localtime, now
from .models import Usuario, Musica, Culto, Escala, ItemSetlist, RegistroLogin, LogAuditoria
from .serializers import UsuarioSerializer, MusicaSerializer, CultoSerializer, EscalaSerializer, ItemSetlistSerializer, LogAuditoriaSerializer

# O ModelViewSet é uma mágica do Django REST Framework. 
# Ele cria automaticamente as ações de Listar, Criar, Atualizar e Deletar (CRUD).

class AuditoriaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

def registrar_log(user, acao, modelo, descricao):
    
    if user and user.is_authenticated:
        LogAuditoria.objects.create(usuario=user, acao=acao, modelo_afetado=modelo, descricao=descricao)

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

class MusicaViewSet(viewsets.ModelViewSet):
    queryset = Musica.objects.all()
    serializer_class = MusicaSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, 'CREATE', 'Musica', f'Música "{instance.titulo}" criada.')

    def perform_update(self, serializer):
        is_active_before = serializer.instance.is_active
        instance = serializer.save()
        if is_active_before and not instance.is_active:
            registrar_log(self.request.user, 'DELETE', 'Musica', f'Música "{instance.titulo}" movida para lixeira.')
        else:
            registrar_log(self.request.user, 'UPDATE', 'Musica', f'Música "{instance.titulo}" atualizada.')

    def perform_destroy(self, instance):
        titulo = instance.titulo
        instance.delete()
        registrar_log(self.request.user, 'DELETE', 'Musica', f'Música "{titulo}" deletada definitivamente.')

class CultoViewSet(viewsets.ModelViewSet):
    queryset = Culto.objects.all()
    serializer_class = CultoSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, 'CREATE', 'Culto', f'Culto "{instance.nome}" agendado.')

    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_log(self.request.user, 'UPDATE', 'Culto', f'Culto "{instance.nome}" atualizado.')

    def perform_destroy(self, instance):
        nome = instance.nome
        instance.delete()
        registrar_log(self.request.user, 'DELETE', 'Culto', f'Culto "{nome}" excluído.')

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

class LogAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogAuditoria.objects.all().order_by('-data_hora')
    serializer_class = LogAuditoriaSerializer
    permission_classes = [IsAdminLevel]
    pagination_class = AuditoriaPagination # Ativa as páginas de 10 em 10

    def get_queryset(self):
        qs = super().get_queryset()
        # Aplica os filtros recebidos do React
        acao = self.request.query_params.get('acao')
        usuario_id = self.request.query_params.get('usuario')

        if acao:
            qs = qs.filter(acao=acao)
        if usuario_id:
            qs = qs.filter(usuario=usuario_id)

        return qs

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        hoje = localtime(now()).date()
        from .models import LogAuditoria
        
        # Gera os 4 relatórios da Seção 1
        return Response({
            "total_eventos": LogAuditoria.objects.count(),
            "eventos_hoje": LogAuditoria.objects.filter(data_hora__date=hoje).count(),
            "musicas_alteradas": LogAuditoria.objects.filter(modelo_afetado='Musica').count(),
            "cultos_alterados": LogAuditoria.objects.filter(modelo_afetado='Culto').count()
        })

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
        
