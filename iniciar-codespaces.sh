#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
node .devcontainer/configurar-entorno.cjs
docker compose up -d db
ready=false
for attempt in {1..60}; do
  if docker compose exec -T db sh -c 'pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo 'PostgreSQL no respondió. Revisa: docker compose logs db' >&2
  exit 1
fi
export __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
echo 'Abre el puerto 5173 desde la pestaña Ports. Para crear el primer usuario, ejecuta en otra terminal: bash crear-admin-codespaces.sh'
exec bash iniciar-operacional.sh --docker
