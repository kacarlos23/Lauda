# Guia de Migracao Frontend (Backend v2 Refatorado)

## Objetivo
Este guia consolida as breaking changes introduzidas pela refatoracao do backend e o checklist minimo para adaptar o frontend sem regressao funcional.

## Breaking Changes
1. Todas as listagens agora sao paginadas.
   - Antes: `GET /api/musicas/` -> `[...]`
   - Depois: `GET /api/music/musicas/` -> `{ "count": 142, "next": "...", "previous": null, "results": [...] }`
   - Acao: substituir consumo direto de `response.data` por `response.data.results`
   - Fallback temporario: `const items = res.data?.results || res.data || [];`

2. As rotas canonicas foram reorganizadas por dominio.

   | Legado | Canonica v2 |
   |--------|-------------|
   | `/api/usuarios/` | `/api/accounts/usuarios/` |
   | `/api/musicas/` | `/api/music/musicas/` |
   | `/api/eventos/` | `/api/events/eventos/` |
   | `/api/cultos/` | `/api/events/cultos/` |
   | `/api/escalas/` | `/api/events/escalas/` |
   | `/api/ministerios/` | `/api/institutions/ministerios/` |
   | `/api/igrejas/` | `/api/institutions/igrejas/` |
   | `/api/auditoria/` | `/api/system/permission-grants/` e rotas de dominio correspondentes |

   Observação: aliases legados em `/api/...` ainda existem temporariamente via shim do app `api`, mas a equipe frontend deve migrar para as rotas canonicas por dominio.

3. Paginação server-side agora e obrigatória.
   - Parâmetros suportados: `?page=2&page_size=50`
   - `page_size` máximo: `200`
   - Impacto direto: tabelas, grids, selects remotos e infinite scroll devem ler `count`, `next` e `previous`

4. Permissões granulares estão ativas para operações de escrita.
   - Usuários com perfil equivalente a `MEMBRO` recebem `403` em `POST`, `PUT`, `PATCH` e `DELETE` de musicas e cultos sem grant explícito
   - Para conceder acesso, usar:
     - `GET /api/system/permission-grants/?usuario={id}`
     - `POST /api/system/permission-grants/`
     - `POST /api/system/permission-grants/batch-grant/`
     - `POST /api/system/permission-grants/{id}/revoke/`

5. O fluxo de impersonacao agora retorna JWT assinado.
   - Alias legado: `POST /api/auth/impersonate/`
   - Rota canonica: `POST /api/accounts/auth/impersonate/`
   - Resposta: `{ refresh, access, user, impersonation }`
   - Acao: substituir qualquer troca manual de header/contexto pelo novo `access` retornado

6. Tokens passam a ser invalidados automaticamente quando ha mudanca critica de acesso.
   - Casos cobertos: alteracao de grant, troca de papel/nivel, desativacao do usuario e mudancas de vinculo de ministerio
   - Acao: o frontend deve tratar `401` apos refresh com redirecionamento para login

## Checklist de Adaptacao Frontend
- Mapear chamadas ainda presas a rotas legadas `/api/...` e migrar para as rotas canonicas por dominio
- Revisar wrappers HTTP para garantir suporte ao envelope paginado `{ count, next, previous, results }`
- Validar tabelas e listas que ainda fazem `.map()` diretamente em `response.data`
- Adaptar telas de permissao para consultar grants via `/api/system/permission-grants/`
- Ajustar fluxos de criacao/edicao de musica e culto para tratar `403` por grant ausente
- Atualizar o fluxo de impersonacao para persistir o novo `access` JWT retornado pela API
- Revisar interceptors de autenticacao para logout forcado em `401` apos refresh invalido
- Validar componentes de paginacao, pagina atual, total e carregamento incremental
- Executar smoke test em login, impersonacao, listagens, CRUD de musica e CRUD de culto

## Exemplo TypeScript de Adaptacao
Para equipes que desejarem padronizar a camada HTTP em TypeScript, foram adicionados exemplos em:
- `frontend/src/types/api.ts`
- `frontend/src/services/baseApi.ts`

Eles nao estao plugados automaticamente no app atual em JavaScript, mas documentam a estrutura recomendada para clients tipados.

## Observacao sobre o frontend atual
O wrapper JS existente em `frontend/src/lib/api.js` ja possui normalizacao parcial de respostas paginadas. Mesmo assim, a migracao para as rotas canonicas e a revisao de todos os consumidores continuam obrigatorias.

## OpenAPI
Nao foi possivel gerar `openapi.yaml` neste passo porque o projeto backend nao possui `drf-spectacular` nem `drf-yasg` instalados/configurados no estado atual.
