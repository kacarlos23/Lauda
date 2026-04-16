# Lauda

Backend Django refatorado para uma arquitetura orientada a dominio, com compatibilidade gradual para o legado via app `api`.

## Visao geral
O projeto foi reorganizado em apps por dominio:
- `accounts`
- `institutions`
- `music`
- `events`
- `system`

O app `backend/api/` permanece ativo apenas como shim de compatibilidade para registry, migrations e rotas legadas. Novas regras de negocio nao devem ser implementadas nele.

## Estrutura principal
- `backend/core/settings.py`: configuracoes globais, DRF, JWT, logging
- `backend/core/urls.py`: rotas canonicas por dominio e aliases legados
- `backend/accounts/`: usuarios, autenticacao, impersonacao, invalidao de token
- `backend/institutions/`: igrejas, ministerios, vinculos e convites
- `backend/music/`: musicas e itens de setlist
- `backend/events/`: eventos, cultos e escalas
- `backend/system/`: auditoria, grants, modulos e tratamento global de erros
- `frontend/`: cliente web

## Setup local
### Backend
1. Entre na pasta do backend:
   - `cd backend`
2. Crie e ative um ambiente virtual se necessario:
   - Windows PowerShell: `python -m venv .venv`
   - Windows PowerShell: `.\.venv\Scripts\Activate.ps1`
3. Instale as dependencias:
   - `pip install -r requirements.txt`
4. Configure o ambiente:
   - copie `.env.example` para `.env`
   - ajuste `SECRET_KEY`, `DATABASE_URL`, origens CORS e credenciais externas se necessario
5. Rode as migrations:
   - `python manage.py migrate`
6. Crie um superusuario:
   - `python manage.py createsuperuser`
7. Inicie o servidor:
   - `python manage.py runserver`

### Frontend
1. Em outra aba do terminal, volte para a raiz do projeto
2. Entre em `frontend/`
3. Instale dependencias conforme o gerenciador usado no projeto
4. Aponte a camada HTTP para o backend local

## Contratos importantes da v2
### Paginacao obrigatoria
Todas as listagens DRF retornam:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

No frontend, nao assuma mais que `response.data` e um array. Use `response.data.results`.

### URLs canonicas por dominio
- `/api/accounts/...`
- `/api/institutions/...`
- `/api/music/...`
- `/api/events/...`
- `/api/system/...`

Rotas legadas continuam expostas em paralelo por compatibilidade, mas novos consumidores devem usar apenas as rotas canonicas.

### JWT blacklist
Refresh tokens ativos sao invalidados automaticamente quando ocorrem mudancas criticas de permissao, perfil ou vinculo de ministerio.

### Usuario.ministerio
O antigo FK direto foi removido como fonte primaria de verdade. Hoje:
- `usuario.ministerio` e uma `@property`
- o dado persistido de escopo vem de `VinculoMinisterioUsuario`

## Compatibilidade com o legado
O modo atual e de coexistencia segura:
- `backend/api/models.py` reexporta models dos novos apps
- `backend/api/apps.py` resolve `api.Model` no registry
- tabelas seguem com nomes historicos `api_*` via `db_table`

Isso permite evoluir o backend sem renomear tabelas nem quebrar migrations antigas.

## Documentacao
- `ARCHITECTURE.md`: arquitetura backend, decisoes e estrategia de coexistencia
- `PERMISSIONS_GUIDE.md`: grants granulares e regras de acesso
- `FRONTEND_MIGRATION_GUIDE.md`: breaking changes para o frontend
- `docs/api_refatorada_v2.md`: resumo da superficie de API

## Validacao rapida
Com o ambiente virtual ativo:
- `python manage.py check`
- `python manage.py test system.tests.test_refactor_validation -v 2`

## Observacoes para novos desenvolvedores
- nao use `backend/api/` como fonte primaria de logica
- nao altere FKs string legadas `api.*` sem plano de migracao completo
- nao remova `db_table` dos models atuais
- prefira sempre os apps por dominio para views, serializers, services e testes
