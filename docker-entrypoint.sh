#!/bin/sh
set -e

# Default data paths – override with env vars or volume mounts
export DATABASE_URL="${DATABASE_URL:-file:/data/db.sqlite}"
export STORAGE_PATH="${STORAGE_PATH:-/data/storage}"

# Railway sets PORT dynamically – Next.js standalone reads HOSTNAME + PORT
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

mkdir -p "$STORAGE_PATH"

echo "→ Starte Datenbank-Migrationen…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Starte Anwendung auf ${HOSTNAME}:${PORT}…"
exec node server.js
