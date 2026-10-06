#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
umask 077
mkdir -p .runtime
nohup bash scripts/respaldos-codespace.sh >>.runtime/respaldos-codespace.log 2>&1 </dev/null &
exec bash .devcontainer/iniciar-automatico.sh
