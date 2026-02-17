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

CREATE OR REPLACE FUNCTION sessions_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_update_timestamp ON sessions;
CREATE TRIGGER sessions_update_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE PROCEDURE sessions_updated_at_trigger();
