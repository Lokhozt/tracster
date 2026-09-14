#!/usr/bin/env bash
set -euo pipefail

DUMP="${1:-}"
if [[ -z "$DUMP" ]]; then
  echo "Usage: make db-from-dump DUMP=/path/to/dump.sql" >&2
  exit 1
fi
if [[ ! -f "$DUMP" ]]; then
  echo "Dump file not found: $DUMP" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Starting PostgreSQL..."
docker compose up -d db

echo "Waiting for PostgreSQL..."
ready=0
for _ in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U tracster -d postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "PostgreSQL did not become ready." >&2
  exit 1
fi

echo "Recreating database tracster..."
docker compose exec -T db psql -U tracster -d postgres -v ON_ERROR_STOP=1 <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'tracster' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS tracster;
CREATE DATABASE tracster OWNER tracster;
SQL

echo "Importing $DUMP..."
# Prod dumps often mention roles/owners that do not exist locally.
docker compose exec -T db psql -U tracster -d tracster -v ON_ERROR_STOP=off < "$DUMP"

echo "Dev database restored from $DUMP"
echo "Do not run npm run db:seed unless you want to replace this data."
