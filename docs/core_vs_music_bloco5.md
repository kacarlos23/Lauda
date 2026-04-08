# Core vs Music Module

## Convencao oficial
- `core`: tudo que e institucional, compartilhado e reutilizavel entre modulos.
- `music module`: tudo que depende de regras musicais, repertorio, culto musical, escala ou setlist.

## Inventario atual

### Grupo A — ja e claramente core
- `backend/api/services/institutional_context.py`
- `backend/api/services/authorization.py`
- `backend/api/services/modular_context.py`
- `backend/api/services/access_context.py`
- `backend/api/services/session_payload.py`
- `backend/api/permissions.py`
- `backend/api/view_mixins.py`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/hooks/usePermissions.js`
- `frontend/src/core/auth/access.js`
- `frontend/src/core/routing/guards.jsx`
- `frontend/src/core/layout/AppShell.jsx`
- `frontend/src/lib/api.js`
- `frontend/src/lib/session.js`

### Grupo B — ja e claramente musica
- `backend/api/services/music_facade.py`
- `backend/api/services/music_module.py`
- `frontend/src/pages/Musicas.jsx`
- `frontend/src/pages/Cultos.jsx`
- `frontend/src/pages/Equipes.jsx`
- `frontend/src/modules/music/contracts.js`

### Grupo C — estava misturado e foi separado neste bloco
- payload de sessao e contexto institucional antes definidos em `backend/api/views.py`
- resolucao de escopo ministerial antes definida em `backend/api/views.py`
- enrich de metadados musicais antes definido em `backend/api/views.py`
- shell principal e guardas de rota antes definidos em `frontend/src/App.jsx`
- navegacao especifica de musica antes embutida diretamente em `frontend/src/App.jsx`

## Contrato entre core e musica
- musica consome do core: usuario autenticado, igreja atual, ministerio atual, modulos ativos, capabilities, shell e API base.
- core nao depende de regra musical para funcionar.
- toda funcionalidade nova deve responder primeiro se e institucional compartilhavel ou especifica de musica.
