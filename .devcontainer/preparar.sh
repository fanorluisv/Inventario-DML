#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
node .devcontainer/configurar-entorno.cjs
npm ci --prefix backend
npm ci --prefix frontend
echo 'Entorno preparado. Ejecuta: bash iniciar-codespaces.sh'
