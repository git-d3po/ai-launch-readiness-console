-- Stage 1 security hardening (DECISIONS.md DR-013, DR-014, DR-017, DR-021).
-- Public visitors keep read access only. No public write path is added, and
-- no function is created. Every statement fails loudly if the catalog differs
-- from what it expects, rather than silently doing nothing.

-- M-1: remove every public write path to the canonical launch (SEC-001 to
-- SEC-004). Both functions stay as owner-only tools: migrations call
-- reset_demo_data(), and the local integrity suite exercises both.
revoke execute on function public.reset_demo_data() from anon, authenticated;
revoke execute on function public.set_gate_status(bigint, public.gate_status, text, text, text) from anon, authenticated;

-- Revoking the table-level privilege also removes the six column-level INSERT
-- grants on evidence.
revoke insert on table public.evidence from anon, authenticated;
drop policy "Public append" on public.evidence;

-- M-2: evidence.source is NULL or an https URL (SEC-005): a dotted ASCII host
-- (punycode for international names), an optional port, then an optional path,
-- query or fragment made only of RFC 3986 URI characters or %XX escapes.
-- Explicit character lists keep the rule identical under every collation
-- provider; POSIX classes such as [:space:] follow the database's ICU locale.
-- This rejects other schemes, relative and protocol-relative URLs, user-info,
-- single-label hosts, whitespace, control and invisible characters, and raw
-- non-ASCII text, which must be percent-encoded.
alter table public.evidence add constraint evidence_source_https check (
  source is null
  or source ~ '^https://[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?::[0-9]{1,5})?(?:[/?#](?:[]A-Za-z0-9._~:/?#[@!$&''()*+,;=-]|%[0-9A-Fa-f]{2})*)?$'
);

-- M-3: tables that postgres creates in public from now on grant nothing to the
-- API roles by default (SEC-006). The hosted project's per-schema default gave
-- anon and authenticated TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. Existing
-- tables and service_role are unaffected.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
