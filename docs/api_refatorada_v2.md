# API Refatorada v2

## Resumo
Esta documentacao resume a superficie publica principal apos a refatoracao do backend em apps orientados a dominio.

## Rotas canonicas por dominio

### Accounts
- `GET /api/accounts/usuarios/`
- `POST /api/accounts/usuarios/`
- `POST /api/accounts/usuarios/{id}/reset_password/`
- `POST /api/accounts/auth/impersonate/`

### Institutions
- `GET /api/institutions/igrejas/`
- `GET /api/institutions/ministerios/`
- `POST /api/institutions/ministerios/{id}/regenerate_access_code/`

### Music
- `GET /api/music/musicas/`
- `POST /api/music/musicas/`
- `POST /api/music/musicas/enriquecer/`
- `POST /api/music/musicas/{id}/sincronizar-metadados/`
- `GET /api/music/itens-setlist/`

### Events
- `GET /api/events/eventos/`
- `GET /api/events/cultos/`
- `GET /api/events/escalas/`

### System
- `GET /api/system/permission-grants/`
- `POST /api/system/permission-grants/`
- `POST /api/system/permission-grants/batch-grant/`
- `POST /api/system/permission-grants/{id}/revoke/`

## Envelope padrao de listagem
Todas as listagens novas devem assumir o formato:

```json
{
  "count": 142,
  "next": "https://api.exemplo.com/api/music/musicas/?page=2",
  "previous": null,
  "results": []
}
```

Parametros suportados:
- `page`
- `page_size`

Limites:
- `PAGE_SIZE` padrao: `50`
- `MAX_PAGE_SIZE`: `200`

## Permissoes granulares
O modelo `UserPermissionGrant` sobrepoe a regra padrao de perfil para escrita em musica e culto.

Permissoes suportadas:
- `music.add_musica`
- `music.change_musica`
- `music.delete_musica`
- `events.add_culto`
- `events.change_culto`
- `events.delete_culto`

Comportamento:
- `Global Admin`: acesso total
- Usuario sem grant: fallback para regra padrao do perfil
- Usuario equivalente a `MEMBRO`: sem grant, nao escreve em musica/culto

## Impersonacao
Alias legado mantido temporariamente:
- `POST /api/auth/impersonate/`

Rota canonica:
- `POST /api/accounts/auth/impersonate/`

Resposta:

```json
{
  "refresh": "jwt-refresh",
  "access": "jwt-access",
  "user": {
    "id": 1,
    "username": "admin"
  },
  "impersonation": {
    "active": true,
    "ministry_id": 10,
    "ministry_name": "Louvor",
    "scope": "ministry",
    "expires_in": 3600
  }
}
```

## Invalidaçao automatica de JWT
Refresh tokens ativos sao invalidados quando ocorre:
- alteracao de `is_global_admin`
- alteracao de `nivel_acesso`
- desativacao do usuario
- criacao, edicao, remocao ou revogacao de `UserPermissionGrant`
- mudanca de vinculo em `VinculoMinisterioUsuario`

## Compatibilidade legado
O app `api` segue ativo apenas como camada de compatibilidade temporaria.
- As rotas legadas continuam funcionais em paralelo
- Os novos desenvolvimentos devem usar somente as rotas canonicas por dominio

## OpenAPI
Nao ha export OpenAPI gerado neste passo porque o projeto nao possui `drf-spectacular` nem `drf-yasg` instalados/configurados.
