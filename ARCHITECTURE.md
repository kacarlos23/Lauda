# Arquitetura Backend Lauda v2

## Visao geral
O backend foi refatorado de um app monolitico `api/` para uma organizacao por dominio. A separacao e logica, nao fisica: boa parte das tabelas continua com prefixo `api_` para evitar renomeacoes arriscadas em producao.

## Estrutura de apps
- `backend/accounts/`: identidade, autenticacao, `Usuario`, `RegistroLogin`, impersonacao administrativa
- `backend/institutions/`: `Igreja`, `Ministerio`, vinculos de usuario, convites e times
- `backend/music/`: `Musica`, `ItemSetlist`, cache de metadados
- `backend/events/`: `Evento`, `Culto`, `Escala`
- `backend/system/`: auditoria, logs de erro, modulos e `UserPermissionGrant`
- `backend/api/`: shim de compatibilidade para migrations legadas, imports `api.*` e alias de registry

## Decisoes tecnicas principais
- `db_table` preservado: models mantem tabelas historicas como `api_usuario`, `api_ministerio` e `api_logauditoria`
- `AUTH_USER_MODEL`: a referencia canonica de autenticacao e `accounts.Usuario`
- vinculos de ministerio: o antigo FK direto em `Usuario` foi removido; a fonte da verdade passou a ser `VinculoMinisterioUsuario`
- paginacao obrigatoria: listagens DRF retornam `{ count, next, previous, results }`
- JWT com blacklist: refresh tokens sao invalidados automaticamente quando ha mudanca critica de acesso
- auditoria centralizada: eventos relevantes usam servicos e modelos de `system/`

## Coexistencia segura com o app `api`
O app `api` continua registrado em `INSTALLED_APPS` por compatibilidade.

### O que o shim faz
- `backend/api/models.py` reexporta models dos novos apps
- `backend/api/apps.py` implementa um fallback em `get_model()` para resolver `api.Model` no App Registry
- rotas legadas continuam incluidas via `path("api/", include("api.urls"))`

### O que nao fazer
- nao adicionar regra de negocio nova em `backend/api/`
- nao trocar FKs string legadas de `api.*` para novos app-labels sem um plano de migracao completo
- nao remover `db_table` ou tentar renomear tabelas em producao sem maintenance window e `RunSQL` revisado

## Modelo de identidade e escopo
`Usuario` agora expoe o ministerio principal via propriedade:

```python
usuario.ministerio
usuario.ministerio_id
```

Para consultas de dominio, prefira:

```python
usuario.vinculos_ministerio.filter(is_primary=True, is_active=True)
```

## Permissoes
### Regra base
- `is_global_admin=True`: bypass de dominio com auditoria
- usuarios comuns: caem na regra padrao do perfil
- perfil equivalente a `MEMBRO`: sem grant explicito, nao escreve em musica e culto

### Sobreposicao granular
`system.UserPermissionGrant` permite liberar operacoes pontuais por igreja ou ministerio.

Permissoes suportadas hoje:
- `music.add_musica`
- `music.change_musica`
- `music.delete_musica`
- `events.add_culto`
- `events.change_culto`
- `events.delete_culto`

## JWT blacklist automatica
Tokens ativos sao invalidados quando ocorre:
- alteracao de `is_global_admin`
- alteracao de `nivel_acesso`
- alteracao de `is_active`
- criacao, edicao, exclusao ou revogacao de `UserPermissionGrant`
- criacao, edicao ou remocao de `VinculoMinisterioUsuario`

Implementacao atual:
- `backend/accounts/signals.py`
- `rest_framework_simplejwt.token_blacklist`

## Paginacao e contrato de API
Configuracao atual em `backend/core/settings.py`:
- `DEFAULT_PAGINATION_CLASS = rest_framework.pagination.PageNumberPagination`
- `PAGE_SIZE = 50`
- `MAX_PAGE_SIZE = 200`
- `page_size` como query param suportado

Impacto no frontend:
- consumir `response.data.results`
- ler `count`, `next` e `previous` em qualquer listagem

## Rotas canonicas por dominio
- `api/accounts/`
- `api/institutions/`
- `api/music/`
- `api/events/`
- `api/system/`

Rotas legadas continuam ativas em paralelo por compatibilidade.

## Arquivos-chave
- `backend/core/settings.py`: apps, DRF, JWT, logging
- `backend/core/urls.py`: roteamento canonico e legado
- `backend/api/apps.py`: alias de registry para `api.Model`
- `backend/api/models.py`: reexports do shim
- `backend/system/services.py`: service layer de auditoria
- `backend/system/exception_handler.py`: tratamento global de excecoes
- `backend/system/tests/test_refactor_validation.py`: smoke tests da refatoracao

## Riscos conhecidos e limites
- models ainda coexistem com app-label legado em parte do dominio para manter compatibilidade
- a renomeacao fisica de tabelas foi adiada
- a remocao definitiva de `api/` ainda nao e segura sem reescrever migrations e referencias legadas

## Leitura complementar
- `README.md`
- `PERMISSIONS_GUIDE.md`
- `FRONTEND_MIGRATION_GUIDE.md`
- `docs/api_refatorada_v2.md`
