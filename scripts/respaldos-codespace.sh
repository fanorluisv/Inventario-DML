#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
[[ "${CODESPACES:-}" == true ]] || exit 0
umask 077
mkdir -p .runtime
exec 8>.runtime/respaldos-codespace.lock
flock -n 8 || exit 0
while true; do
  if curl --max-time 5 --fail --silent http://127.0.0.1:3001/api/v1/salud >/dev/null; then
    python3 scripts/respaldo-proyecto.py --docker || echo 'No se completó el respaldo; se conserva el anterior.' >&2
  fi
  sleep 3600
done
