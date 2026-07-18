-- 0001_rls: app rola + Row-Level Security za tenant tabele.
-- Pušta se kao superuser. Aplikacija se konektuje kao "tefter_app" i za svaki
-- request radi set_config('app.current_salon_id', '<uuid>', true) u transakciji.
--
-- salons NEMA RLS: to je registar tenantâ, čita se po slug-u PRE nego što je
-- salon_id poznat (resolveSalon). Sve ostale tabele su tenant-scoped.

-- app rola -----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tefter_app') THEN
    CREATE ROLE tefter_app LOGIN PASSWORD '__APP_DB_PASSWORD__';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO tefter_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tefter_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tefter_app;

-- Helper: tekući salon iz session varijable (missing_ok = true -> NULL ako nije set).
CREATE OR REPLACE FUNCTION current_salon_id() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.current_salon_id', true), '')::uuid $$;

-- Politike na 6 tenant tabela. FORCE => važi i za vlasnika tabele.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'salon_accounts', 'working_hours', 'clients', 'services', 'staff', 'appointments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (salon_id = current_salon_id())
         WITH CHECK (salon_id = current_salon_id())', t);
  END LOOP;
END
$$;
