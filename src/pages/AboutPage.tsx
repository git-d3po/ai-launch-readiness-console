import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { focusRing } from '../components/AppShell';

// A short context page for portfolio visitors. Static copy only; no data.
export function AboutPage() {
  return (
    <article className="max-w-2xl">
      <h1 className="text-lg font-semibold tracking-tight">About this console</h1>
      <p className="mt-2 text-[14px] leading-relaxed">
        A console for deciding whether an AI system is ready to launch. Each launch moves through explicit gates
        (evaluation, safety, human review, rollback and others). A gate passes only with evidence, every status change
        records a decision, and readiness is computed from those records rather than set by hand.
      </p>

      <Section title="Why it exists">
        <p>
          Model quality alone does not make a launch safe. Teams also need clear ownership, evidence that checks were
          run, escalation paths, rollout controls and a record of who decided what. This console keeps those in one
          place.
        </p>
      </Section>

      <Section title="How to use the demo">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            The <span className="font-medium">canonical launch</span> is read-only. Open it from{' '}
            <Link to="/launches" className={`rounded-sm text-accent underline-offset-2 hover:underline ${focusRing}`}>
              Launches
            </Link>{' '}
            to see gates, risks, rollout stages and decisions.
          </li>
          <li>
            The <span className="font-medium">sandbox</span> is a shared, disposable copy. Use “Try this in the sandbox”
            on the canonical launch to get there.
          </li>
          <li>In the sandbox, open any gate to add evidence or change its status with a rationale.</li>
          <li>Your records are labeled “Visitor”. Other visitors see them too.</li>
          <li>
            “Reset sandbox” in the header removes visitor changes, at most once every 5 minutes. Sandbox actions never
            modify the canonical launch.
          </li>
        </ul>
      </Section>

      <Section title="What it demonstrates">
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[12rem_1fr]">
          <Item term="Postgres-enforced rules">Gate, evidence and decision rules live in the database, not the browser.</Item>
          <Item term="Constrained sandbox writes">Visitors write only through three narrow database functions with caps and checks.</Item>
          <Item term="Provenance">Every evidence item and decision records whether it came from seed data or a visitor.</Item>
          <Item term="Evidence-based readiness">Readiness is derived from gates and evidence, never stored.</Item>
          <Item term="Safe source rendering">Only seed-data sources with an https address are links; visitor sources stay plain text.</Item>
          <Item term="Defensive error handling">A failed refresh keeps the last good data on screen and says what went wrong.</Item>
          <Item term="Deterministic refresh">Writes and resets trigger one predictable refetch, with no optimistic data.</Item>
          <Item term="Verification">Database behavior and invariant tests, a security catalog test and unit tests check these rules.</Item>
        </dl>
      </Section>

      <Section title="About the data">
        <p>
          All content is synthetic demo data. No real customers, people or systems are represented. The shared sandbox
          is disposable and may be reset by any visitor.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-5 leading-relaxed">
      <h2 className="mb-2 text-[14px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Item({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-medium">{term}</dt>
      <dd className="text-muted">{children}</dd>
    </>
  );
}
