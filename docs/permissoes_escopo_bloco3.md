# Lauda - Bloco 3

## Inventario atual de permissao
- `is_global_admin`: usado no backend em [backend/api/views.py](/c:/Users/092687/Documents/Dev/Lauda/backend/api/views.py) para distinguir autoridade global e no frontend em [frontend/src/App.jsx](/c:/Users/092687/Documents/Dev/Lauda/frontend/src/App.jsx) e [frontend/src/hooks/usePermissions.js](/c:/Users/092687/Documents/Dev/Lauda/frontend/src/hooks/usePermissions.js).
- `is_superuser`: usado para acesso React `/admin` e como autoridade maxima de plataforma.
- `nivel_acesso`: usado como fallback legado local para admin (`1`), lider (`2`) e membro (`3`).
- Permission classes legadas: `IsAdminLevel`, `IsGlobalAdmin`, `IsMusicEditor`, `IsAuthenticatedReadOnlyOrAdminLevel`, `IsAuthenticatedReadOnlyOrMusicEditor` em [backend/api/views.py](/c:/Users/092687/Documents/Dev/Lauda/backend/api/views.py).
- Guards e UI legados: `RequireAdminRoute`, `RequireMemberRoute`, `RequireOperationalAdminRoute` e `usePermissions` em [frontend/src/App.jsx](/c:/Users/092687/Documents/Dev/Lauda/frontend/src/App.jsx) e [frontend/src/hooks/usePermissions.js](/c:/Users/092687/Documents/Dev/Lauda/frontend/src/hooks/usePermissions.js).

## Escopos oficiais
- `platform`
- `church`
- `ministry`
- `module`

## Papeis oficiais
- `platform_super_admin`
- `church_admin`
- `ministry_admin`
- `ministry_leader`
- `member`

## Mapeamento legado para a camada nova
- `is_superuser=True` ou `is_global_admin=True` => `platform_super_admin`
- `VinculoIgrejaUsuario.papel_institucional=CHURCH_ADMIN` => `church_admin`
- `VinculoMinisterioUsuario.papel_no_ministerio=MINISTRY_ADMIN` => `ministry_admin`
- `VinculoMinisterioUsuario.papel_no_ministerio=MINISTRY_LEADER` => `ministry_leader`
- `nivel_acesso == 1` => fallback `ministry_admin`
- `nivel_acesso == 2` => fallback `ministry_leader`
- `nivel_acesso == 3` => fallback `member`

## Capabilities principais
- `manage_platform`
- `manage_church`
- `manage_ministry`
- `view_members`
- `manage_members`
- `view_music_module`
- `manage_music`
- `manage_cultos`
- `manage_escalas`
- `manage_setlists`
- `view_auditoria`
