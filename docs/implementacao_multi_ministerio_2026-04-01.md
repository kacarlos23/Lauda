# Implementacao Multi-Ministerio - 2026-04-01

## Escopo concluido

### Backend
- criado schema base multi-ministerio com `Ministerio` e `ConviteMinisterio`
- adicionado `ministerio_id` em `Usuario`, `Musica`, `Culto`, `Escala` e `ItemSetlist`
- adicionado suporte a `is_global_admin` e `invite_accepted_at` em `Usuario`
- criadas rotas:
  - `POST /api/auth/login/`
  - `POST /api/auth/admin/login/`
  - `POST /api/auth/token/refresh/`
  - `GET /api/auth/invites/:code/`
  - `POST /api/auth/invites/accept/`
- criado CRUD inicial para `ministerios` e `convites`
- aplicado escopo automatico por `ministerio_id` nos principais viewsets
- bloqueado acesso cruzado entre ministerios em musicas, cultos, escalas, setlists, usuarios e auditoria
- criada migration de backfill para ministerio inicial e vinculacao de dados legados

### Frontend
- reestruturado roteamento para:
  - `/login`
  - `/admin/login`
  - `/invite/:code`
  - `/app/*`
  - `/admin/*`
- criado contexto de sessao/auth no frontend
- login de ministerio e login admin agora usam endpoints separados
- criada tela publica de convite com aceite de acesso
- criado painel global inicial para admin com:
  - metricas gerais
  - criacao de ministerio
  - geracao de convite
  - lista de ministerios
  - lista de convites recentes
- header/sidebar agora exibem o contexto atual do ministerio ou do painel global

## Arquivos principais alterados

### Backend
- `backend/api/models.py`
- `backend/api/views.py`
- `backend/api/serializers.py`
- `backend/api/urls.py`
- `backend/api/admin.py`
- `backend/api/tests.py`
- `backend/core/urls.py`
- `backend/api/migrations/0006_ministerio_usuario_invite_accepted_at_and_more.py`
- `backend/api/migrations/0007_seed_default_ministry.py`

### Frontend
- `frontend/src/App.jsx`
- `frontend/src/App.css`
- `frontend/src/main.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Invite.jsx`
- `frontend/src/pages/Invite.css`
- `frontend/src/pages/AdminDashboard.jsx`
- `frontend/src/pages/AdminDashboard.css`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/lib/api.js`
- `frontend/src/lib/session.js`

## Validacao executada
- `python manage.py makemigrations --check`: ok
- `python manage.py migrate`: ok
- `python manage.py test api --keepdb`: ok
- `npm run lint`: ok
- `npm run build`: ok

## Impacto operacional
- a migration `0007_seed_default_ministry.py` cria o ministerio legado `ministerio-inicial` e associa dados antigos a ele
- superusuarios existentes passam a ser tratados como admin global
- o frontend antigo que dependia apenas de `/api/token/` ainda continua compatível por causa da rota legada, mas a interface nova usa as rotas novas de auth

## Pendencias nao bloqueantes
- a tela de membros ainda permite criacao direta de usuarios; o fluxo novo de convite ja existe, mas a UX da pagina ainda pode ser alinhada para priorizar convites
- o dashboard de admin global ainda esta em versao inicial; falta expandir edicao/exclusao de ministerios e impersonate
- o bundle do frontend continua acima de 500 kB apos minificacao; o build passa, mas vale code splitting depois
