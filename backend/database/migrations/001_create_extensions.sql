-- 001_create_extensions.sql
-- Enable UUID generation via pgcrypto.
-- Must run before any migration that uses gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS "pgcrypto";