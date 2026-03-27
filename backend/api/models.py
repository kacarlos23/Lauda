from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    """
    Modelo customizado de usuário.
    Substitui o padrão do Django para incluir os campos do nosso MVP.
    """
    
    # Definindo as opções de Nível de Acesso conforme o documento
    NIVEL_ACESSO_CHOICES = [
        (1, 'Administrador'), # Acesso total
        (2, 'Líder de Louvor'), # Gerencia escalas e músicas
        (3, 'Membro'), # Acesso de leitura e confirmação
    ]

    # Campos exigidos no RF-02
    telefone = models.CharField(max_length=20, blank=True, null=True)
    foto_perfil = models.ImageField(upload_to='perfil/', blank=True, null=True)
    
    # A função principal (ex: Bateria, Vocal)
    funcao_principal = models.CharField(max_length=50)
    
    # Funções secundárias (texto livre para simplificar no MVP)
    funcoes_secundarias = models.TextField(blank=True, null=True, help_text="Ex: Violão, Teclado")
    
    nivel_acesso = models.IntegerField(choices=NIVEL_ACESSO_CHOICES, default=3)
    
    # Para exclusão lógica (Soft Delete) - RN-01
    is_active = models.BooleanField(default=True, help_text="Desmarque para inativar o membro em vez de deletar")

    def __str__(self):
        # Como o usuário será exibido no painel de administração do Django
        return f"{self.first_name} {self.last_name} ({self.get_nivel_acesso_display()})"
    
class Musica(models.Model):
    """
    RF-03: Banco de Músicas (Repertório Global)
    """
    titulo = models.CharField(max_length=200)
    artista = models.CharField(max_length=200)
    tom_original = models.CharField(max_length=10) # Ex: C, Dm, G#
    bpm = models.IntegerField(blank=True, null=True)
    compasso = models.CharField(max_length=10, blank=True, null=True) # Ex: 4/4, 6/8
    link_referencia = models.URLField(blank=True, null=True)
    
    # Cifras: mutuamente exclusivas (ou PDF ou Texto)
    cifra_pdf = models.FileField(upload_to='cifras_pdf/', blank=True, null=True)
    cifra_texto = models.TextField(blank=True, null=True)
    
    observacoes = models.TextField(blank=True, null=True)
    tags = models.CharField(max_length=255, blank=True, null=True, help_text="Separe as tags por vírgula. Ex: Adoração, Ceia")
    
    # Exclusão Lógica (Soft Delete) - RN-01
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.titulo} - {self.artista}"

class Culto(models.Model):
    """
    RF-04: Gestão de Eventos/Cultos
    """
    STATUS_CHOICES = [
        ('AGENDADO', 'Agendado'),
        ('REALIZADO', 'Realizado'),
        ('CANCELADO', 'Cancelado'),
    ]

    nome = models.CharField(max_length=150) # Ex: Culto de Domingo
    data = models.DateField()
    horario_inicio = models.TimeField()
    horario_termino = models.TimeField()
    local = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AGENDADO')

    def __str__(self):
        return f"{self.nome} - {self.data.strftime('%d/%m/%Y')}"

class Escala(models.Model):
    """
    RF-06: Confirmação de Presença na Escala
    Tabela que liga o Membro ao Culto.
    """
    STATUS_CONFIRMACAO = [
        ('PENDENTE', 'Pendente'),
        ('CONFIRMADO', 'Confirmado'),
        ('RECUSADO', 'Recusado'),
    ]

    culto = models.ForeignKey(Culto, on_delete=models.CASCADE, related_name='escalas')
    membro = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='minhas_escalas')
    status_confirmacao = models.CharField(max_length=20, choices=STATUS_CONFIRMACAO, default='PENDENTE')

    def __str__(self):
        return f"{self.membro.first_name} em {self.culto.nome}"

class ItemSetlist(models.Model):
    """
    RF-05: Montagem de Setlist (Repertório do Dia)
    Tabela que liga a Música ao Culto, com dados específicos daquela execução.
    """
    culto = models.ForeignKey(Culto, on_delete=models.CASCADE, related_name='setlists')
    musica = models.ForeignKey(Musica, on_delete=models.RESTRICT) # RESTRICT evita apagar a música se estiver num culto
    
    ordem = models.PositiveIntegerField(default=1)
    tom_execucao = models.CharField(max_length=10) # Tom específico para este culto
    observacoes = models.CharField(max_length=255, blank=True, null=True) # Obs específicas para o culto

    class Meta:
        ordering = ['ordem'] # Garante que sempre virá ordenado pela sequência numérica

    def __str__(self):
        return f"{self.ordem} - {self.musica.titulo} ({self.tom_execucao})"

class RegistroLogin(models.Model):
    """
    Trilha de auditoria para registrar acessos ao sistema.
    """
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='historico_logins')
    data_hora = models.DateTimeField(auto_now_add=True) # Salva a hora exata automaticamente
    ip_address = models.GenericIPAddressField(blank=True, null=True) # Opcional: Salvar o IP
    
    # Pode adicionar 'user_agent' se quiser saber se foi pelo celular ou PC

    def __str__(self):
        return f"{self.usuario.username} logou em {self.data_hora.strftime('%d/%m/%Y %H:%M')}"
