-- 0004_create_gameplay_events.sql
CREATE TABLE IF NOT EXISTS gameplay_events (
    event_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions (session_id),
    action JSONB NOT NULL,
    result JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reward FLOAT NULL
);

CREATE INDEX IF NOT EXISTS idx_gameplay_session_time
ON gameplay_events (session_id, timestamp);
