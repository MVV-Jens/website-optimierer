#!/bin/sh
set -e

# Railway sets PORT dynamically – Next.js standalone server reads HOSTNAME + PORT
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

# Use /data if writable (volume mounted), otherwise fall back to /tmp
if mkdir -p /data/storage 2>/dev/null && touch /data/.writable 2>/dev/null; then
  rm -f /data/.writable
  export DATABASE_URL="${DATABASE_URL:-file:/data/db.sqlite}"
  export STORAGE_PATH="${STORAGE_PATH:-/data/storage}"
  echo "→ Datenspeicher: /data"
else
  export DATABASE_URL="${DATABASE_URL:-file:/tmp/db.sqlite}"
  export STORAGE_PATH="${STORAGE_PATH:-/tmp/storage}"
  mkdir -p /tmp/storage
  echo "→ Datenspeicher: /tmp (kein persistentes Volume)"
fi

echo "→ Starte Datenbank-Migrationen…"
node node_modules/prisma/build/index.js migrate deploy

echo "→ Starte Anwendung auf ${HOSTNAME}:${PORT}…"
exec node server.js
