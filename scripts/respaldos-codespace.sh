#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
[[ "${CODESPACES:-}" == true ]] || exit 0
umask 077
mkdir -p .runtime
exec 8>.runtime/respaldos-codespace.lock
flock -n 8 || exit 0
while true; do
  if python3 scripts/respaldo-proyecto.py --docker 8>&-; then
    sleep 3600 8>&-
  else
    echo 'No se completó el respaldo; se conserva el anterior. Nuevo intento en 60 segundos.' >&2
    sleep 60 8>&-
  fi
done
