-- 0007_indexes.sql — Query performance (DATASTORE §3.3)
CREATE INDEX IF NOT EXISTS idx_sessions_game ON sessions (game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions (state);
CREATE INDEX IF NOT EXISTS idx_wallet_balance ON wallets (balance);
CREATE INDEX IF NOT EXISTS idx_events_session ON gameplay_events (session_id);
CREATE INDEX IF NOT EXISTS idx_rl_session_created ON rl_store (session_id, created_at);
