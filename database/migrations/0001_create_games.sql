-- 0001_create_games.sql
CREATE TABLE IF NOT EXISTS games (
    game_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    rng_signature JSONB NOT NULL,
    symbol_map JSONB NOT NULL,
    statistical_profile JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
