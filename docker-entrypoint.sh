#!/bin/sh
set -e

# Default data paths – override with env vars or volume mounts
export DATABASE_URL="${DATABASE_URL:-file:/data/db.sqlite}"
export STORAGE_PATH="${STORAGE_PATH:-/data/storage}"

mkdir -p "$STORAGE_PATH"

echo "→ Starte Datenbank-Migrationen…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Starte Anwendung auf Port ${PORT:-3000}…"
exec node server.js
