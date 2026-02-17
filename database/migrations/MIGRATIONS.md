📦 MIGRATIONS INDEX
Order	Filename	Purpose
001	0001_create_games.sql	Core games table
002	0002_create_wallets.sql	Wallet and financial controls (before sessions for FK)
003	0003_create_sessions.sql	Sessions with state machine
004	0004_create_gameplay_events.sql	Event store
005	0005_create_rl_store.sql	Reinforcement learning store
006	0006_create_materialized_views.sql	Session aggregates
007	0007_indexes.sql	All recommended indexes

These migrations are additive and should be applied in the order shown.

📄 0001_create_games.sql
-- 0001_create_games.sql
CREATE TABLE IF NOT EXISTS games (
    game_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    rng_signature JSONB NOT NULL,
    symbol_map JSONB NOT NULL,
    statistical_profile JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

📄 0002_create_wallets.sql
See 0002_create_wallets.sql (wallets before sessions for FK).

📄 0003_create_sessions.sql
-- 0003_create_sessions.sql
CREATE TYPE game_state AS ENUM (
    'Idle', 'Initialized', 'Probing', 'Playing', 'Evaluating', 'Completed'
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games (game_id),
    player_profile JSONB NOT NULL,
    state game_state NOT NULL DEFAULT 'Idle',
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    current_wallet_id UUID REFERENCES wallets (wallet_id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensures updated_at will change on updates
CREATE OR REPLACE FUNCTION sessions_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_update_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE PROCEDURE sessions_updated_at_trigger();

📄 0002_create_wallets.sql (content)
Wallets table and updated_at trigger; see file 0002_create_wallets.sql.

📄 0004_create_gameplay_events.sql
-- 0004_create_gameplay_events.sql
CREATE TABLE IF NOT EXISTS gameplay_events (
    event_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions (session_id),
    action JSONB NOT NULL,
    result JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reward FLOAT NULL
);

-- Indexed for temporal querying
CREATE INDEX IF NOT EXISTS idx_gameplay_session_time
ON gameplay_events (session_id, timestamp);

📄 0005_create_rl_store.sql
-- 0005_create_rl_store.sql
CREATE TABLE IF NOT EXISTS rl_store (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions (session_id),
    state JSONB NOT NULL,
    action JSONB NOT NULL,
    reward FLOAT NOT NULL,
    next_state JSONB NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Speed up common RL queries
CREATE INDEX IF NOT EXISTS idx_rl_session
ON rl_store (session_id);

📄 0006_create_materialized_views.sql
-- 0006_create_materialized_views.sql

-- Aggregates total spins and payouts per session
CREATE MATERIALIZED VIEW IF NOT EXISTS session_metrics_latest AS
SELECT
    session_id,
    COUNT(*) FILTER (WHERE (action->>'type') = 'Spin') AS total_spins,
    COALESCE(SUM((result->>'payout')::NUMERIC),0) AS total_payout
FROM gameplay_events
GROUP BY session_id;

-- Refresh policy (manual OR scheduled)
-- REFRESH MATERIALIZED VIEW session_metrics_latest;

📄 0007_indexes.sql
-- 0007_indexes.sql

-- Query performance
CREATE INDEX IF NOT EXISTS idx_sessions_game
ON sessions (game_id);

CREATE INDEX IF NOT EXISTS idx_sessions_state
ON sessions (state);

-- Wallet quick lookup
CREATE INDEX IF NOT EXISTS idx_wallet_balance
ON wallets (balance);

-- Event and RL joins
CREATE INDEX IF NOT EXISTS idx_events_session
ON gameplay_events (session_id);

CREATE INDEX IF NOT EXISTS idx_rl_session_created
ON rl_store (session_id, created_at);

🛡️ TRANSACTIONS & MIGRATION SAFETY

These migrations assume:

PostgreSQL >= 12+

Sequential application via a migration tool such as:

Flyway

Liquibase

Diesel CLI

SeaORM migrations

Each SQL file contains statements designed to be idempotent where practical (e.g., IF NOT EXISTS).

🔁 STATE EVOLUTION GUIDELINES

As the product evolves, future migrations will add:

FK constraints with ON DELETE CASCADE if appropriate

Soft-delete flags (deleted_at)

Extended analytics tables

Time-partitioned event sharding

Audit trails

Replay buffers optimized for RL workloads

📈 MIGRATION BEST PRACTICES

Version your migrations — maintain monotonic increasing IDs

Document semantic changes — every column/table purpose

Add migration tests — ensure fresh and existing DB support

Review index impacts — minimize overhead

Enable automated rollbacks — for CI/CD safety