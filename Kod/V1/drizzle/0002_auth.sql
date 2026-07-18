-- 0002_auth: lookup naloga po email-u za globalnu prijavu (/prijava bez slug-a).
--
-- salon_accounts ima FORCE RLS pa app rola ne može da čita cross-tenant — ali
-- login po email-u mora da nađe salon PRE nego što je tenant poznat. Funkcija se
-- izvršava sa pravima vlasnika (superuser iz docker compose-a => zaobilazi RLS)
-- i vraća najviše jedan red, samo za tačno dati email. App i dalje poredi bcrypt
-- hash — funkcija ne otkriva ništa bez poznavanja email adrese.

CREATE OR REPLACE FUNCTION auth_account_by_email(p_email text)
RETURNS TABLE (account_id uuid, salon_id uuid, password_hash text, slug text, salon_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.salon_id, a.password_hash, s.slug, s.name
  FROM salon_accounts a
  JOIN salons s ON s.id = a.salon_id
  WHERE lower(a.email) = lower(p_email)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION auth_account_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_account_by_email(text) TO tefter_app;
