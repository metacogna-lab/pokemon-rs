-- 0005_create_rl_store.sql — RL experience buffer (DATASTORE §2.5)
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

CREATE INDEX IF NOT EXISTS idx_rl_session
ON rl_store (session_id);
