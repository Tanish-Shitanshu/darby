import { useState } from 'react';
import type { PlanStep } from '@darby/contracts';
import { prettySlug, proofLine, VERDICT_TEXT, type RunView, type StepView, type TimelineItem } from './state';
import { useDarby, type Link, type VerifyResult } from './useDarby';

const LINK_TEXT: Record<Link, string> = { connecting: 'Connecting…', up: 'Connected', down: 'Offline' };
const GOAL_EXAMPLE = 'Research the 10 AI startups on the fixture site, record name, lowest paid monthly price in USD and an evidence quote in a new sheet called Competitors, then share it with the team email.';

function StatusDot({ name, link, detail }: { name: string; link: Link; detail?: string }) {
  return (
    <li className={`pill pill-${link}`} data-testid={`status-${name}`} title={detail ?? LINK_TEXT[link]}>
      <span className="dot" aria-hidden="true" /> {name}: {detail ?? LINK_TEXT[link]}
    </li>
  );
}

const RISK_LABEL: Record<string, string> = { read: 'read', write_local: 'writes locally', external_effect: 'external effect', forbidden: 'forbidden' };
const STATUS_LABEL: Record<string, string> = {
  pending: 'waiting', running: 'running', awaiting_approval: 'needs your approval', verifying: 'verifying independently',
  passed: 'proven', passed_with_gaps: 'proven, with gaps', failed: 'failed', blocked: 'blocked', cancelled: 'cancelled',
};

function PlanList({ run }: { run: RunView }) {
  if (!run.plan) return <p className="muted" data-testid="planning">Planning… the planner sees your goal only, never web page text.</p>;
  return (
    <ol className="plan" data-testid="plan">
      {run.plan.steps.map((s: PlanStep, i) => {
        const v: StepView | undefined = run.steps[s.id];
        const status = v?.status ?? 'pending';
        return (
          <li key={s.id} className={`step step-${status}`} data-testid={`step-${s.id}`}>
            <div className="step-head">
              <span className="num">{i + 1}</span>
              <strong>{s.title}</strong>
              <span className={`chip risk-${s.suggestedRisk}`}>{RISK_LABEL[s.suggestedRisk]}</span>
              <span className={`chip st-${status}`}>{STATUS_LABEL[status] ?? status}</span>
            </div>
            <div className="proof">{proofLine(s.contract)}</div>
            <div className="tool">tool: <code>{s.tool}</code></div>
          </li>
        );
      })}
    </ol>
  );
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="timeline" data-testid="timeline">
      {items.map((t) => (
        <li key={t.id} className={`tl tl-${t.kind} ${t.ok === false ? 'bad' : t.ok === true ? 'good' : ''}`}>
          <div className="tl-main">
            {t.stepId && <span className="tl-step">{t.stepId}</span>}
            {t.chip && <span className="chip rule">{t.chip}</span>}
            <span>{t.text}</span>
          </div>
          {t.shot && (
            <a href={t.shot} target="_blank" rel="noreferrer" className="thumb" title="Open the screenshot">
              <img src={t.shot} alt="screenshot of the page Darby read" loading="lazy" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function ApprovalCard({ run, onResolve, onTakeover }: { run: RunView; onResolve: (stepId: string, ok: boolean) => void; onTakeover: () => void }) {
  const a = run.approval;
  if (!a) return null;
  const d = a.details as Record<string, unknown>;
  return (
    <section className="approval" data-testid="approval-card" role="alertdialog" aria-label="Approval needed">
      <h2>Darby needs your approval</h2>
      <p className="big">{a.summary}</p>
      <dl>
        {['target', 'role', 'document', 'contentSummary'].filter((k) => d[k] !== undefined).map((k) => (<div key={k}><dt>{k}</dt><dd>{String(d[k])}</dd></div>))}
        <div><dt>content hash</dt><dd><code>{String(d.contentHash ?? '').slice(0, 16)}…</code></dd></div>
      </dl>
      {d.simulated === true && <p className="sim">SIMULATED — {String(d.note ?? '')}</p>}
      <div className="row">
        <button className="ok" onClick={() => onResolve(a.stepId, true)} data-testid="approve">Approve</button>
        <button className="warn" onClick={() => onResolve(a.stepId, false)} data-testid="deny">Deny</button>
        <button className="ghost" onClick={onTakeover}>Take over</button>
      </div>
    </section>
  );
}

function Receipt({ run, verify, onVerify }: { run: RunView; verify: VerifyResult | null; onVerify: () => void }) {
  const r = run.receipt;
  if (!r) return null;
  const names: Record<string, string> = {};
  const labels = r.labels ?? [];
  return (
    <section className={`receipt verdict-${r.verdict}`} data-testid="receipt">
      <div className="receipt-head">
        <span className={`verdict v-${r.verdict}`} data-testid="verdict">{VERDICT_TEXT[r.verdict] ?? r.verdict}</span>
        {labels.map((l) => (<span key={l} className="chip label">{l}</span>))}
        {r.blocked.length > 0 && <span className="chip contained" data-testid="contained">CONTAINED · {r.blocked.length} blocked</span>}
        {verify && <span className={`chip ${verify.valid ? 'chain-ok' : 'chain-bad'}`} data-testid="chain-badge">{verify.valid ? 'chain valid ✓' : 'chain INVALID ✗'}</span>}
      </div>
      {r.cause && <p className="cause">{r.cause}</p>}
      {r.gaps.length > 0 && (
        <div className="gaps" data-testid="gaps">
          <strong>{r.gaps.length} gaps flagged</strong> — price not shown on the page, marked NOT FOUND, never guessed:{' '}
          {r.gaps.map((g) => (<span key={g} className="chip gap">{names[g] ?? prettySlug(g)}</span>))}
        </div>
      )}
      <ul className="proofs">
        {r.steps.map((s) => (
          <li key={s.stepId}><span className={`chip st-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span> <strong>{s.title}</strong><div className="muted">{s.evidenceSummary}</div></li>
        ))}
      </ul>
      {r.blocked.length > 0 && (
        <div className="blocked"><strong>Blocked attempts</strong><ul>{r.blocked.map((b, i) => (<li key={i}><code>{b.ruleId}</code> {b.summary}</li>))}</ul></div>
      )}
      <div className="row small">
        <span className="muted">receipt <code>{r.signature.slice(0, 10)}…{r.signature.slice(-6)}</code> · chain head <code>{r.chainHead.slice(0, 10)}…</code></span>
        <button className="ghost" onClick={onVerify} data-testid="verify-btn">Verify receipt</button>
        <a className="ghost link" href={`/api/runs/${run.id}/receipt`} download>Download receipt (JSON)</a>
      </div>
      {r.llm && <p className="muted small">model: {r.llm.provider}/{r.llm.model} · {r.llm.liveCalls} live calls, {r.llm.replayedCalls} replayed</p>}
    </section>
  );
}

export function App() {
  const d = useDarby();
  const [goal, setGoal] = useState('');
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const run = d.run;
  const live = !!run && ['planning', 'running', 'paused', 'awaiting_approval'].includes(run.phase);
  const allUp = d.server === 'up' && d.socket === 'up' && d.echo === 'ok';
  const link = (b: boolean): Link => (b ? 'up' : 'down');

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Darby</h1>
          <p className="tagline">The AI-native browser where “done” means proven.</p>
        </div>
        <ul className="statuses">
          <StatusDot name="Server" link={d.server} />
          <StatusDot name="Live channel" link={d.socket} />
          <StatusDot name="Event round-trip" link={d.echo === 'ok' ? 'up' : d.echo === 'failed' ? 'down' : 'connecting'} detail={d.echo === 'ok' ? 'echoed & validated' : undefined} />
          {d.config && <StatusDot name="Model" link={link(true)} detail={d.config.llm.replayOnly ? 'REPLAY (recorded)' : `${d.config.llm.provider}/${d.config.llm.model}`} />}
        </ul>
      </header>
      <div data-testid="overall" className="sr">{allUp ? 'Connected to Darby server' : 'Waiting for server'}</div>

      {!run && (
        <main className="panel">
          <section aria-labelledby="goal-h">
            <h2 id="goal-h">What should Darby get done?</h2>
            <textarea data-testid="goal-box" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4}
              placeholder="Describe your goal in plain language…" aria-label="Your goal" />
            <div className="row">
              <button className="primary" disabled={!allUp || goal.trim().length < 3} onClick={() => { setVerify(null); void d.start(goal.trim()); }} data-testid="run-btn">Plan &amp; run</button>
              <button className="ghost" onClick={() => setGoal(GOAL_EXAMPLE)}>Use the example goal</button>
              <span className="muted">Every step gets a proof; the run ends in a signed receipt.</span>
            </div>
            {d.error && <p className="error" role="alert">{d.error}</p>}
          </section>
          <section aria-labelledby="hist-h">
            <h2 id="hist-h">Task history</h2>
            {d.history.length === 0 ? <p className="muted">No runs yet.</p> : (
              <ul className="history">
                {d.history.map((h) => (
                  <li key={h.id}>
                    <button className="linkbtn" onClick={() => { setVerify(null); void d.open(h.id); }}>{h.goal.slice(0, 90)}{h.goal.length > 90 ? '…' : ''}</button>
                    <span className={`chip v-${h.verdict ?? 'none'}`}>{h.verdict ? VERDICT_TEXT[h.verdict] : h.status}</span>
                    {h.labels.map((l) => (<span key={l} className="chip label">{l}</span>))}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      )}

      {run && (
        <main className="panel">
          <section>
            <div className="run-head">
              <div><h2>Goal</h2><p className="goal" data-testid="run-goal">{run.goal || '…'}</p></div>
              <div className="row">
                {live && <button className="danger" onClick={() => void d.cancel(run.id)} data-testid="cancel-btn">Cancel</button>}
                {live && run.phase !== 'paused' && <button className="ghost" onClick={() => void d.takeover(run.id)}>Take over</button>}
                {run.phase === 'paused' && <button className="primary" onClick={() => void d.resume(run.id)}>Resume</button>}
                {!live && <button className="ghost" onClick={() => { d.newRun(); setGoal(''); void d.refreshHistory(); }}>New goal</button>}
              </div>
            </div>
            <h2>Plan — a proof for every step</h2>
            <PlanList run={run} />
          </section>

          <ApprovalCard run={run} onResolve={(s, ok) => void d.approve(run.id, s, ok)} onTakeover={() => void d.takeover(run.id)} />

          {run.receipt && <Receipt run={run} verify={verify} onVerify={() => void d.verifyReceipt(run.id).then((x) => setVerify(x.original))} />}

          <section>
            <h2>Live timeline</h2>
            <Timeline items={run.timeline} />
          </section>
          {d.error && <p className="error" role="alert">{d.error}</p>}
        </main>
      )}
    </div>
  );
}
