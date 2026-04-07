from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("config.json")
SUPPORTED_CODE_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".css"}
DEFAULT_WATCH_PATHS = ["backend/api", "frontend/src", "docs"]
DEFAULT_IGNORE_DIRS = {
    ".git",
    ".ai-reviews",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
}


SECURITY_PROMPT = """Atue como Especialista em Seguranca de Aplicacoes Multi-Tenant. Analise o codigo abaixo (View/Serializer/Componente).
- Verifique se existe qualquer query que busque dados (Eventos, Musicas, Usuarios) sem filtrar obrigatoriamente pelo ministry_id do usuario logado.
- Identifique se ha exposicao de access_code para usuarios sem permissao Leader/Admin.
- Simule um ataque onde um usuario do Ministerio A tenta acessar ID do Ministerio B. O codigo previne isso?
- Aponte vulnerabilidades de IDOR (Insecure Direct Object Reference).
Se encontrar riscos, reescreva o codigo com a correcao de seguranca.

Formato da resposta:
1. Resumo executivo curto.
2. Achados priorizados com severidade, arquivo e trecho afetado.
3. Simulacao do ataque multi-tenant.
4. Codigo corrigido ou diff sugerido, apenas se houver risco real.
5. Se nao houver risco, diga explicitamente "Nenhum risco relevante encontrado".
"""


UI_UX_PROMPT = """Atue como QA de UI/UX. Analise esta captura de tela gerada pelo Playwright da aplicacao React.
- Dark Mode: Os textos estao legiveis? Ha contraste suficiente? Os inputs de link no modal de musica estao visiveis?
- Layout: O conteudo esta sendo cortado pelo Header fixo? A Sidebar esta apenas com icones?
- Modal: O modal de 'Funcoes' esta centralizado? O grid 2x2 dos links esta correto?
- Mobile: A responsividade parece quebrada em alguma margem?
Liste qualquer desvio do padrao de design estabelecido.

Formato da resposta:
1. Veredito geral.
2. Desvios encontrados, com severidade e evidencia visual.
3. Itens aprovados.
4. Recomendacoes objetivas para correcoes de UI.
"""


PERFORMANCE_PROMPT = """Atue como Engenheiro de Performance Django. Analise este ViewSet ou QuerySet.
- Identifique potenciais problemas N+1 ao acessar relacoes (ex: song.artist, ministry.leaders).
- Sugira o uso correto de select_related ou prefetch_related.
- Verifique se os indices no PostgreSQL estao adequados para os filtros de ministry_id e access_code.
- O numero de queries e aceitavel para uma lista com 100 itens? Otimize se necessario.

Formato da resposta:
1. Diagnostico de performance.
2. Potenciais N+1 e queries extras.
3. Otimizacoes concretas de ORM e banco.
4. Codigo sugerido, apenas se houver ganho real.
5. Se nao houver problema relevante, diga explicitamente "Sem gargalos relevantes identificados".
"""


TECH_LEAD_PROMPT = """Atue como Tech Lead. Revise este trecho de codigo (React ou Python).
- Padroes: Esta seguindo a estrutura de pastas e nomenclatura do projeto?
- Reutilizacao: Existe logica duplicada que deveria estar em um hook customizado ou mixin?
- Tipagem: (Se TypeScript) As interfaces estao corretas? (Se Python) Os type hints estao presentes?
- Tratamento de Erro: As requisicoes API tem tratamento de try/catch e feedback visual adequados?
- Sugira refatoracoes para melhorar a legibilidade e manutenibilidade.

Formato da resposta:
1. Principais achados.
2. Divida por padroes, reutilizacao, tipagem e tratamento de erro.
3. Sugestoes de refatoracao priorizadas.
4. Se o trecho estiver consistente, diga explicitamente "Sem desvios arquiteturais relevantes".
"""


@dataclass(frozen=True)
class AgentSpec:
    agent_id: str
    title: str
    prompt: str
    needs_backend: bool = False
    needs_frontend: bool = False
    needs_screenshot: bool = False
    allow_css_only: bool = False

    def should_run(self, changed_files: list[str]) -> bool:
        backend_files = [path for path in changed_files if is_backend_file(path)]
        frontend_files = [path for path in changed_files if is_frontend_file(path)]

        if self.needs_backend and not backend_files:
            return False
        if self.needs_frontend and not frontend_files:
            return False
        if self.needs_frontend and not self.allow_css_only:
            if frontend_files and not any(Path(path).suffix.lower() in {".js", ".jsx", ".ts", ".tsx"} for path in frontend_files):
                return False
        return True

    def select_files(self, changed_files: list[str], max_files: int) -> list[str]:
        picked: list[str] = []
        for path in changed_files:
            if self.needs_backend and is_backend_file(path):
                picked.append(path)
                continue
            if self.needs_frontend and is_frontend_file(path):
                if self.allow_css_only or Path(path).suffix.lower() in {".js", ".jsx", ".ts", ".tsx"}:
                    picked.append(path)

        if not self.needs_backend and not self.needs_frontend:
            picked = [
                path
                for path in changed_files
                if Path(path).suffix.lower() in {".py", ".js", ".jsx", ".ts", ".tsx"}
            ]

        return picked[:max_files]


AGENTS = [
    AgentSpec(
        agent_id="security-multi-tenant",
        title="Seguranca Multi-Tenant",
        prompt=SECURITY_PROMPT,
    ),
    AgentSpec(
        agent_id="qa-ui-ux",
        title="QA UI UX",
        prompt=UI_UX_PROMPT,
        needs_frontend=True,
        needs_screenshot=True,
        allow_css_only=True,
    ),
    AgentSpec(
        agent_id="django-performance",
        title="Performance Django",
        prompt=PERFORMANCE_PROMPT,
        needs_backend=True,
    ),
    AgentSpec(
        agent_id="tech-lead-review",
        title="Tech Lead Review",
        prompt=TECH_LEAD_PROMPT,
    ),
]


def load_config() -> dict:
    defaults = {
        "model": os.getenv("ROUTINE_AGENTS_MODEL", "gpt-5.4-mini"),
        "api_url": os.getenv("ROUTINE_AGENTS_API_URL", "https://api.openai.com/v1/responses"),
        "output_dir": ".ai-reviews",
        "watch_paths": DEFAULT_WATCH_PATHS,
        "poll_interval_seconds": 2,
        "debounce_seconds": 2,
        "max_file_bytes": 24000,
        "max_diff_chars": 18000,
        "max_files_per_agent": 8,
        "ui_review": {
            "enabled": True,
            "review_url": "http://localhost:5173/dashboard",
            "screenshot_path": ".ai-reviews/review-dashboard.png",
            "screenshot_command": "",
        },
    }
    if not CONFIG_PATH.exists():
        return defaults

    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        custom = json.load(handle)

    ui_review = defaults["ui_review"].copy()
    ui_review.update(custom.get("ui_review", {}))
    defaults.update(custom)
    defaults["ui_review"] = ui_review
    return defaults


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Executa agentes de rotina sobre arquivos alterados.")
    parser.add_argument("--watch", action="store_true", help="Monitora alteracoes locais continuamente.")
    parser.add_argument("--dry-run", action="store_true", help="Nao chama a API; salva apenas os prompts.")
    parser.add_argument("--source", default="manual", help="Origem do disparo para auditoria local.")
    parser.add_argument("--files", nargs="*", default=None, help="Arquivos especificos para revisar.")
    return parser.parse_args()


def run_command(args: list[str]) -> str:
    process = subprocess.run(
        args,
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        check=False,
    )
    if process.returncode != 0:
        return ""
    return process.stdout.strip()


def get_changed_files_from_git() -> list[str]:
    tracked = run_command(["git", "diff", "--name-only", "HEAD", "--"])
    tracked_paths = [normalize_repo_path(line) for line in tracked.splitlines() if line.strip()]

    status_output = run_command(["git", "status", "--porcelain"])
    untracked_paths: list[str] = []
    for line in status_output.splitlines():
        if len(line) < 4:
            continue
        path = line[3:].strip()
        if path:
            untracked_paths.append(normalize_repo_path(path))

    combined = []
    for path in tracked_paths + untracked_paths:
        if path and path not in combined and is_relevant_file(path):
            combined.append(path)
    return combined


def normalize_repo_path(path: str) -> str:
    return Path(path).as_posix()


def is_relevant_file(path: str) -> bool:
    suffix = Path(path).suffix.lower()
    if suffix not in SUPPORTED_CODE_EXTENSIONS:
        return False
    return is_backend_file(path) or is_frontend_file(path)


def is_backend_file(path: str) -> bool:
    normalized = normalize_repo_path(path)
    return normalized.startswith("backend/api/") and Path(normalized).suffix.lower() in {".py"}


def is_frontend_file(path: str) -> bool:
    normalized = normalize_repo_path(path)
    return normalized.startswith("frontend/src/") and Path(normalized).suffix.lower() in {".js", ".jsx", ".ts", ".tsx", ".css"}


def get_git_diff(files: list[str], max_chars: int) -> str:
    if not files:
        return "Sem diff disponivel."
    diff_output = run_command(["git", "diff", "--unified=3", "HEAD", "--", *files])
    if not diff_output:
        return "Sem diff disponivel."
    if len(diff_output) <= max_chars:
        return diff_output
    return diff_output[:max_chars] + "\n\n[diff truncado]"


def read_file_excerpt(repo_path: str, max_bytes: int) -> str:
    absolute_path = ROOT_DIR / repo_path
    if not absolute_path.exists():
        return f"[arquivo removido do working tree: {repo_path}]"

    raw = absolute_path.read_bytes()
    truncated = raw[:max_bytes]
    text = truncated.decode("utf-8", errors="replace")
    if len(raw) > max_bytes:
        text += "\n\n[conteudo truncado]"
    return text


def build_review_payload(agent: AgentSpec, files: list[str], config: dict, screenshot_path: Path | None) -> tuple[str, list[dict]]:
    diff_text = get_git_diff(files, config["max_diff_chars"])
    file_sections = []
    for repo_path in files:
        excerpt = read_file_excerpt(repo_path, config["max_file_bytes"])
        file_sections.append(f"Arquivo: {repo_path}\n```text\n{excerpt}\n```")

    context = [
        "Contexto do projeto:",
        "- Monorepo com Django em backend/api e React em frontend/src.",
        "- O objetivo desta rotina e revisar apenas os arquivos alterados no working tree.",
        "",
        "Arquivos alterados nesta rodada:",
        *[f"- {path}" for path in files],
        "",
        "Diff relevante:",
        "```diff",
        diff_text,
        "```",
        "",
        "Conteudo dos arquivos alterados:",
        *file_sections,
        "",
        "Instrucoes especificas do agente:",
        agent.prompt.strip(),
    ]

    user_content = [{"type": "input_text", "text": "\n".join(context)}]
    if screenshot_path is not None and screenshot_path.exists():
        user_content.append(
            {
                "type": "input_image",
                "image_url": build_data_url(screenshot_path),
            }
        )
    return agent.prompt.strip(), user_content


def build_data_url(path: Path) -> str:
    mime_type, _ = mimetypes.guess_type(path.name)
    mime_type = mime_type or "image/png"
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{payload}"


def call_openai(api_url: str, model: str, system_text: str, user_content: list[dict]) -> tuple[str, dict]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY nao definido.")

    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": system_text}],
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
        "max_output_tokens": 2400,
    }
    request = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Falha na API da OpenAI ({error.code}): {body}") from error

    decoded = json.loads(body)
    return extract_response_text(decoded), decoded


def extract_response_text(payload: dict) -> str:
    if payload.get("output_text"):
        return str(payload["output_text"]).strip()

    chunks: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            content_type = content.get("type")
            if content_type == "output_text" and content.get("text"):
                chunks.append(str(content["text"]))
            elif content_type == "text" and content.get("text"):
                chunks.append(str(content["text"]))

    if chunks:
        return "\n".join(chunks).strip()

    return json.dumps(payload, indent=2, ensure_ascii=False)


def ensure_output_dir(config: dict) -> Path:
    output_dir = ROOT_DIR / config["output_dir"]
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def maybe_capture_screenshot(config: dict) -> Path | None:
    ui_review = config.get("ui_review", {})
    if not ui_review.get("enabled", True):
        return None

    screenshot_command = str(ui_review.get("screenshot_command", "")).strip()
    screenshot_path = ROOT_DIR / str(ui_review.get("screenshot_path", ".ai-reviews/review-dashboard.png"))
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)

    if screenshot_command:
        process = subprocess.run(
            screenshot_command,
            cwd=ROOT_DIR,
            shell=True,
            check=False,
            capture_output=True,
            text=True,
        )
        if process.returncode != 0:
            print(f"[routine-agents] Falha ao gerar screenshot: {process.stderr.strip()}", file=sys.stderr)
            return None

    if screenshot_path.exists():
        return screenshot_path

    return None


def save_report(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def run_agents(changed_files: list[str], config: dict, dry_run: bool, source: str) -> int:
    changed_files = [normalize_repo_path(path) for path in changed_files if is_relevant_file(path)]
    if not changed_files:
        print("[routine-agents] Nenhum arquivo relevante alterado.")
        return 0

    output_root = ensure_output_dir(config)
    run_stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = output_root / run_stamp
    run_dir.mkdir(parents=True, exist_ok=True)

    frontend_touched = any(is_frontend_file(path) for path in changed_files)
    screenshot_path = maybe_capture_screenshot(config) if frontend_touched else None
    summary_lines = [
        f"Fonte: {source}",
        "Arquivos revisados:",
        *[f"- {path}" for path in changed_files],
        "",
    ]

    for agent in AGENTS:
        if not agent.should_run(changed_files):
            continue

        selected_files = agent.select_files(changed_files, config["max_files_per_agent"])
        if not selected_files:
            continue

        report_path = run_dir / f"{agent.agent_id}.md"
        if agent.needs_screenshot and screenshot_path is None:
            skip_message = (
                f"# {agent.title}\n\n"
                "Revisao pulada: nenhuma screenshot foi encontrada.\n\n"
                "Configure `ui_review.screenshot_command` e `ui_review.screenshot_path` em "
                "`tools/routine_agents/config.json` para habilitar a analise visual.\n"
            )
            save_report(report_path, skip_message)
            summary_lines.append(f"- {agent.title}: pulado (sem screenshot)")
            continue

        system_text, user_content = build_review_payload(agent, selected_files, config, screenshot_path if agent.needs_screenshot else None)

        if dry_run:
            prompt_dump = [
                f"# {agent.title}",
                "",
                "## System",
                system_text,
                "",
                "## User",
                json.dumps(user_content, indent=2, ensure_ascii=False),
            ]
            save_report(report_path, "\n".join(prompt_dump))
            summary_lines.append(f"- {agent.title}: prompt salvo")
            continue

        try:
            response_text, raw_payload = call_openai(config["api_url"], config["model"], system_text, user_content)
        except Exception as error:  # pragma: no cover
            error_report = f"# {agent.title}\n\nErro ao executar agente: {error}\n"
            save_report(report_path, error_report)
            summary_lines.append(f"- {agent.title}: erro")
            continue

        metadata_path = run_dir / f"{agent.agent_id}.json"
        save_report(report_path, f"# {agent.title}\n\n{response_text}")
        metadata_path.write_text(json.dumps(raw_payload, indent=2, ensure_ascii=False), encoding="utf-8")
        summary_lines.append(f"- {agent.title}: concluido")

    save_report(run_dir / "summary.md", "\n".join(summary_lines))
    print(f"[routine-agents] Relatorios salvos em {run_dir}")
    return 0


def iter_watch_files(paths: Iterable[Path]) -> Iterable[Path]:
    for base_path in paths:
        if not base_path.exists():
            continue
        for path in base_path.rglob("*"):
            if not path.is_file():
                continue
            if any(part in DEFAULT_IGNORE_DIRS for part in path.parts):
                continue
            relative = path.relative_to(ROOT_DIR).as_posix()
            if is_relevant_file(relative):
                yield path


def take_snapshot(paths: Iterable[Path]) -> dict[str, int]:
    snapshot: dict[str, int] = {}
    for path in iter_watch_files(paths):
        relative = path.relative_to(ROOT_DIR).as_posix()
        snapshot[relative] = path.stat().st_mtime_ns
    return snapshot


def diff_snapshot(previous: dict[str, int], current: dict[str, int]) -> list[str]:
    changed = []
    all_paths = set(previous) | set(current)
    for path in sorted(all_paths):
        if previous.get(path) != current.get(path):
            changed.append(path)
    return changed


def watch(config: dict, dry_run: bool, source: str) -> int:
    watch_paths = [ROOT_DIR / relative for relative in config.get("watch_paths", DEFAULT_WATCH_PATHS)]
    previous = take_snapshot(watch_paths)
    pending: set[str] = set()
    last_change_at: float | None = None
    poll_interval = float(config.get("poll_interval_seconds", 2))
    debounce_seconds = float(config.get("debounce_seconds", 2))

    print("[routine-agents] Watch iniciado.")
    while True:
        time.sleep(poll_interval)
        current = take_snapshot(watch_paths)
        changed = diff_snapshot(previous, current)
        previous = current

        if changed:
            pending.update(changed)
            last_change_at = time.monotonic()

        if pending and last_change_at is not None and (time.monotonic() - last_change_at) >= debounce_seconds:
            run_agents(sorted(pending), config=config, dry_run=dry_run, source=source)
            pending.clear()
            last_change_at = None


def main() -> int:
    args = parse_args()
    config = load_config()

    if args.watch:
        return watch(config=config, dry_run=args.dry_run, source=args.source)

    changed_files = [normalize_repo_path(path) for path in args.files] if args.files else get_changed_files_from_git()
    return run_agents(changed_files, config=config, dry_run=args.dry_run, source=args.source)


if __name__ == "__main__":
    raise SystemExit(main())
