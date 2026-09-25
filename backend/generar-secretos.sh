#!/usr/bin/env bash
set -euo pipefail
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "CREDENTIALS_KEY=$(openssl rand -hex 32)"
