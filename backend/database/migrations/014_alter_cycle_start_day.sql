-- =============================================================================
-- 014_alter_cycle_start_day.sql
-- Converts user_settings.cycle_start_day from DATE to INTEGER (1–28).
-- Safe to run multiple times — checks current column type before altering.
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_name   = 'user_settings'
          AND  column_name  = 'cycle_start_day'
          AND  data_type    = 'date'
    ) THEN
        ALTER TABLE user_settings
            ALTER COLUMN cycle_start_day TYPE integer USING NULL;
        RAISE NOTICE 'cycle_start_day converted date → integer';
    ELSE
        RAISE NOTICE 'cycle_start_day already correct type, skipped';
    END IF;
END $$;
