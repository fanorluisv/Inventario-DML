#!/usr/bin/env bash
set -euo pipefail
if [[ "${CODESPACES:-}" != true ]]; then
  echo 'Este asistente es exclusivo de Codespaces.' >&2
  exit 1
fi
read -r -p 'Nombre del administrador: ' DML_ADMIN_NAME
read -r -p 'Correo: ' DML_ADMIN_EMAIL
read -r -s -p 'Contraseña nueva (mínimo 12 caracteres): ' DML_ADMIN_PASSWORD
printf '\n'
read -r -s -p 'Repite la contraseña: ' DML_ADMIN_CONFIRM
printf '\n'
if [[ "$DML_ADMIN_PASSWORD" != "$DML_ADMIN_CONFIRM" || ${#DML_ADMIN_PASSWORD} -lt 12 ]]; then
  echo 'Las contraseñas deben coincidir y tener al menos 12 caracteres.' >&2
  exit 1
fi
export DML_ADMIN_NAME DML_ADMIN_EMAIL DML_ADMIN_PASSWORD
node <<'JS'
(async () => {
  const response = await fetch('http://127.0.0.1:3001/api/v1/users/bootstrap', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: process.env.DML_ADMIN_NAME, email: process.env.DML_ADMIN_EMAIL, password: process.env.DML_ADMIN_PASSWORD }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'No se pudo crear el administrador.');
  console.log('Administrador creado. Ya puedes ingresar por el puerto 5173.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
JS
