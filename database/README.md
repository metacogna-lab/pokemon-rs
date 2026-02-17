# Database systems

Schema, migrations, and connectors for the gaming fingerprinting system.

- `migrations/` – versioned schema migrations (0001–0007, apply in order)
- `run_migrations.sh` – applies all `migrations/*.sql`; set PGHOST, PGPORT, PGUSER, PGDATABASE
- `verify_schema.sh` – checks tables and materialized views exist after migrations
- `schema/` – canonical schema definitions
- `connectors/` – DB clients and connection pools
