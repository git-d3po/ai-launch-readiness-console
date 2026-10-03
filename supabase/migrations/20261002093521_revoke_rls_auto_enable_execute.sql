-- Supabase's "Enable automatic RLS" option creates public.rls_auto_enable(), an
-- event-trigger function. With default privileges it is executable by PUBLIC, so
-- anon and authenticated could reach it through /rest/v1/rpc. Revoking from
-- anon and authenticated alone would leave the PUBLIC grant in place.
-- Guarded: a project created without that option has no such function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
