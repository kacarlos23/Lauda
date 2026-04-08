# Lauda — Hotfix imediato: restringir a área React `/admin` apenas ao superuser

## Objetivo deste documento
Aplicar uma correção imediata e isolada para garantir que a área administrativa **React `/admin`**, dentro do site principal, seja acessível **somente** pelo usuário `admin` que é `superuser` no Django.

## Correção de escopo
Este documento trata da **área React `/admin`** do frontend.

### Não é o foco deste documento
Não é o foco principal deste documento:
- a página **Django Admin `/admin/`** do backend;
- permissões gerais do produto;
- os blocos grandes de arquitetura.

Se o acesso indevido está acontecendo “na área principal do site”, este é o documento correto.

---

# 1. Diagnóstico correto no projeto atual

## O que o frontend faz hoje
No código atual do frontend:
- a rota protegida `RequireAdminRoute` libera a área `/admin` se `session.user?.is_global_admin` for verdadeiro;
- a rota `AdminLoginRoute` também redireciona para `/admin` se `session.user?.is_global_admin` for verdadeiro;
- o hook `usePermissions` trata `user?.is_global_admin` como admin global do frontend.

## O que isso significa
Hoje, o frontend React **não está exigindo `is_superuser`** para liberar a área `/admin`.
Ele está exigindo apenas `is_global_admin`.

## Consequência prática
Se o usuário `carlos_h` ou qualquer outro estiver chegando na sessão com:
- `is_global_admin = true`

ele consegue entrar na área React `/admin`, mesmo sem ser o `admin` superuser do Django.

## Resultado desejado do hotfix
Depois deste hotfix:
- a área React `/admin` deve aceitar **somente** o usuário que for `superuser`;
- `is_global_admin` sozinho **não** deve mais liberar a área `/admin`;
- `nivel_acesso` **não** deve liberar a área `/admin`;
- usuários comuns e admins locais devem ser redirecionados para a área comum do app;
- o produto principal deve continuar funcionando.

---

# 2. Regra final obrigatória

## Regra inegociável
A área React `/admin` deve depender exclusivamente de:

- `user.is_superuser == true`

## Regra complementar
Os seguintes cenários devem ser bloqueados na área React `/admin`:
- `is_global_admin = true` e `is_superuser = false`
- `nivel_acesso = 1` e `is_superuser = false`
- qualquer outro usuário não-superuser

## Decisão prática deste hotfix
Para a área React `/admin`:
- **entra apenas superuser**
- **todo o resto é redirecionado ou bloqueado**

---

# 3. O que este hotfix PODE fazer

Este hotfix pode:
- alterar a regra de proteção da rota React `/admin`
- alterar a regra de redirecionamento do login admin React
- alterar o payload/sessão para garantir presença de `is_superuser`
- ajustar hooks de permissão para a área admin React
- criar testes de rota e sessão
- validar manualmente o comportamento do frontend

---

# 4. O que este hotfix NÃO PODE fazer

Este hotfix **não pode**:
- reescrever todo o sistema de permissões
- alterar a lógica funcional do módulo de música
- refatorar os blocos grandes de arquitetura
- reestruturar toda a navegação do app
- misturar esta correção com o Django Admin `/admin/` do backend
- mexer em memberships ou modularização
- criar regras novas para todos os módulos
- fazer “limpeza geral” aproveitando a chance

---

# 5. Ordem exata de implementação

Aplicar exatamente nesta ordem:

1. localizar todos os pontos do frontend que liberam `/admin`
2. garantir que a sessão do frontend tenha `is_superuser`
3. alterar `RequireAdminRoute` para exigir `is_superuser`
4. alterar `AdminLoginRoute` para exigir `is_superuser`
5. revisar navegação/links que apontem para `/admin`
6. ajustar qualquer helper/hook auxiliar que ainda trate `is_global_admin` como suficiente
7. criar testes automáticos
8. validar manualmente com:
   - superuser
   - usuário comum
   - admin local
   - `is_global_admin` sem superuser

Não inverter a ordem.

---

# 6. Microetapa 1 — Localizar todos os pontos que liberam `/admin`

## Arquivo alvo principal
`frontend/src/App.jsx`

## Ação obrigatória
Localizar no arquivo:
- `RequireAdminRoute`
- `AdminLoginRoute`
- qualquer redirecionamento para `/admin`
- qualquer lógica equivalente em `RootRedirect` ou função auxiliar

## O que confirmar
Confirmar que hoje o acesso está condicionado a:
- `session.user?.is_global_admin`

## Critério de aceite
O aplicador sabe exatamente quais trechos controlam a entrada na área React `/admin`.

---

# 7. Microetapa 2 — Garantir que a sessão contém `is_superuser`

## Objetivo
Não adianta o frontend exigir `is_superuser` se esse campo não vier no payload/sessão.

## Ação obrigatória
Verificar onde a sessão do usuário é montada:
- login
- refresh de perfil
- update do usuário atual
- endpoint `/api/usuarios/me/`, se for usado para atualizar sessão

## Regra obrigatória
A sessão do frontend precisa ter um campo confiável:
- `is_superuser`

## Se o campo já existir
Não renomear. Apenas usar.

## Se o campo ainda não existir
Adicionar no payload e no objeto de usuário retornado ao frontend.

## O que não fazer
- não inferir superuser no frontend
- não calcular isso com base em `is_global_admin`
- não usar `nivel_acesso` como substituto

## Critério de aceite
O frontend possui `session.user.is_superuser` de forma explícita e confiável.

---

# 8. Microetapa 3 — Alterar `RequireAdminRoute`

## Arquivo alvo
`frontend/src/App.jsx`

## Ponto atual
Hoje a rota admin React libera acesso com base em `session.user?.is_global_admin`.

## Instrução literal
Alterar `RequireAdminRoute` para:
- permitir acesso apenas se `session.user?.is_superuser` for verdadeiro;
- negar ou redirecionar qualquer outro caso.

## Regra obrigatória
Não usar mais `is_global_admin` como condição suficiente para entrar em `/admin`.

## Regra de redirecionamento
Quando não for superuser:
- redirecionar para a área apropriada do app
- ou voltar para a tela de login/admin login, conforme o fluxo atual
- manter coerência com a experiência já existente

## O que não fazer
- não deixar fallback silencioso para `is_global_admin`
- não misturar isso com `nivel_acesso`
- não tentar resolver a navegação inteira agora

## Critério de aceite
Somente sessão com `is_superuser = true` atravessa `RequireAdminRoute`.

---

# 9. Microetapa 4 — Alterar `AdminLoginRoute`

## Arquivo alvo
`frontend/src/App.jsx`

## Ponto atual
Hoje o fluxo de `AdminLoginRoute` considera `is_global_admin` suficiente para redirecionar para `/admin`.

## Instrução literal
Alterar `AdminLoginRoute` para:
- redirecionar para `/admin` apenas se `session.user?.is_superuser` for verdadeiro;
- impedir que `is_global_admin` sozinho redirecione para `/admin`.

## Regra importante
O login admin React deve parar de tratar “admin global do produto” como equivalente a “superuser do Django”.

## Critério de aceite
A rota de login admin React só leva ao painel admin quando o usuário for realmente superuser.

---

# 10. Microetapa 5 — Revisar `RootRedirect` e destinos automáticos

## Objetivo
Garantir que nenhum redirecionamento implícito jogue usuários errados em `/admin`.

## Arquivo alvo principal
`frontend/src/App.jsx`

## Ação obrigatória
Revisar funções de redirecionamento automático como:
- `resolveMemberDestination`
- `RootRedirect`
- qualquer helper que envie usuário para `/admin`

## Regra obrigatória
Substituir decisões baseadas em `is_global_admin` por decisão baseada em `is_superuser`, se o destino for a área React `/admin`.

## O que não fazer
- não alterar destino da área comum `/app`
- não mudar fluxo geral do membro além do necessário
- não misturar lógica de ministério aqui

## Critério de aceite
Nenhum redirecionamento automático envia usuário não-superuser para `/admin`.

---

# 11. Microetapa 6 — Revisar links ou menus que apontem para `/admin`

## Objetivo
Evitar que a UI continue oferecendo acesso visual indevido.

## Ação obrigatória
Localizar botões, menus, atalhos ou links que levem para `/admin`.

## Regra obrigatória
Esses elementos só devem aparecer quando:
- `user.is_superuser == true`

## Importante
Neste hotfix, o critério visual deve coincidir com o critério da rota.
Não adianta esconder para um e deixar a rota liberar outro.

## Critério de aceite
A UI não convida usuários não-superuser a entrar em `/admin`.

---

# 12. Microetapa 7 — Revisar `usePermissions` sem fazer refactor geral

## Arquivo alvo
`frontend/src/hooks/usePermissions.js`

## Diagnóstico atual
Hoje o hook marca `isGlobalAdmin` com base em `user?.is_global_admin`.

## Regra deste hotfix
Não precisa reescrever todo o hook.

## Ação obrigatória
Verificar se alguma parte do frontend admin React usa `usePermissions()` como justificativa para liberar a área `/admin`.

## Se usar
Ajustar somente o necessário para que a área `/admin` não dependa de `isGlobalAdmin`.

## O que não fazer
- não reestruturar todas as permissions do app agora
- não mudar permissões do módulo de música neste hotfix

## Critério de aceite
Nenhum fluxo de acesso à área React `/admin` depende apenas de `is_global_admin`.

---

# 13. Microetapa 8 — Garantir consistência entre login e refresh de perfil

## Objetivo
Evitar que o login diga uma coisa e o refresh do usuário diga outra.

## Ação obrigatória
Se o app:
- cria a sessão no login
- e depois faz refresh via `/api/usuarios/me/`

então os dois pontos devem manter coerência no campo:
- `is_superuser`

## Regra
Se `updateUser(profile)` for usado depois do login, esse `profile` também precisa carregar `is_superuser`.

## O que não fazer
- não deixar o login conter `is_superuser` e o refresh remover esse campo
- não deixar a sessão perder esse valor no meio do uso

## Critério de aceite
Após login e refresh de perfil, `session.user.is_superuser` continua correto.

---

# 14. Microetapa 9 — Criar testes automáticos de rota React admin

## Objetivo
Garantir que esse erro não volte.

## Arquivos sugeridos
Na suíte de testes do frontend, criar testes para a proteção da rota admin.

## Casos mínimos obrigatórios

### Caso 1
Usuário com `is_superuser = true`
- deve conseguir acessar `/admin`

### Caso 2
Usuário com `is_global_admin = true`, mas `is_superuser = false`
- deve ser bloqueado de `/admin`

### Caso 3
Usuário com `nivel_acesso = 1`, mas `is_superuser = false`
- deve ser bloqueado de `/admin`

### Caso 4
Usuário comum
- deve ser bloqueado de `/admin`

### Caso 5
Rota de login admin não deve redirecionar para `/admin` se o usuário não for superuser

## Critério de aceite
Todos os cenários acima passam.

---

# 15. Microetapa 10 — Fazer validação manual no ambiente local

## Objetivo
Conferir o comportamento real da interface.

## Teste manual obrigatório
Testar com quatro contas:

### Conta A — superuser real (`admin`)
- deve entrar em `/admin`

### Conta B — usuário comum
- não deve entrar em `/admin`

### Conta C — usuário administrativo local (`nivel_acesso == 1`)
- não deve entrar em `/admin`

### Conta D — usuário com `is_global_admin = true`, mas sem superuser
- não deve entrar em `/admin`

## Regra de decisão
Se qualquer conta diferente do superuser entrar em `/admin`, o hotfix falhou.

---

# 16. Microetapa 11 — Validar que a área comum do app não quebrou

## Objetivo
Garantir que o hotfix foi cirúrgico.

## Ações obrigatórias
Validar depois da mudança:
- login comum
- área `/app`
- módulo de música
- navegação principal
- páginas comuns de perfil, membros, cultos e músicas, conforme o perfil

## Regra
Este hotfix não deve quebrar o produto principal.
Ele apenas deve restringir a área React `/admin`.

## Critério de aceite
O app continua funcional e somente `/admin` fica restrita ao superuser.

---

# 17. Checklist operacional fechado

## Backend / Sessão
- [ ] Confirmar que o payload/sessão contém `is_superuser`
- [ ] Confirmar que o refresh de perfil mantém `is_superuser`

## Frontend
- [ ] Localizar `RequireAdminRoute`
- [ ] Localizar `AdminLoginRoute`
- [ ] Localizar redirecionamentos automáticos para `/admin`
- [ ] Localizar links visuais para `/admin`
- [ ] Alterar tudo para depender de `is_superuser`
- [ ] Revisar `usePermissions` apenas no necessário
- [ ] Criar testes automáticos

## Validação
- [ ] Testar superuser em `/admin`
- [ ] Testar usuário comum em `/admin`
- [ ] Testar admin local em `/admin`
- [ ] Testar `is_global_admin` não-superuser em `/admin`
- [ ] Testar app principal

---

# 18. Critérios de aceite finais e inegociáveis

Este hotfix só pode ser dado como concluído se todos os itens abaixo forem verdadeiros:

1. a rota React `/admin` só aceita `is_superuser = true`
2. `is_global_admin` sozinho não libera mais `/admin`
3. `nivel_acesso` sozinho não libera mais `/admin`
4. a rota de login admin React só redireciona superuser
5. redirecionamentos automáticos não enviam não-superuser para `/admin`
6. a UI não mostra acesso admin para não-superuser
7. os testes automáticos passam
8. o app principal continua funcionando

---

# 19. Sinais de implementação errada

Se qualquer um destes acontecimentos ocorrer, a implementação saiu do trilho:

- o aplicador focou no Django Admin em vez da área React
- o aplicador deixou `is_global_admin` como fallback silencioso
- o aplicador não garantiu `is_superuser` na sessão
- o aplicador corrigiu a rota mas esqueceu o redirecionamento
- o aplicador corrigiu a rota mas esqueceu os links visuais
- o aplicador reescreveu o sistema inteiro de permissões
- o aplicador quebrou o módulo de música
- o aplicador misturou este hotfix com os blocos grandes

Se isso acontecer:
- parar
- desfazer o excesso
- voltar para o escopo deste documento

---

# 20. Instrução final ao aplicador

A função deste hotfix é muito simples:

## Faça somente isto
- feche a área React `/admin` para qualquer usuário que não seja superuser
- garanta que o frontend use `is_superuser`
- valide login, redirecionamentos, UI e testes

## Não faça mais do que isso
Este hotfix não é uma reforma de permissões.
É uma correção cirúrgica de acesso à área admin do site principal.

## Regra final
Para a área React `/admin`:
- **entra apenas superuser**
- **todo o resto é bloqueado**
