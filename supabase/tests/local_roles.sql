-- Local runs only. Supabase already has these roles; plain Postgres does not.
-- psql -f supabase/tests/local_roles.sql, then the migrations in order, then integrity_checks.sql.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

-- Mirror the default privileges the hosted project gives tables that postgres
-- creates in public, as read from the live catalog on 2026-10-02 (a per-schema
-- entry: TRUNCATE, REFERENCES, TRIGGER and, on Postgres 17, MAINTAIN for anon,
-- authenticated and service_role). Without it, a local database would hide the
-- defaults that the Stage 1 migration revokes.
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon, authenticated, service_role';
  else
    execute 'alter default privileges for role postgres in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role';
  end if;
end $$;
