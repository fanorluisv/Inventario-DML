#!/usr/bin/env bash
set -euo pipefail
systemctl --user start licencias-dml-local.service
echo 'LICENCIAS DML local: http://127.0.0.1:5173/'
