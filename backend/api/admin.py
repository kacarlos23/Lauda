from django.contrib import admin
from .models import Usuario, Musica, Culto, Escala, ItemSetlist

# Configuração para a exibição de Usuários
@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    # Quais colunas aparecerão na lista
    list_display = ('username', 'first_name', 'funcao_principal', 'nivel_acesso', 'is_active')
    # Adiciona um filtro lateral
    list_filter = ('nivel_acesso', 'is_active', 'funcao_principal')
    # Permite buscar pelo nome
    search_fields = ('first_name', 'last_name', 'username')

# Configuração para a exibição de Músicas
@admin.register(Musica)
class MusicaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'artista', 'tom_original', 'bpm', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('titulo', 'artista', 'tags')

# Configuração para a exibição de Cultos
@admin.register(Culto)
class CultoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'data', 'horario_inicio', 'status')
    list_filter = ('status', 'data')

# Registrando as tabelas de ligação de forma simples
admin.site.register(Escala)
admin.site.register(ItemSetlist)