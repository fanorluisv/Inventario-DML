#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
umask 077
mkdir -p .runtime
if [[ -n "${CODESPACES:-}" ]]; then
  echo 'Ejecuta este comando en el computador local, no en Codespaces.' >&2
  exit 1
fi
nohup python3 scripts/sincronizar-codespace.py --watch "$@" >>.runtime/replica-local.log 2>&1 </dev/null &
echo 'Réplica local solicitada cada 15 minutos. Registro: .runtime/replica-local.log'
