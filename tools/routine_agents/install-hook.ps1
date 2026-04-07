param()

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
$hookDir = Join-Path $root ".git\\hooks"
$hookPath = Join-Path $hookDir "post-commit"

if (!(Test-Path $hookDir)) {
    throw "Diretorio de hooks nao encontrado: $hookDir"
}

$hookContent = @"
#!/bin/sh
python tools/routine_agents/run.py --source git-post-commit || true
"@

Set-Content -LiteralPath $hookPath -Value $hookContent -Encoding ascii
Write-Host "Hook instalado em $hookPath"
