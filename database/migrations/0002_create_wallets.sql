-- 0002_create_wallets.sql
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id UUID PRIMARY KEY,
    balance NUMERIC(20,4) NOT NULL DEFAULT 0,
    daily_limit NUMERIC(20,4) NOT NULL DEFAULT 0,
    cost_rate JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION wallets_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_update_timestamp ON wallets;
CREATE TRIGGER wallets_update_timestamp
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE PROCEDURE wallets_updated_at_trigger();
