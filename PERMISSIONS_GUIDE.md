# Guia de Permissoes Granulares

## Objetivo
Este documento descreve a regra padrao de acesso do Lauda v2 e como liberar excecoes pontuais com `UserPermissionGrant`.

## Regra padrao
### Leitura
- usuarios autenticados podem acessar listagens e detalhes de acordo com o escopo aplicado na view

### Escrita
- `is_global_admin=True`: acesso total auditado
- usuarios com privilegio acima de membro: seguem a regra padrao da view
- usuarios equivalentes a `MEMBRO`: recebem bloqueio para escrita em musica e culto sem grant explicito

## Modelo de permissao
O modelo responsavel pela sobreposicao e:

```python
system.models.UserPermissionGrant
```

Campos principais:
- `usuario`
- `permission_codename`
- `igreja`
- `ministerio`
- `granted_by`
- `granted_at`
- `is_active`

Se `igreja` e `ministerio` estiverem vazios, o grant passa a ser global para aquele codename.

## Codenames suportados
- `music.add_musica`
- `music.change_musica`
- `music.delete_musica`
- `events.add_culto`
- `events.change_culto`
- `events.delete_culto`

## Fluxo operacional
### Consultar grants
```http
GET /api/system/permission-grants/?usuario={id}
```

### Criar grant unitario
```http
POST /api/system/permission-grants/
Content-Type: application/json

{
  "usuario": 123,
  "permission_codename": "music.add_musica",
  "ministerio": 45,
  "granted_by": 1,
  "is_active": true
}
```

### Criar grants em lote
```http
POST /api/system/permission-grants/batch-grant/
Content-Type: application/json

{
  "user_id": 123,
  "permissions": [
    { "codename": "music.add_musica", "ministerio_id": 45 },
    { "codename": "events.change_culto" }
  ]
}
```

### Revogar grant
```http
POST /api/system/permission-grants/{id}/revoke/
```

## Efeito colateral importante
Toda alteracao de grant invalida refresh tokens ativos do usuario.

Casos cobertos:
- criacao de grant
- edicao de grant
- revogacao
- exclusao

Implementacao atual em:
- `backend/accounts/signals.py`

## Relacao com o papel do usuario
`UserPermissionGrant` nao substitui completamente o papel base. Ele atua como sobreposicao controlada para permissoes criticas.

Exemplos:
- membro sem grant: nao cria musica
- membro com `music.add_musica`: pode criar musica no escopo liberado
- membro com `events.change_culto`: pode editar culto no escopo liberado
- global admin: continua com bypass, independentemente de grants

## Escopo recomendado
Prefira grants por `ministerio` ou `igreja` quando possivel. Grants globais devem ser excepcao e precisam de justificativa operacional.

## Boas praticas
- sempre preencher `granted_by`
- auditar concessoes administrativas
- revisar grants ativos periodicamente
- revogar grants temporarios quando a necessidade terminar
- tratar `401` no frontend apos revogacao, pois os tokens sao invalidados

## Troubleshooting
### Usuario continua recebendo `403`
- confirme se `is_active=True` no grant
- valide se o `codename` esta correto
- confira se o escopo do grant bate com a igreja ou ministerio da operacao
- confirme se a view consultada ja foi migrada para a regra granular

### Usuario recebe `401` apos revogacao
- comportamento esperado
- o frontend deve redirecionar para login ou renovar sessao conforme a UX definida

## Referencias
- `backend/system/models.py`
- `backend/system/views.py`
- `backend/accounts/signals.py`
- `ARCHITECTURE.md`
