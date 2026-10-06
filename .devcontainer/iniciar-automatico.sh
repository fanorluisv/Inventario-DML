#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ "${CODESPACES:-}" != true ]]; then
  echo 'Este arranque automático es exclusivo de Codespaces.' >&2
  exit 1
fi
mkdir -p .runtime
chmod 700 .runtime
# Keep backups independent of the application launcher and its inherited lock.
nohup bash scripts/respaldos-codespace.sh >>.runtime/respaldos-codespace.log 2>&1 </dev/null &
# The launched process inherits the lock, preventing concurrent starts.
exec 9>.runtime/codespaces.lock
if ! flock -n 9; then
  echo 'El arranque automático ya está activo. Registro: .runtime/codespaces.log'
  exit 0
fi
if curl --max-time 3 --fail --silent http://127.0.0.1:3001/api/v1/salud >/dev/null &&
   curl --max-time 3 --fail --silent http://127.0.0.1:5173/ >/dev/null; then
  echo 'La aplicación ya está iniciada.'
  exit 0
fi
touch .runtime/codespaces.log
chmod 600 .runtime/codespaces.log
nohup bash iniciar-codespaces.sh >>.runtime/codespaces.log 2>&1 </dev/null &
echo 'Aplicación arrancando en segundo plano. Abre el puerto 5173.'
echo 'Para revisar el inicio: tail -n 60 .runtime/codespaces.log'
