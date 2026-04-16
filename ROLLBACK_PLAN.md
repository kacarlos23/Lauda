# Rollback Plan v1 -> v2

## Objetivo
Este documento descreve como reverter com seguranca o deploy da refatoracao v2 caso haja falha critica de aplicacao, permissao, token ou integracao frontend nas primeiras horas apos o go-live.

## Premissas
- existe backup valido do banco imediatamente anterior ao deploy
- a imagem, release ou commit da versao anterior continua disponivel
- a equipe frontend foi avisada sobre a coexistencia temporaria entre rotas canonicas e legado

## Pre-rollback
Antes de qualquer reversao:
1. congelar novos deploys
2. registrar horario do incidente e sintomas observados
3. salvar logs de aplicacao, migracoes e reverse proxy
4. validar se o problema e de configuracao, app ou schema

## Cenario 1: falha critica nas primeiras 2h
### Sintomas
- erro 500 generalizado
- falha de boot do Django ou gunicorn
- migrations inconsistentes
- indisponibilidade total da API

### Acoes
1. reverter a release da aplicacao para a versao anterior
2. restaurar variaveis de ambiente anteriores, se alteradas
3. executar redeploy da v1
4. se alguma migration irreversivel tiver sido aplicada e houver impacto funcional, restaurar o backup pre-deploy do banco

### Comandos de referencia
```bash
git revert <merge_commit>
git push origin main
```

ou, em ambiente containerizado:

```bash
docker service rollback lauda_backend
```

backup/restore de referencia:

```bash
pg_dump -Fc lauda_db > backup_pre_go_live.dump
pg_restore --clean --if-exists -d lauda_db backup_pre_go_live.dump
```

## Cenario 2: quebra de permissoes ou tokens
### Sintomas
- aumento anormal de `401` apos login ou refresh
- `403` em massa para usuarios operacionais
- grants nao refletidos como esperado

### Acoes
1. validar se `rest_framework_simplejwt.token_blacklist` segue ativo
2. inspecionar `accounts.signals` e `system_userpermissiongrant`
3. se necessario, reduzir temporariamente o lifetime de refresh token para acelerar expiracao de sessoes antigas
4. se a regressao estiver ligada a grants, desabilitar temporariamente o fluxo operacional de concessao ate correcao
5. se necessario, reverter a release da aplicacao mantendo o banco, desde que o schema siga compativel

### Validacoes
```bash
python manage.py shell -c "from rest_framework_simplejwt.token_blacklist.models import OutstandingToken; print(OutstandingToken.objects.count())"
python manage.py shell -c "from system.models import UserPermissionGrant; print(UserPermissionGrant.objects.filter(is_active=True).count())"
```

## Cenario 3: paginacao quebra o frontend
### Sintomas
- listas vazias por leitura direta de array
- erro em `.map()` no frontend
- regressao apenas em views de listagem

### Acoes
1. orientar o frontend a usar o fallback `res.data?.results || res.data || []`
2. se necessario, publicar hotfix frontend imediato
3. manter rotas legadas ativas enquanto o ajuste nao sobe
4. se o impacto for severo e generalizado, reverter a release frontend primeiro; backend pode permanecer

## Cenario 4: drift de migration ou schema
### Sintomas
- `migrate` falha por coluna ou indice ja existente
- banco em estado parcial apos tentativa de deploy

### Acoes
1. interromper novas tentativas automaticas de migration
2. comparar `django_migrations` com o schema real
3. usar `--fake` apenas se o schema ja estiver presente e a divergencia estiver comprovada
4. se houver duvida, restaurar backup e repetir deploy em staging antes de nova tentativa

## Ordem recomendada de rollback
1. aplicacao
2. configuracao
3. frontend
4. banco de dados

O banco deve ser o ultimo passo e apenas quando necessario, pois rollback de dados tem impacto maior.

## Validacao pos-rollback
Depois da reversao:
```bash
python manage.py check
python manage.py showmigrations
curl -i https://seu-dominio.com/api/health/
```

Esperado:
- API responde `200`
- app sobe sem erro de registry
- migrations ficam consistentes com a release restaurada

## Monitoramento das primeiras 24h
- acompanhar erro 500, 401 e 403
- verificar latencia de `/api/music/musicas/` e `/api/accounts/usuarios/`
- revisar grants e logs de auditoria no admin
- confirmar funcionamento de `/api/health/`

## Responsabilidades
- backend: executar rollback tecnico e validar schema
- frontend: publicar fallback ou rollback de cliente se necessario
- produto/operacao: comunicar janela de instabilidade e status do incidente
