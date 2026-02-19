#!/usr/bin/env bash
# Applies all database migrations in order using bare psql.
# WARNING: This script re-runs ALL migrations on every invocation and has no tracking table.
#          It is intended for manual setup and CI bootstrapping only.
# NOTE: The production server uses sqlx::migrate!() which tracks applied migrations in
#       the _sqlx_migrations table and only applies pending ones. Prefer that for production.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations dir not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

for f in "$MIGRATIONS_DIR"/*.sql; do
  [[ -f "$f" ]] || continue
  echo "Applying $(basename "$f")..."
  psql -v ON_ERROR_STOP=1 -f "$f" || exit 1
done
echo "Migrations complete."
