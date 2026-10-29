import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EvidenceContract, PlanStep } from '@darby/contracts';
import { prettySlug, proofLine, VERDICT_TEXT, type RunView, type StepView, type TimelineItem } from './state';
import type { EvidenceRow, MemoryItem, RunDetail, RunSummary, VerifyResult } from './useDarby';

export const RISK_LABEL: Record<string, string> = { read: 'reads', write_local: 'writes locally', external_effect: 'external effect', forbidden: 'forbidden' };
export const STATUS_LABEL: Record<string, string> = {
  pending: 'waiting', running: 'running', awaiting_approval: 'needs your approval', verifying: 'verifying independently',
  passed: 'proven', passed_with_gaps: 'proven, with gaps', failed: 'failed', blocked: 'blocked', cancelled: 'cancelled',
};

/* ---------- screenshot lightbox ---------- */
/** Moves focus into a dialog when it opens, keeps Tab inside it, and gives focus back to whatever opened it. */
function useDialogFocus(open: boolean, trap: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== 'Tab' || !ref.current) return;
      const f = [...ref.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      const a = f[0]!, z = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [open, trap]);
  return ref;
}

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const ref = useDialogFocus(!!src, true);
  useEffect(() => {
    if (!src) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot" onClick={onClose} data-testid="lightbox" ref={ref as never}>
      <img src={src} alt="Full screenshot of the page Darby saw" />
      <button className="btn ghost close" onClick={onClose}>Close (Esc)</button>
    </div>
  );
}

/* ---------- plan ---------- */
export function PlanList({ run, onOpen, active }: { run: RunView; onOpen: (stepId: string) => void; active: string | null }) {
  if (!run.plan) return <p className="muted" data-testid="planning">Planning… the planner sees your goal only, never web page text.</p>;
  return (
    <ol className="plan" data-testid="plan">
      {run.plan.steps.map((s: PlanStep, i) => {
        const v: StepView | undefined = run.steps[s.id];
        const status = v?.status ?? 'pending';
        return (
          <li key={s.id} className={`ticket step-${status} ${active === s.id ? 'is-active' : ''}`} data-testid={`step-${s.id}`}>
            <button className="ticket-btn" onClick={() => onOpen(s.id)} aria-label={`Open evidence for step ${i + 1}: ${s.title}`}>
              <div className="ticket-head">
                <span className="num">{i + 1}</span>
                <strong>{s.title}</strong>
              </div>
              <div className="chips">
                <span className={`chip risk-${s.suggestedRisk}`}>{RISK_LABEL[s.suggestedRisk]}</span>
                <span className={`chip st-${status}`}>{STATUS_LABEL[status] ?? status}</span>
                {v?.decision && <span className={`chip rule ${v.decision.action === 'block' ? 'rule-block' : ''}`}>{v.decision.ruleId.split('-').slice(0, 2).join('-')}</span>}
              </div>
              <div className="proof">{proofLine(s.contract)}</div>
              <div className="ticket-foot"><code>{s.tool}</code><span>evidence ›</span></div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- timeline ---------- */
export function Timeline({ items, onShot }: { items: TimelineItem[]; onShot: (src: string) => void }) {
  return (
    <ul className="timeline" data-testid="timeline">
      {items.map((t) => (
        <li key={t.id} className={`tl tl-${t.kind} ${t.ok === false ? 'bad' : t.ok === true ? 'good' : ''}`}>
          <div className="tl-main">
            {t.stepId && <span className="tl-step">{t.stepId}</span>}
            {t.chip && <span className={`chip rule ${t.ok === false ? 'rule-block' : ''}`}>{t.chip}</span>}
            <span>{t.text}</span>
          </div>
          {t.shot && (
            <button className="thumb" onClick={() => onShot(t.shot!)} aria-label="Enlarge screenshot">
              <img src={t.shot} alt="screenshot of the page Darby read" loading="lazy" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------- approval ---------- */
export function ApprovalCard({ run, onResolve, onTakeover }: { run: RunView; onResolve: (stepId: string, ok: boolean) => void; onTakeover: () => void }) {
  const a = run.approval;
  if (!a) return null;
  const d = a.details as Record<string, unknown>;
  const rows: [string, string][] = ([['Target', 'target'], ['Role', 'role'], ['Document', 'document'], ['Content', 'contentSummary']] as [string, string][])
    .filter(([, k]) => d[k] !== undefined).map(([l, k]) => [l, String(d[k])]);
  return (
    <section className="approval" data-testid="approval-card" role="alert" aria-label="Approval needed">
      <div className="approval-tag">Needs your approval</div>
      <h2>{a.summary}</h2>
      <dl>
        {rows.map(([l, v]) => (<div key={l}><dt>{l}</dt><dd>{v}</dd></div>))}
        <div><dt>Content hash</dt><dd><code>{String(d.contentHash ?? '').slice(0, 24)}…</code></dd></div>
      </dl>
      {d.simulated === true && <p className="sim">SIMULATED — {String(d.note ?? '')}</p>}
      <div className="row">
        <button className="btn ok" onClick={() => onResolve(a.stepId, true)} data-testid="approve">Approve</button>
        <button className="btn warn" onClick={() => onResolve(a.stepId, false)} data-testid="deny">Deny</button>
        <button className="btn ghost" onClick={onTakeover}>Take over</button>
      </div>
    </section>
  );
}

/* ---------- receipt ---------- */
export function Receipt({ run, verify, tamper, onTamper, onRemember, remembered }: {
  run: RunView; verify: VerifyResult | null; tamper: { original: VerifyResult; tampered: VerifyResult; edit: { index: number; type: string } } | null;
  onTamper: () => void; onRemember: () => void; remembered: boolean;
}) {
  const r = run.receipt;
  if (!r) return null;
  const labels = r.labels ?? [];
  const when = new Date(r.createdAt);
  return (
    <section className={`receipt verdict-${r.verdict}`} data-testid="receipt" aria-label="Receipt">
      <div className="receipt-top">
        <div>
          <div className="eyebrow">Receipt · {when.toLocaleDateString()} {when.toLocaleTimeString()}</div>
          <h2 className="receipt-title">{run.goal.length > 120 ? `${run.goal.slice(0, 120)}…` : run.goal}</h2>
        </div>
        <div className={`stamp v-${r.verdict}`} data-testid="verdict">{(VERDICT_TEXT[r.verdict] ?? r.verdict).toUpperCase()}</div>
      </div>
      <div className="chips big">
        {labels.map((l) => (<span key={l} className="chip label" title={l.startsWith('SIMULATED') ? 'Simulated: nothing real left this computer' : 'Served from recorded model responses'}>{l}</span>))}
        {r.blocked.length > 0 && <span className="chip contained" data-testid="contained">CONTAINED · {r.blocked.length} blocked</span>}
        {verify && <span className={`chip ${verify.valid ? 'chain-ok' : 'chain-bad'}`} data-testid="chain-badge">{verify.valid ? 'chain valid ✓' : 'chain INVALID ✗'}</span>}
        {r.repairOf && <span className="chip label">repair of {r.repairOf.slice(4, 19)}</span>}
      </div>
      {r.cause && <p className="cause" data-testid="cause">{r.cause}</p>}
      {r.gaps.length > 0 && (
        <div className="gaps" data-testid="gaps">
          <strong>{r.gaps.length} gaps flagged</strong> — price not shown on the page, marked NOT FOUND, never guessed:{' '}
          {r.gaps.map((g) => (<span key={g} className="chip gap">{prettySlug(g)}</span>))}
        </div>
      )}
      <ul className="proofs">
        {r.steps.map((s) => (
          <li key={s.stepId}><span className={`chip st-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span> <strong>{s.title}</strong><div className="muted">{s.evidenceSummary}</div></li>
        ))}
      </ul>
      {r.blocked.length > 0 && (
        <div className="blocked" data-testid="blocked"><strong>Blocked attempts</strong>
          <ul>{r.blocked.map((b, i) => (<li key={i}><code>{b.ruleId}</code> {b.summary}</li>))}</ul>
        </div>
      )}
      <div className="seal">
        <div><span className="muted">signature</span> <code>{r.signature.slice(0, 14)}…{r.signature.slice(-6)}</code></div>
        <div><span className="muted">chain head</span> <code>{r.chainHead.slice(0, 18)}…</code></div>
        {r.llm && <div className="muted">model {r.llm.provider}/{r.llm.model} · {r.llm.liveCalls} live, {r.llm.replayedCalls} replayed</div>}
      </div>
      <div className="row">
        <button className="btn ghost" onClick={onTamper} data-testid="tamper-btn">Tamper test</button>
        <a className="btn ghost" href={`/api/runs/${run.id}/receipt`} download>Download receipt (JSON)</a>
        <button className="btn ghost" onClick={onRemember} disabled={remembered}>{remembered ? 'Remembered' : 'Remember this run'}</button>
      </div>
      {tamper && (
        <div className="tamper" data-testid="tamper-result">
          <div className="tamper-col"><strong>Original receipt</strong><span className={`chip ${tamper.original.valid ? 'chain-ok' : 'chain-bad'}`}>{tamper.original.valid ? 'VALID ✓' : 'INVALID'}</span></div>
          <div className="tamper-arrow" aria-hidden="true">edit one ledger entry (#{tamper.edit.index}, {tamper.edit.type}) in a copy →</div>
          <div className="tamper-col"><strong>Edited copy</strong><span className={`chip ${tamper.tampered.valid ? 'chain-ok' : 'chain-bad'}`}>{tamper.tampered.valid ? 'VALID' : 'INVALID ✗'}</span>
            <span className="muted small">{tamper.tampered.checks.find((c) => !c.ok)?.detail}</span></div>
        </div>
      )}
    </section>
  );
}

/* ---------- evidence drawer ---------- */
function contractRows(c: EvidenceContract | null): [string, string][] {
  if (!c) return [['kind', 'none (pure reasoning step)']];
  switch (c.kind) {
    case 'quote_in_page': return [['kind', 'quote_in_page'], ['page', c.url], ['claims', 'one check per page; the claims are filled in at run time']];
    case 'sheet_readback': return [['kind', 'sheet_readback'], ['document', c.sheetRef], ['range', c.range], ['expected', 'the exact rows that were written, filled in at run time']];
    case 'file_exists': return [['kind', 'file_exists'], ['path', c.path], ['min bytes', String(c.minBytes)]];
    case 'permission_present': return [['kind', 'permission_present'], ['document', c.fileRef], ['who', `${c.email} as ${c.role}`]];
    case 'http_json_contains': return [['kind', 'http_json_contains'], ['url', c.url], ['expects', JSON.stringify(c.expected).slice(0, 120)]];
    case 'page_assertions': return [['kind', 'page_assertions'], ['page', c.url], ['assertions', `${c.assertions.length}`]];
    case 'vision_check': return [['kind', 'vision_check'], ['screenshot', c.screenshotPath], ['question', c.question]];
  }
}

export function EvidenceDrawer({ run, stepId, detail, onClose, onShot }: { run: RunView; stepId: string | null; detail: RunDetail | null; onClose: () => void; onShot: (s: string) => void }) {
  const ref = useDialogFocus(!!stepId, false);
  const step = run.plan?.steps.find((s) => s.id === stepId);
  const view = stepId ? run.steps[stepId] : undefined;
  const shots = useMemo(() => run.timeline.filter((t) => t.stepId === stepId && t.shot), [run.timeline, stepId]);
  useEffect(() => {
    if (!stepId) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [stepId, onClose]);
  if (!step) return null;
  const files: EvidenceRow[] = (detail?.evidence ?? []).filter((e) => e.stepId === stepId);
  const result = detail?.steps.find((s) => s.stepId === stepId)?.result;
  const approvals = (detail?.approvals ?? []).filter((a) => a.stepId === stepId);
  return (
    <aside className="drawer" data-testid="evidence-drawer" role="dialog" aria-modal="false" aria-label={`Evidence for ${step.title}`} ref={ref as never}>
      <div className="drawer-head">
        <div>
          <div className="eyebrow">Evidence · step {step.id}</div>
          <h2>{step.title}</h2>
        </div>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </div>
      <div className="chips"><span className={`chip st-${view?.status ?? 'pending'}`}>{STATUS_LABEL[view?.status ?? 'pending']}</span><span className={`chip risk-${step.suggestedRisk}`}>{RISK_LABEL[step.suggestedRisk]}</span></div>

      <h3>What counts as proof</h3>
      <p>{proofLine(step.contract)}</p>
      <dl className="kv">{contractRows(step.contract).map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl>

      {view?.decision && (<>
        <h3>Policy decision</h3>
        <p><span className={`chip rule ${view.decision.action === 'block' ? 'rule-block' : ''}`}>{view.decision.ruleId}</span> <strong>{view.decision.action.replace(/_/g, ' ')}</strong> — {view.decision.reason}</p>
      </>)}

      {approvals.length > 0 && (<>
        <h3>Approval</h3>
        {approvals.map((a, i) => (<p key={i}>{a.summary} — <strong>{a.status}</strong> <span className="muted">hash <code>{a.contentHash.slice(0, 12)}…</code></span></p>))}
      </>)}

      <h3>Verification results ({view?.evidence.length ?? 0})</h3>
      {view && view.evidence.length > 0 ? (
        <ul className="ev-list">
          {view.evidence.slice(0, 40).map((e, i) => (<li key={i} className={e.passed ? 'good' : 'bad'}><span className="mark">{e.passed ? '✓' : '✗'}</span> {e.detail}</li>))}
          {view.evidence.length > 40 && <li className="muted">… {view.evidence.length - 40} more</li>}
        </ul>
      ) : <p className="muted">No verification results yet.</p>}

      {shots.length > 0 && (<>
        <h3>Screenshots ({shots.length})</h3>
        <div className="shots">{shots.map((t) => (<button key={t.id} className="thumb big" onClick={() => onShot(t.shot!)}><img src={t.shot} alt="" loading="lazy" /></button>))}</div>
      </>)}

      {files.length > 0 && (<>
        <h3>Files with sha256</h3>
        <ul className="files">{files.map((f) => (<li key={f.id}><code>{f.path.split('/').slice(-2).join('/')}</code> <span className="muted">{f.bytes} B</span><br /><code className="hash">{f.sha256}</code></li>))}</ul>
      </>)}

      {result && (<>
        <h3>Stored result</h3>
        <pre className="json">{JSON.stringify(result, null, 2).slice(0, 1500)}</pre>
      </>)}
    </aside>
  );
}

/* ---------- history ---------- */
export function History({ items, onOpen }: { items: RunSummary[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const shown = items.filter((h) => !q || h.goal.toLowerCase().includes(q.toLowerCase()) || (h.verdict ?? '').toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="card" aria-labelledby="hist-h">
      <div className="card-head"><h2 id="hist-h">Task history</h2><input className="search" placeholder="Filter by goal or verdict" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter history" /></div>
      {shown.length === 0 ? <p className="muted">No runs yet.</p> : (
        <ul className="history" data-testid="history">
          {shown.map((h) => (
            <li key={h.id}>
              <button className="linkbtn" onClick={() => onOpen(h.id)}>{h.goal.slice(0, 110)}{h.goal.length > 110 ? '…' : ''}</button>
              <div className="chips">
                <span className={`chip v-${h.verdict ?? 'none'}`}>{h.verdict ? VERDICT_TEXT[h.verdict] : h.status}</span>
                {h.labels.map((l) => (<span key={l} className="chip label">{l}</span>))}
                {h.blocked > 0 && <span className="chip contained">CONTAINED · {h.blocked}</span>}
                {h.repairOf && <span className="chip label">repair</span>}
                <span className="muted small">{new Date(h.createdAt).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- memory ---------- */
export function Memory({ items, onAdd, onDelete }: { items: MemoryItem[]; onAdd: (k: string, v: string) => void; onDelete: (id: string) => void }) {
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  return (
    <section className="card" aria-labelledby="mem-h">
      <h2 id="mem-h">Memory — yours to view and delete</h2>
      <p className="muted">Notes you write here are shown to the planner as trusted preferences. Entries saved from a run are only facts about that run (never page text) and are not sent to any model.</p>
      <form className="mem-form" onSubmit={(e) => { e.preventDefault(); if (k.trim() && v.trim()) { onAdd(k.trim(), v.trim()); setK(''); setV(''); } }}>
        <input value={k} onChange={(e) => setK(e.target.value)} placeholder="Name (e.g. Preferred tone)" aria-label="Memory name" maxLength={80} />
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Note (up to 300 characters)" aria-label="Memory note" maxLength={300} />
        <button className="btn primary" type="submit" disabled={!k.trim() || !v.trim()}>Remember</button>
      </form>
      {items.length === 0 ? <p className="muted" data-testid="memory-empty">Nothing remembered.</p> : (
        <ul className="memory" data-testid="memory">
          {items.map((m) => (
            <li key={m.id}>
              <div><strong>{m.key}</strong> {m.sourceRunId ? <span className="chip label">from a run</span> : <span className="chip gap">your note</span>}<div className="muted">{m.value}</div></div>
              <button className="btn warn" onClick={() => onDelete(m.id)} aria-label={`Delete memory ${m.key}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Card({ children, title, id }: { children: ReactNode; title?: string; id?: string }) {
  return (<section className="card" id={id}>{title && <h2>{title}</h2>}{children}</section>);
}
