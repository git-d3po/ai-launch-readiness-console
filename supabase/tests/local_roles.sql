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
end $$;
