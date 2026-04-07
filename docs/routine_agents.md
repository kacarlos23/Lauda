# Routine Agents

Esta automacao cria quatro agentes de revisao que podem rodar apos alteracoes locais de codigo:

- Seguranca Multi-Tenant
- QA UI UX
- Performance Django
- Tech Lead Review

## O que foi configurado

- `tools/routine_agents/run.py`: runner local dos agentes.
- `tools/routine_agents/config.json`: configuracao de modelo, watch e screenshot.
- `tools/routine_agents/install-hook.ps1`: instala um hook `post-commit`.
- `package.json`: atalhos para rodar manualmente, em watch e instalar hook.

## Como usar

1. Defina `OPENAI_API_KEY`.
2. Ajuste `tools/routine_agents/config.json` se quiser trocar modelo, paths observados ou a estrategia de screenshot.
3. Rode um dos comandos:

```powershell
npm run agents:dry-run
npm run agents:run
npm run agents:watch
npm run agents:install-hook
```

## Fluxos disponiveis

- `agents:watch`: monitora `backend/api`, `frontend/src` e `docs` e dispara os agentes a cada alteracao relevante.
- `agents:run`: analisa os arquivos alterados em relacao ao `HEAD`.
- `agents:dry-run`: gera apenas os prompts e o pacote de contexto, sem chamar a API.
- `agents:install-hook`: instala um hook `post-commit` para revisar alteracoes commitadas.

## QA visual com Playwright

O agente de UI UX precisa de screenshot. Para habilitar, configure `ui_review.screenshot_command` e `ui_review.screenshot_path` no arquivo `tools/routine_agents/config.json`.

Exemplo de comando:

```json
{
  "ui_review": {
    "enabled": true,
    "review_url": "http://localhost:5173/dashboard",
    "screenshot_path": ".ai-reviews/review-dashboard.png",
    "screenshot_command": "npx playwright test tests/visual-review-dashboard.spec.ts"
  }
}
```

Exemplo de teste sugerido:

```ts
test('visual-review-dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await page.screenshot({ path: '.ai-reviews/review-dashboard.png', fullPage: true });
});
```

Se a screenshot nao existir, o agente de UI UX registra um relatorio de skip em vez de falhar silenciosamente.

## Saida

Cada execucao cria uma pasta em `.ai-reviews/<timestamp>/` com:

- `summary.md`
- um `.md` por agente
- um `.json` bruto por resposta da API quando a execucao nao e `dry-run`

## Observacoes

- O runner envia apenas os arquivos alterados e um diff resumido para controlar custo.
- O agente de seguranca revisa alteracoes Django e React relacionadas a views, serializers e componentes.
- O agente de performance roda apenas em arquivos Django.
- O agente de Tech Lead roda em backend e frontend.
