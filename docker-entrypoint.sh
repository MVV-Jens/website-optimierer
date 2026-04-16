#!/bin/sh
set -e

# Default data paths – override with env vars or volume mounts
export DATABASE_URL="${DATABASE_URL:-file:/data/db.sqlite}"
export STORAGE_PATH="${STORAGE_PATH:-/data/storage}"

echo "→ Starte Datenbank-Migrationen…"
# npx is not available in standalone – use node directly with prisma binary
node node_modules/.bin/prisma migrate deploy

echo "→ Starte Anwendung auf Port ${PORT:-3000}…"
exec node server.js
