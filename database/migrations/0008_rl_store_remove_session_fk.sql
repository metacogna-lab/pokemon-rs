-- 0008_rl_store_remove_session_fk.sql
-- Transitional migration: sessions remain in-memory during the RL-Postgres sprint.
-- Remove the FK so rl_store can accept experiences for in-memory session IDs.
-- The FK will be re-added once session persistence is wired to Postgres.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rl_store'
      AND constraint_name = 'rl_store_session_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE rl_store DROP CONSTRAINT rl_store_session_id_fkey;
  END IF;
END $$;
