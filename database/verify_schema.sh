#!/usr/bin/env bash
# Verifies expected tables and views exist after migrations. Use after run_migrations.sh.

set -e
# Expects PGHOST, PGPORT, PGUSER, PGDATABASE (e.g. from CI or .env)

tables=(games wallets sessions gameplay_events rl_store)
matviews=(session_metrics_latest)
missing=0

for t in "${tables[@]}"; do
  if psql -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$t'" | grep -q 1; then
    echo "OK table $t"
  else
    echo "MISSING table $t" >&2
    missing=1
  fi
done

for v in "${matviews[@]}"; do
  if psql -tAc "SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='$v'" | grep -q 1; then
    echo "OK materialized view $v"
  else
    echo "MISSING materialized view $v" >&2
    missing=1
  fi
done

if [[ $missing -eq 1 ]]; then
  exit 1
fi
echo "Schema verification passed."
