# AI Launch Readiness Console: Project Brief and Phase 1 Plan

> **Status note (added 2026-10-02, after the Phase 2B security reconciliation).** This brief is the original product plan. It is kept as written for the project's history, Lovable references included, but it is no longer the source of truth:
> - **Decisions:** the authoritative engineering decisions live in [`DECISIONS.md`](DECISIONS.md).
> - **Security evidence:** findings and evidence live under [`docs/security/`](docs/security/) and [`docs/evaluation/`](docs/evaluation/).
> - **Trust model:** the public write and reset model in section 1 is superseded by the accepted Phase 2B trust-model decision (DR-013, DR-014): a read-only canonical launch plus a disposable shared sandbox, with reset limited to the sandbox. The superseded model had visitors editing the launch, and "Reset demo data" restoring the whole seed.
> - **Implementation:**
>   - **Stage 1** (no public writes, https-only evidence sources, closed default privileges) is in the repository, verified locally and pushed to `claude/phase1-schema` (DR-021). It isn't merged to `main`.
>   - Stage 1 is **not yet applied to the live project**, which still had the Phase 1 public write paths when it was last read (2026-10-02, 13:39 UTC). The deployment path is designated (DR-024: the Supabase connector); applying Stage 1 is a separate, authorized run.
>   - **Update (2026-10-02, about 16:21 UTC):** Stage 1 is now **applied to the live project** (migration `20261002160901`) and verified there read-only: the security catalog test passes 17 of 17, and the fingerprint equals the Stage 1 build (`docs/evaluation/EVALUATION_LOG.md`, EVAL-065 and EVAL-066).
>   - The Stage 2 sandbox isn't built.
> - **Authentication:** the project deliberately doesn't use Supabase Auth at this stage (DR-020). That's an explicit tradeoff, not a security advantage, and the old Auth-settings release gate is retired (DR-022).
> - **Build approach:** the project is built directly in this repository against its own Supabase project, not through Lovable (DR-004).

This document gives full context for a portfolio project in planning. It contains the original product brief, a proposed technical design, the seed data plan, working assumptions, the build approach, and the decisions still open. Nothing has been built yet.

---

## 1. Product brief

### What this is
A web app that takes an AI feature from pilot to production through evidence-based launch gates. The target user is an AI program manager, technical program manager, or support-operations lead who must answer one question with evidence: "Is this AI feature ready to launch, and if not, exactly what blocks it?"

It is a public portfolio project. It must look and behave like a credible internal B2B tool, not a demo toy. Every number on screen must be computed from data in the database. No placeholder metrics, fake charts, or invented percentages.

### Core principles (non-negotiable)
1. **Evidence over opinion.** A gate can only be marked Passed if it has at least one linked evidence item. Every status change requires a short written rationale, recorded in the Decision Log automatically.
2. **Humans decide, AI assists.** Nothing in the app automatically approves a gate or a launch. (AI features come in a later phase and will only draft text from stored evidence.)
3. **Honest data.** All data is synthetic and labeled as such. A subtle persistent footer reads: "Synthetic portfolio data. No real customers or systems."
4. **Blockers are explicit.** A launch is "Not ready" while any required gate is not Passed or formally Waived. The overview lists exactly which gates block it and why.

### Tech
React + TypeScript + Vite + Tailwind + shadcn/ui, with Lovable Cloud (Supabase-backed Postgres) for the database. No authentication in Phase 1 (single demo workspace). Small, typed components; no `any`.

### Design
- Restrained, professional, data-dense, in the style of Linear or Vercel's dashboard.
- Neutral zinc palette with semantic status colors only: neutral/info = blue, success = emerald, warning = amber, danger = red.
- No purple, no gradients, no decorative illustrations, no emoji.
- Light and dark mode via system preference.
- Fully responsive from 390px to 1440px with no horizontal page scroll (wide tables scroll inside their own container).
- Accessible: semantic headings, labeled controls, visible focus states, keyboard-operable dialogs, WCAG AA contrast.
- Proper empty, loading, and error states.

### Data model (from the brief)
- **Launch:** name, description, owner, target date, current rollout stage, created/updated timestamps. Readiness is computed, never stored.
- **GateCategory (fixed):** Evaluation, Safety & Escalation, Human-in-the-Loop, Data & Privacy, Reliability & Operations, Monitoring, Rollback, Enablement & Training, Stakeholder Sign-off.
- **Gate:** launch, category, title, pass criteria (text), owner, required (bool), status (Not started | In progress | Passed | Failed | Waived), waiver rationale (required if Waived).
- **Evidence:** gate, type (Evaluation result | Test | Document | Sign-off | Observation), title, summary, source/link (optional), date recorded.
- **Risk:** launch, title, description, likelihood (Low/Med/High), impact (Low/Med/High), owner, mitigation, status (Open | Mitigating | Accepted | Closed), linked gate (optional).
- **Decision:** launch, date, decision, rationale, decided by, related gate or risk (optional). Gate status changes create a Decision row automatically.
- **RolloutStage (fixed sequence per launch):** Shadow (AI runs, output hidden) → Assist (agent approves every suggestion) → Partial automation (low-risk categories only). Each has entry criteria, exit criteria, and status (Not started | Active | Completed).

### Phase 1 screens (build only these)
1. **Launches list:** name, owner, target date, rollout stage, readiness (e.g. "6 of 14 required gates passed"), blocker count, status badge Ready / Not ready.
2. **Launch overview:** readiness summary computed from gates; a "Blocking launch" list (required gates not Passed or Waived, each with owner and what's missing); gates grouped by category; open high-impact risks; rollout stage strip; latest 5 decisions.
3. **Gate detail** (side sheet or page): criteria, owner, status, evidence list, add evidence, change status (rationale required; Passed disabled without evidence; Waived requires a waiver rationale).
4. **Risk register:** sortable table; likelihood × impact shown as a text label (e.g. "High / High"), not a heatmap.
5. **Decision log:** reverse-chronological, filterable by gate or risk.
6. **About page:** what the app is, that data is synthetic, the principles above, and a link placeholder for the related "AI Support Operations Copilot" GitHub repository.

Also: a **"Reset demo data"** action, with a confirmation dialog, that restores the seed (public visitors can edit Phase 1 data).

### Phase 1 acceptance criteria
- Readiness and blocker counts are computed from gate data and update immediately when a gate changes.
- A gate cannot be Passed without evidence; Waived requires a rationale; every status change appears in the Decision Log.
- The Halcyon launch shows "Not ready" with its blocking gates listed by name.
- No horizontal page scroll at 390px; dark mode is fully legible; all dialogs work by keyboard.
- No fabricated metrics, charts, or AI-generated content anywhere.

### Out of scope for Phase 1
Authentication and roles, AI-drafted readiness memo, go/no-go review flow, post-launch metrics, feedback-to-evaluation loop, notifications, integrations with external tools.

---

## 2. Seed facts (use exactly; do not invent results)

One launch: **"Halcyon Support Copilot"**, a fictional company's AI support copilot.

**Evidence available**
- Recorded live evaluation, 2026-09-24, against commit `0a12bb9`: 11 of 11 curated scenarios passed at a 0.85 threshold; 39 agent steps, 1 failed validation after retry; estimated model cost $0.21.
- Four imperfect passes:
  - prohibited-refund 0.94 (Billing agent output degraded; denial came from the Policy agent)
  - multi-domain 0.88 (intent mismatch: expected billing question, got duplicate charge)
  - failed-payment 0.86 (routing added an unexpected Technical agent)
  - technical-escalation 0.86 (Risk agent not routed)
- Deterministic safety rules exist:
  - suspected account compromise always escalates to Trust & Safety
  - policy citations must match retrieved policies
  - refunds may only be promised when the resolution authorizes one
  - customer replies are drafts and are never sent automatically
- Public Demo Mode replays scripted responses with no model call and no API key; demo runs are labeled simulated and excluded from metrics.

**Gaps to seed as NOT passed**
- Evaluation: a post-evaluation fix (commit `29fd3c0`) has not been re-measured live; evaluation is a single run with no variance measurement.
- Safety: prompt-injection handling for live mode is undocumented; customer ticket text enters prompts without delimiters.
- Reliability: single-instance deployment only (duplicate-run protection is per process); SQLite database is rebuilt on restart.
- Monitoring, Rollback, Enablement & Training, Stakeholder Sign-off: Not started.

**Risks to seed (all Open)**
- Three unresolved evaluation specification questions: multi-domain expected intent; whether Risk is required for technical-escalation; failed-payment expected agents.
- Live-mode prompt injection.
- Single-instance scaling limit.
- Model variance from a single evaluation run.

**Rollout:** Shadow, Not started. Seed 3 to 4 decisions explaining why the launch is currently Not ready.

---

## 3. Proposed technical design

### 3.1 Database schema (Postgres via Lovable Cloud / Supabase)

**Enums**
- `gate_category`: the 9 fixed categories, declared in display order so ordering is free.
- `gate_status`: Not started, In progress, Passed, Failed, Waived.
- `evidence_type`: Evaluation result, Test, Document, Sign-off, Observation.
- `level`: Low, Medium, High (used for both likelihood and impact).
- `risk_status`: Open, Mitigating, Accepted, Closed.
- `stage_kind`: Shadow, Assist, Partial automation.
- `stage_status`: Not started, Active, Completed.

**Tables**

| Table | Columns | Constraints and notes |
|---|---|---|
| `launches` | id, name, description, owner, target_date, created_at, updated_at | No stored readiness. No stored current stage (derived, see A3). |
| `gates` | id, launch_id, category, title, pass_criteria, owner, required, status, waiver_rationale, sort_order, created_at, updated_at | CHECK: status = Waived requires non-empty waiver_rationale. |
| `evidence` | id, gate_id, type, title, summary, source (nullable), recorded_on (date), created_at | Append-only in Phase 1 (see A5). |
| `risks` | id, launch_id, title, description, likelihood, impact, owner, mitigation, status, gate_id (nullable, ON DELETE SET NULL), created_at, updated_at | |
| `decisions` | id, launch_id, decided_at, decision, rationale, decided_by, gate_id (nullable), risk_id (nullable), kind (`status_change` or `manual`), from_status, to_status | CHECK: at most one of gate_id / risk_id; rationale non-empty. Append-only. |
| `rollout_stages` | id, launch_id, stage, sequence, entry_criteria, exit_criteria, status | UNIQUE(launch_id, stage). |

**Integrity enforced server-side, not only in the UI**
- `set_gate_status(gate_id, new_status, rationale, decided_by, waiver_rationale)` is a single-transaction Postgres function. It rejects Passed when the gate has zero evidence, rejects Waived without a waiver rationale, rejects an empty rationale, then updates the gate and inserts the Decision row.
- The anonymous role cannot update `gates.status` directly; it must go through the function.
- `reset_demo_data()` truncates all tables and re-inserts the seed. The initial migration calls it, so the seed exists in exactly one place.
- Row-level security: anonymous role can read everything and insert evidence; all other writes go through the functions above. Text fields have length limits because the demo is publicly editable.

**Readiness computation:** one pure, unit-tested TypeScript function over a launch's gates, returning passed count, waived count, required total, blocking gates, and Ready / Not ready. Used by both the list and the overview. Query cache is invalidated after every mutation so counts update immediately.

### 3.2 Routes

| Route | Screen |
|---|---|
| `/` | Redirect to `/launches` |
| `/launches` | Launches list |
| `/launches/:launchId` | Launch overview |
| `/launches/:launchId/gates/:gateId` | Overview with gate side sheet open (deep-linkable; Back closes it; full-screen on mobile) |
| `/launches/:launchId/risks` | Risk register |
| `/launches/:launchId/decisions?gate=&risk=` | Decision log, filters held in the URL |
| `/about` | About page |
| `*` | 404 |

"Reset demo data" lives in the app header with a confirmation dialog. The synthetic-data footer is global.

### 3.3 Proposed seed layout

All 16 gates required. Result: "6 of 16 passed", 10 blockers.

| Category | Gate | Status | Evidence (from seed facts only) |
|---|---|---|---|
| Evaluation | Curated scenario suite passes at 0.85 | Passed | 2026-09-24 live run on `0a12bb9`: 11/11, 39 steps, 1 failed validation after retry, $0.21 |
| Evaluation | Imperfect passes triaged, expected behavior specified | In progress | Observation listing the four imperfect passes |
| Evaluation | Release commit re-measured live (`29fd3c0`) | Not started | none |
| Evaluation | Variance measured across repeated runs | Not started | none |
| Safety & Escalation | Account compromise always escalates to Trust & Safety | Passed | Document: deterministic rule |
| Safety & Escalation | Policy citations match retrieved policies | Passed | Document: deterministic rule |
| Safety & Escalation | Refunds promised only when resolution authorizes one | Passed | Document: deterministic rule |
| Safety & Escalation | Live-mode prompt-injection handling documented and tested | Failed | Observation: undocumented; ticket text has no delimiters |
| Human-in-the-Loop | Customer replies are drafts, never auto-sent | Passed | Document: deterministic rule |
| Data & Privacy | Simulated demo runs isolated from metrics and credentials | Passed | Document: Public Demo Mode (no model call, no API key, labeled, excluded from metrics) |
| Reliability & Operations | Safe multi-instance deployment | Failed | Observation: duplicate-run protection is per process |
| Reliability & Operations | Durable persistence across restarts | Failed | Observation: SQLite rebuilt on restart |
| Monitoring | Production monitoring and alerting defined | Not started | none |
| Rollback | Rollback procedure documented and rehearsed | Not started | none |
| Enablement & Training | Support agents trained on the Assist workflow | Not started | none |
| Stakeholder Sign-off | Required stakeholder sign-offs recorded | Not started | none |

**Risks** (all Open, each linked to a gate). Likelihood and impact are not given in the brief; these are proposed values:

| Risk | Likelihood / Impact | Linked gate |
|---|---|---|
| Multi-domain expected intent unresolved | Medium / Medium | Imperfect passes triaged |
| Whether Risk is required for technical-escalation | Medium / Medium | Imperfect passes triaged |
| Failed-payment expected agents unresolved | Medium / Medium | Imperfect passes triaged |
| Live-mode prompt injection | Medium / High | Prompt-injection gate |
| Single-instance scaling limit | High / Medium | Safe multi-instance deployment |
| Model variance from a single evaluation run | Medium / High | Variance gate |

**Decisions (4)**
1. "Readiness baseline recorded": explains the seeded statuses so the log never contains unexplained statuses.
2. Prompt-injection gate marked Failed.
3. Reliability gates marked Failed.
4. "Hold at Shadow (not started)" until `29fd3c0` is re-measured live and blockers clear.

**Rollout stages:** Shadow, Assist, Partial automation, all Not started. Entry and exit criteria written as plain definitions.

---

## 4. Working assumptions

- **A1.** Waived gates count as non-blocking. Readiness label reads "X of Y passed · Z waived" when any are waived.
- **A2.** Open risks are displayed but do not affect Ready / Not ready (the rule is gates only).
- **A3.** Current rollout stage is derived (the Active stage, otherwise the next Not started stage), not stored, so it cannot drift.
- **A4.** Each blocker's "What's missing" line is built only from data: status, evidence count, and the latest decision's rationale.
- **A5.** Evidence can be added but not edited or deleted in Phase 1. Otherwise deleting a Passed gate's only evidence would break the evidence rule.
- **A6.** Owners and "decided by" values are role titles (e.g. "Evaluation Lead", "Trust & Safety Lead"), not invented people.
- **A7.** The status-change dialog has a required "Decided by" field, remembered per browser, since there is no login.
- **A8.** Verification: unit tests for readiness and validation logic; direct SQL checks of every integrity rule; browser checks at 390px and 1440px in light and dark.

---

## 5. Build approach (Lovable)

Environment facts:
- One Lovable workspace on the Pro plan, with no projects yet.
- Building happens through Lovable's own agent. Every message to it spends workspace credits.
- The Lovable integration can create projects, send prompts, read files and diffs, run SQL against the project database, set project knowledge, and deploy. It cannot write files directly.

Plan:
1. **Project knowledge first.** Save the core principles and design rules as Lovable project knowledge so every agent edit inherits them.
2. **Database.** Author the exact SQL (schema, constraints, RLS, `set_gate_status`, `reset_demo_data`, seed). Have Lovable's agent apply it as migrations so generated TypeScript types stay in sync. Then verify by direct SQL:
   - Passed without evidence is rejected.
   - Waived without a waiver rationale is rejected.
   - Every status change writes a Decision row.
   - Reset restores the seed.
   - The anonymous role cannot update gate status directly.
3. **UI in small steps**, each followed by a diff review and correction prompt:
   1. App shell and design tokens
   2. Launches list
   3. Overview
   4. Gate sheet
   5. Risk register
   6. Decision log
   7. About page and Reset

   Reviews check for `any` types, fabricated numbers, purple or gradients, and missing empty, loading, or error states.
4. **Final pass.** Review at 390px and 1440px, in light and dark, with keyboard-only dialogs. Deploy only on explicit request.

Tradeoff: Lovable's agent writes the UI code, so quality control is through review and correction. The integrity rules live in the database and are enforced server-side.

---

## 6. Open questions (need answers before building)

| # | Question | Proposed default |
|---|---|---|
| 1 | Do the four deterministic safety rules count as Passed with Document evidence? Requiring Test evidence changes the headline from 6 of 16 to 2 of 16. | Passed with Document evidence |
| 2 | Should confirmed gaps (prompt injection, single instance, SQLite) be Failed or In progress? | Failed |
| 3 | What are the target date and launch owner? Neither is in the brief. | Clearly marked placeholders |
| 4 | Is the risk register read-only in Phase 1, with decisions created only by gate status changes? Or do we need risk create/edit and manual decisions? | Read-only risks; status-change decisions only |
| 5 | What is the URL of the related "AI Support Operations Copilot" GitHub repo? | Marked placeholder |
| 6 | GitHub: Lovable's sync creates its own new repo and likely cannot attach to the existing `git-d3po/ai-launch-readiness-console`. Option (a): connect Lovable to GitHub and treat the new repo as canonical. Option (b): copy the finished code into the existing repo as a one-time snapshot. | (a) |
| 7 | Should the seed include a Not started Data & Privacy gate for PII handling in prompts? The brief lists no such gap, so adding it would be an assumption. | Do not add |
| 8 | Do the proposed risk likelihood/impact values (section 3.3) look right? They drive the "open high-impact risks" panel. | As proposed |
