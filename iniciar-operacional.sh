#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  export PATH="/home/ph/.nvm/versions/node/v24.20.0/bin:$PATH"
fi
# Back up before the API applies its additive migration. A failed backup stops startup.
if curl --fail --silent http://127.0.0.1:3001/api/v1/salud >/dev/null; then
  echo 'Ya hay una API en el puerto 3001. Detén su terminal con Ctrl+C antes de iniciar la versión integrada.' >&2
  exit 1
fi
node backend/backup-operational.js "$@"
node backend/operational.js &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT
for attempt in {1..20}; do
  kill -0 "$backend_pid" 2>/dev/null || { echo 'La API no pudo iniciar.' >&2; exit 1; }
  if curl --fail --silent http://127.0.0.1:3001/api/v1/salud >/dev/null; then
    npm run dev --prefix frontend
    exit
  fi
  sleep 0.5
done
echo 'La API no respondió. Revisa la conexión de PostgreSQL.' >&2
exit 1
