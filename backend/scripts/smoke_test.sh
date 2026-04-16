#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -x ".venv/Scripts/python.exe" ]; then
  PYTHON=".venv/Scripts/python.exe"
elif [ -x ".venv/bin/python" ]; then
  PYTHON=".venv/bin/python"
else
  PYTHON="python"
fi

echo "Iniciando Smoke Test..."
"$PYTHON" manage.py migrate --check
"$PYTHON" manage.py check
"$PYTHON" manage.py shell -c "
from django.conf import settings
from accounts.models import Usuario
from music.models import Musica

print('OK Models carregados')
print(f'OK Usuarios: {Usuario.objects.count()}')
print(f'OK Musicas: {Musica.objects.count()}')
print(f\"OK Paginacao ativa: {'DEFAULT_PAGINATION_CLASS' in settings.REST_FRAMEWORK}\")
print(f\"OK Blacklist JWT: {'rest_framework_simplejwt.token_blacklist' in settings.INSTALLED_APPS}\")
"
echo "Smoke Test concluido com sucesso."
