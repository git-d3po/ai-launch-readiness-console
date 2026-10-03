#!/usr/bin/env bash
# Stage 2 concurrency test (part of B-4; DR-014, DR-018, DR-025). Local or
# disposable databases only, never a Supabase project (invariant I19).
#
# Usage: supabase/tests/stage2_concurrency.sh "<conninfo of a disposable database>"
# The database must be built from supabase/tests/local_roles.sql and the
# migrations, and the connection must be the database owner. B-4 and the other
# SQL tests roll back; this one commits, because two sessions can only race on
# committed state. It ends by calling reset_demo_data() so the canonical seed
# and a fresh sandbox are restored.
#
# The order of events is enforced, not hoped for. A "holder" session runs its
# call inside an open transaction fed through a FIFO, and marks itself ready by
# setting application_name as its last statement. The second session starts
# only once the holder is idle in its transaction with the marker set, and the
# holder commits only once pg_blocking_pids shows the second session waiting on
# it (in races 8 and 9, once the second session waits on it or has finished).
# A step that doesn't happen within 10 seconds fails the race.
#
# Four races, each run once:
#   1. Add vs add: two sessions add the 10th visitor evidence item to one gate.
#      Exactly one succeeds; the other waits on the gate lock, then hits the cap.
#   2. Reset vs reset: exactly one succeeds; the other waits on sandbox_state,
#      then hits the cooldown.
#   3. Write, then reset (I13): a visitor holds a gate lock with an uncommitted
#      evidence item and status change. The reset takes sandbox_state, waits on
#      that gate, and after the visitor commits deletes both rows and restores
#      the gate. No visitor row survives, and canonical rows are unchanged.
#   4. Reset, then write: a reset holds the gate locks; a visitor call waits,
#      then lands after the reset with the cap counted from zero.
# Then the isolation rule: every sandbox function refuses REPEATABLE READ and
# SERIALIZABLE, where its snapshot would predate its lock wait.
#   5. A reset at either level is refused with P0001 and changes nothing.
#   6. sandbox_add_evidence succeeds at READ COMMITTED; at either other level
#      it is refused with P0001 and visitor data is byte-identical.
#   7. sandbox_set_gate_status: the same.
#   8. Race, at each level: a session holds the 10th visitor item, uncommitted;
#      a REPEATABLE READ or SERIALIZABLE add is refused instead of adding an
#      11th (without the refusal it waits, then counts from its old snapshot).
#   9. Race, at each level: a reset holds the gate lock after deleting the
#      gate's only evidence; a REPEATABLE READ or SERIALIZABLE change to Passed
#      is refused instead of passing a gate with no evidence (I8).
# Every session states its isolation level in its output; race 1 checks that
# both sides of the cap race ran at READ COMMITTED.
set -euo pipefail

conn="${1:?usage: stage2_concurrency.sh \"<conninfo of a disposable database>\"}"
q() { psql "$conn" -X -q -v ON_ERROR_STOP=1 -A -t "$@"; }

guard=$(q -c "select (to_regnamespace('auth') is not null or to_regnamespace('supabase_migrations') is not null)")
if [ "$guard" != "f" ]; then
  echo "stage2_concurrency.sh runs only on a local database built from this repository, never on a Supabase project" >&2
  exit 1
fi

tmp=$(mktemp -d)
holder_fd=""
cleanup() {
  if [ -n "$holder_fd" ]; then exec {holder_fd}>&-; fi
  jobs -p | xargs -r kill 2>/dev/null || true
  wait 2>/dev/null || true
  rm -rf "$tmp"
  q -c "update public.sandbox_state set last_reset_at = '-infinity'" >/dev/null || true
  q -c "select public.reset_demo_data()" >/dev/null || true
}
trap cleanup EXIT

# wait_for <description> <SQL returning t or f>: polls every 50 ms for 10 s.
wait_for() {
  local i
  for i in $(seq 1 200); do
    if [ "$(q -c "$2" 2>/dev/null)" = "t" ]; then return 0; fi
    sleep 0.05
  done
  note="timed out waiting for: $1"
  return 1
}

# start_holder <name> <SQL>: runs the SQL as anon in an open transaction, then
# sets application_name to <name>_ready and waits for commit_holder.
start_holder() {
  rm -f "$tmp/$1.in"
  mkfifo "$tmp/$1.in"
  psql "$conn" -X -q -A -t -v ON_ERROR_STOP=0 <"$tmp/$1.in" >"$tmp/$1.out" 2>&1 &
  holder_pid=$!
  exec {holder_fd}>"$tmp/$1.in"
  printf '%s\n' "set application_name = '$1';" "begin;" "set local role anon;" "show transaction_isolation;" "$2" "set application_name = '$1_ready';" >&"$holder_fd"
}
commit_holder() {
  printf '%s\n' "commit;" >&"$holder_fd"
  exec {holder_fd}>&-
  holder_fd=""
  wait "$holder_pid" || true
}
# start_waiter <name> <SQL> [isolation level]: runs the SQL as anon in its own
# transaction, at READ COMMITTED unless a level is given.
start_waiter() {
  psql "$conn" -X -q -A -t -c "set application_name = '$1'" -c "begin isolation level ${3:-read committed}" \
    -c "set local role anon" -c "show transaction_isolation" -c "$2" -c "commit" >"$tmp/$1.out" 2>&1 &
  waiter_pid=$!
}
holder_ready() {
  wait_for "$1 to hold its transaction open" \
    "select exists (select 1 from pg_stat_activity where application_name = '$1_ready' and state = 'idle in transaction')"
}
waiter_blocked_by_holder() {
  wait_for "$2 to wait on $1" \
    "select exists (select 1 from pg_stat_activity w, pg_stat_activity h
                    where w.application_name = '$2' and h.application_name = '$1_ready'
                      and w.wait_event_type = 'Lock' and pg_blocking_pids(w.pid) = array[h.pid])"
}
# waiter_done_or_blocked <holder> <waiter>: the waiter has finished, or waits on
# the holder. Either way the holder may now commit without racing it.
waiter_done_or_blocked() {
  local i
  for i in $(seq 1 200); do
    if ! kill -0 "$waiter_pid" 2>/dev/null; then echo finished; return 0; fi
    if [ "$(q -c "select exists (select 1 from pg_stat_activity w, pg_stat_activity h
                  where w.application_name = '$2' and h.application_name = '$1_ready'
                    and w.wait_event_type = 'Lock' and pg_blocking_pids(w.pid) = array[h.pid])" 2>/dev/null)" = t ]; then
      echo "waited on the holder"; return 0
    fi
    sleep 0.05
  done
  echo "timed out"; return 1
}
oneline() { grep -v -x -e 'read committed' -e 'repeatable read' -e 'serializable' "$1" | tr '\n' ' ' | head -c 200; }

canonical_rows="select md5(string_agg(r, ',' order by r)) from (
    select 'l' || l::text as r from public.launches l where l.source_launch_id is null
    union all select 'g' || g::text from public.gates g join public.launches l on l.id = g.launch_id where l.source_launch_id is null
    union all select 'e' || e::text from public.evidence e join public.gates g on g.id = e.gate_id join public.launches l on l.id = g.launch_id where l.source_launch_id is null
    union all select 'r' || r::text from public.risks r join public.launches l on l.id = r.launch_id where l.source_launch_id is null
    union all select 'd' || d::text from public.decisions d join public.launches l on l.id = d.launch_id where l.source_launch_id is null
    union all select 's' || s::text from public.rollout_stages s join public.launches l on l.id = s.launch_id where l.source_launch_id is null) x"
visitor_rows="select (select count(*) from public.evidence where origin = 'visitor')
                   + (select count(*) from public.decisions where origin = 'visitor')"
visitor_state="select md5(coalesce((select string_agg(e::text, ',' order by e.id) from public.evidence e where e.origin = 'visitor'), '')
                       || coalesce((select string_agg(d::text, ',' order by d.id) from public.decisions d where d.origin = 'visitor'), '')
                       || (select string_agg(g::text, ',' order by g.id) from public.gates g where g.source_gate_id is not null))"
sandbox_mismatch="select count(*) from public.gates s join public.gates c on c.id = s.source_gate_id
                  where (s.status, s.waiver_rationale) is distinct from (c.status, c.waiver_rationale)"
fresh_sandbox() {
  q -c "update public.sandbox_state set last_reset_at = '-infinity'" >/dev/null
  q -c "select public.reset_demo_data()" >/dev/null
  canon_before=$(q -c "$canonical_rows")
}

# A canonical "Not started" gate with no evidence (seed contract), and its copy.
gate=$(q -c "select s.id from public.gates s join public.gates c on c.id = s.source_gate_id
             where c.title = 'Rollback procedure documented and rehearsed'")
fresh_sandbox

# Race 1: add vs add, for the 10th visitor item.
for i in 1 2 3 4 5 6 7 8 9; do
  q -c "set role anon; select public.sandbox_add_evidence($gate, 'Observation', 'Setup $i', 'Concurrency setup.')" >/dev/null
done
note=""; r1=FAIL
start_holder c1_a "select public.sandbox_add_evidence($gate, 'Observation', 'Race A', 'Concurrency race.');"
if holder_ready c1_a; then
  start_waiter c1_b "select public.sandbox_add_evidence($gate, 'Observation', 'Race B', 'Concurrency race.')"
  waiter_blocked_by_holder c1_a c1_b && blocked=yes || blocked=no
  commit_holder; wait "$waiter_pid" || true
  count=$(q -c "select count(*) from public.evidence where gate_id = $gate and origin = 'visitor'")
  rc_both=$(grep -qx 'read committed' "$tmp/c1_a.out" && grep -qx 'read committed' "$tmp/c1_b.out" && echo yes || echo no)
  if [ "$blocked" = yes ] && [ "$count" = 10 ] && [ "$rc_both" = yes ] && grep -qE '^[0-9]+$' "$tmp/c1_a.out" && ! grep -q ERROR "$tmp/c1_a.out" \
     && grep -q 'already has 10 visitor evidence items' "$tmp/c1_b.out"; then r1=PASS; fi
  note="both at read committed: $rc_both; B waited on A: $blocked; count=$count; A: $(oneline "$tmp/c1_a.out"); B: $(oneline "$tmp/c1_b.out")"
else commit_holder; fi
echo "1 | Add vs add for the 10th visitor item: B waits on A's gate lock, then hits the cap | $r1 | $note"

# Race 2: reset vs reset.
q -c "update public.sandbox_state set last_reset_at = '-infinity'" >/dev/null
note=""; r2=FAIL
start_holder c2_a "select public.sandbox_reset();"
if holder_ready c2_a; then
  start_waiter c2_b "select public.sandbox_reset()"
  waiter_blocked_by_holder c2_a c2_b && blocked=yes || blocked=no
  commit_holder; wait "$waiter_pid" || true
  visitor=$(q -c "$visitor_rows")
  if [ "$blocked" = yes ] && ! grep -q ERROR "$tmp/c2_a.out" && grep -q 'reset recently' "$tmp/c2_b.out" && [ "$visitor" = 0 ]; then r2=PASS; fi
  note="B waited on A: $blocked; visitor rows after=$visitor; B: $(oneline "$tmp/c2_b.out")"
else commit_holder; fi
echo "2 | Reset vs reset: B waits on A's sandbox_state lock, then hits the cooldown | $r2 | $note"

# Race 3: a visitor write holds the gate lock, uncommitted; then a reset.
fresh_sandbox
note=""; r3=FAIL
start_holder c3_v "select public.sandbox_add_evidence($gate, 'Observation', 'Race 3 visitor', 'Uncommitted during the reset.');
select public.sandbox_set_gate_status($gate, 'In progress', 'Race 3 visitor change.');
select 'visitor rows in own transaction=' || (select count(*) from public.evidence where gate_id = $gate and origin = 'visitor')
                                         + (select count(*) from public.decisions where gate_id = $gate and origin = 'visitor');"
if holder_ready c3_v; then
  start_waiter c3_r "select public.sandbox_reset()"
  waiter_blocked_by_holder c3_v c3_r && blocked=yes || blocked=no
  # While the reset waits: it holds sandbox_state (the visitor never locks it),
  # it is queued on a gates row, and nothing the visitor wrote is visible yet.
  probe=$(q -c "select 1 from public.sandbox_state s where s.id for update nowait" 2>&1 || true)
  state_held=$(printf '%s' "$probe" | grep -q 'could not obtain lock' && echo yes || echo no)
  on_gate=$(q -c "select exists (select 1 from pg_locks k join pg_stat_activity a on a.pid = k.pid
                                 where a.application_name = 'c3_r' and k.locktype = 'tuple'
                                   and k.relation = 'public.gates'::regclass and k.granted)")
  seen_before=$(q -c "$visitor_rows")
  commit_holder; wait "$waiter_pid" || true
  visitor=$(q -c "$visitor_rows")
  named=$(q -c "select (select count(*) from public.evidence where title = 'Race 3 visitor')
                     + (select count(*) from public.decisions where rationale = 'Race 3 visitor change.')")
  mismatch=$(q -c "$sandbox_mismatch")
  canon_after=$(q -c "$canonical_rows")
  if [ "$blocked" = yes ] && [ "$state_held" = yes ] && [ "$on_gate" = t ] && [ "$seen_before" = 0 ] \
     && grep -q 'visitor rows in own transaction=2' "$tmp/c3_v.out" && ! grep -q ERROR "$tmp/c3_v.out" \
     && ! grep -q ERROR "$tmp/c3_r.out" && [ "$visitor" = 0 ] && [ "$named" = 0 ] && [ "$mismatch" = 0 ] \
     && [ "$canon_after" = "$canon_before" ]; then r3=PASS; fi
  note="reset waited on visitor: $blocked; reset held sandbox_state: $state_held; reset queued on a gates row: $on_gate; visitor rows visible before commit=$seen_before; after: visitor rows=$visitor, race rows=$named, sandbox gates differing from source=$mismatch, canonical unchanged: $([ "$canon_after" = "$canon_before" ] && echo yes || echo no); V: $(oneline "$tmp/c3_v.out"); R: $(oneline "$tmp/c3_r.out")"
else commit_holder; fi
echo "3 | Write then reset: the reset waits for the visitor's gate lock, then removes the committed rows and restores the gate | $r3 | $note"

# Race 4: a reset holds the gate locks; then a visitor write.
q -c "update public.sandbox_state set last_reset_at = '-infinity'" >/dev/null
note=""; r4=FAIL
start_holder c4_r "select public.sandbox_reset();"
if holder_ready c4_r; then
  start_waiter c4_v "select public.sandbox_add_evidence($gate, 'Observation', 'Race 4 visitor', 'Waited for the reset.')"
  waiter_blocked_by_holder c4_r c4_v && blocked=yes || blocked=no
  commit_holder; wait "$waiter_pid" || true
  visitor=$(q -c "$visitor_rows")
  named=$(q -c "select count(*) from public.evidence where title = 'Race 4 visitor' and origin = 'visitor' and gate_id = $gate")
  canon_after=$(q -c "$canonical_rows")
  if [ "$blocked" = yes ] && ! grep -q ERROR "$tmp/c4_r.out" && grep -qE '^[0-9]+$' "$tmp/c4_v.out" && ! grep -q ERROR "$tmp/c4_v.out" \
     && [ "$visitor" = 1 ] && [ "$named" = 1 ] && [ "$canon_after" = "$canon_before" ]; then r4=PASS; fi
  note="visitor waited on reset: $blocked; after: visitor rows=$visitor, race row present=$named, canonical unchanged: $([ "$canon_after" = "$canon_before" ] && echo yes || echo no); V: $(oneline "$tmp/c4_v.out")"
else commit_holder; fi
echo "4 | Reset then write: the visitor waits for the reset's gate lock, then lands after it | $r4 | $note"

# Check 5: a reset outside READ COMMITTED is refused and changes nothing.
q -c "update public.sandbox_state set last_reset_at = '-infinity'" >/dev/null
q -c "set role anon; select public.sandbox_add_evidence($gate, 'Observation', 'Check 5 visitor', 'Must survive a refused reset.')" >/dev/null
r5=PASS; note=""
for level in "repeatable read" "serializable"; do
  out=$(q -c "begin isolation level $level" -c "set local role anon" \
          -c "select public.sandbox_reset()" -c "commit" 2>&1 || true)
  printf '%s' "$out" | grep -q 'must run at READ COMMITTED' || r5=FAIL
  note="$note$level: $(printf '%s' "$out" | grep -o 'ERROR: .*' | head -c 80 || echo 'no error'); "
done
left=$(q -c "select count(*) from public.evidence where title = 'Check 5 visitor' and origin = 'visitor'")
last=$(q -c "select last_reset_at = '-infinity' from public.sandbox_state")
if [ "$left" != 1 ] || [ "$last" != t ]; then r5=FAIL; fi
echo "5 | A reset outside READ COMMITTED is refused and changes nothing | $r5 | ${note}visitor row kept=$left; cooldown untouched=$last"

# Checks 6 and 7: each visitor function succeeds at READ COMMITTED and is
# refused, without changing visitor data, at the other two levels.
# isolation_check <SQL at READ COMMITTED> <SQL at the other levels> <message>
#   <SQL counting the effect>; sets res and note.
isolation_check() {
  local out before after level
  res=PASS
  before=$(q -c "$4")
  out=$(q -c "begin isolation level read committed" -c "set local role anon" -c "show transaction_isolation" -c "$1" -c "commit" 2>&1 || true)
  after=$(q -c "$4")
  if ! printf '%s' "$out" | grep -qx 'read committed' || printf '%s' "$out" | grep -q ERROR || [ "$after" != $((before + 1)) ]; then res=FAIL; fi
  note="read committed: count $before -> $after; "
  for level in "repeatable read" "serializable"; do
    before=$(q -c "$visitor_state")
    out=$(q -c "begin isolation level $level" -c "set local role anon" -c "$2" -c "commit" 2>&1 || true)
    after=$(q -c "$visitor_state")
    if ! printf '%s' "$out" | grep -q "$3" || [ "$before" != "$after" ]; then res=FAIL; fi
    note="$note$level: $(printf '%s' "$out" | grep -o 'ERROR: .*' | head -c 80 || echo 'no error'), visitor data unchanged: $([ "$before" = "$after" ] && echo yes || echo no); "
  done
}
fresh_sandbox
isolation_check \
  "select public.sandbox_add_evidence($gate, 'Observation', 'Check 6 visitor', 'At READ COMMITTED.')" \
  "select public.sandbox_add_evidence($gate, 'Observation', 'Check 6 refused', 'Must not be added.')" \
  'Sandbox evidence must be added at READ COMMITTED isolation' \
  "select count(*) from public.evidence where gate_id = $gate and origin = 'visitor'"
r6=$res
echo "6 | sandbox_add_evidence succeeds at READ COMMITTED and is refused at the other levels, changing nothing | $r6 | $note"
isolation_check \
  "select public.sandbox_set_gate_status($gate, 'In progress', 'Check 7 at READ COMMITTED.')" \
  "select public.sandbox_set_gate_status($gate, 'Not started', 'Check 7 refused.')" \
  'Sandbox status changes must run at READ COMMITTED isolation' \
  "select count(*) from public.decisions where gate_id = $gate and origin = 'visitor'"
r7=$res
echo "7 | sandbox_set_gate_status succeeds at READ COMMITTED and is refused at the other levels, changing nothing | $r7 | $note"

# Race 8, at each level: the 10th item is held uncommitted at READ COMMITTED;
# a competing add at a higher level must be refused, not counted from its old
# snapshot. The holder commits only once the competitor has finished or waits.
r8=PASS; note8=""
for level in "repeatable read" "serializable"; do
  fresh_sandbox
  for i in 1 2 3 4 5 6 7 8 9; do
    q -c "set role anon; select public.sandbox_add_evidence($gate, 'Observation', 'Setup $i', 'Concurrency setup.')" >/dev/null
  done
  start_holder c8_a "select public.sandbox_add_evidence($gate, 'Observation', 'Race 8 holder', 'The 10th item.');"
  if holder_ready c8_a; then
    start_waiter c8_b "select public.sandbox_add_evidence($gate, 'Observation', 'Race 8 competitor', 'Must not be the 11th.')" "$level"
    state=$(waiter_done_or_blocked c8_a c8_b || true)
    commit_holder; wait "$waiter_pid" || true
    count=$(q -c "select count(*) from public.evidence where gate_id = $gate and origin = 'visitor'")
    if [ "$state" = "timed out" ] || [ "$count" != 10 ] || ! grep -q 'must be added at READ COMMITTED' "$tmp/c8_b.out" \
       || grep -q ERROR "$tmp/c8_a.out"; then r8=FAIL; fi
    note8="$note8$level: competitor $state, visitor items=$count, B: $(oneline "$tmp/c8_b.out" | head -c 90); "
  else commit_holder; r8=FAIL; note8="$note8$level: $note; "; fi
done
echo "8 | A REPEATABLE READ or SERIALIZABLE add racing the 10th item is refused; the gate keeps 10 | $r8 | $note8"

# Race 9, at each level: a reset has deleted the gate's only evidence and holds
# the gate lock; a change to Passed at a higher level must be refused, not
# decided from a snapshot that still shows the deleted evidence (I8).
r9=PASS; note9=""
for level in "repeatable read" "serializable"; do
  fresh_sandbox
  q -c "set role anon; select public.sandbox_add_evidence($gate, 'Observation', 'Race 9 only evidence', 'Deleted by the reset.')" >/dev/null
  q -c "update public.sandbox_state set last_reset_at = '-infinity'" >/dev/null
  start_holder c9_r "select public.sandbox_reset();"
  if holder_ready c9_r; then
    start_waiter c9_v "select public.sandbox_set_gate_status($gate, 'Passed', 'Race 9 change.')" "$level"
    state=$(waiter_done_or_blocked c9_r c9_v || true)
    commit_holder; wait "$waiter_pid" || true
    status=$(q -c "select s.status = c.status from public.gates s join public.gates c on c.id = s.source_gate_id where s.id = $gate")
    evidence=$(q -c "select count(*) from public.evidence where gate_id = $gate")
    decisions=$(q -c "select count(*) from public.decisions where gate_id = $gate and origin = 'visitor'")
    if [ "$state" = "timed out" ] || [ "$status" != t ] || [ "$evidence" != 0 ] || [ "$decisions" != 0 ] \
       || ! grep -q 'must run at READ COMMITTED' "$tmp/c9_v.out" || grep -q ERROR "$tmp/c9_r.out"; then r9=FAIL; fi
    note9="$note9$level: competitor $state, gate equals its source=$status, evidence=$evidence, visitor decisions=$decisions; "
  else commit_holder; r9=FAIL; note9="$note9$level: $note; "; fi
done
echo "9 | A REPEATABLE READ or SERIALIZABLE change to Passed racing a reset is refused; no gate passes without evidence | $r9 | $note9"

passed=0
for r in "$r1" "$r2" "$r3" "$r4" "$r5" "$r6" "$r7" "$r8" "$r9"; do [ "$r" = PASS ] && passed=$((passed + 1)); done
if [ "$passed" = 9 ]; then
  echo "99 | Overall | PASS | 9 of 9 races and checks as expected"
else
  echo "99 | Overall | FAIL | $passed of 9"; exit 1
fi
