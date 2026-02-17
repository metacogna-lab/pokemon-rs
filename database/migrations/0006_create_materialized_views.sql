-- 0006_create_materialized_views.sql — Session aggregates (DATASTORE §2.6)
CREATE MATERIALIZED VIEW IF NOT EXISTS session_metrics_latest AS
SELECT
    session_id,
    COUNT(*) FILTER (WHERE (action->>'type') = 'Spin') AS total_spins,
    COALESCE(SUM((result->>'payout')::NUMERIC), 0) AS total_payout
FROM gameplay_events
GROUP BY session_id;
