import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EvidenceContract, PlanStep } from '@darby/contracts';
import { prettySlug, proofLine, VERDICT_TEXT, type RunView, type StepView, type TimelineItem } from './state';
import type { EvidenceRow, MemoryItem, PlaybookItem, RunDetail, RunSummary, VerifyResult } from './useDarby';
import { Icon } from './extras';

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
    .filter(([, k]) => d[k] !== undefined).map(([l, k]) => [l, k === 'document' ? String(d[k]).split(/[\\/]/).pop() ?? String(d[k]) : String(d[k])]);
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

/* ---------- review panel (GTM Studio): what Darby made, open it before you approve anything ---------- */
const launchFile = (runId: string, p: string): string | null => { const m = /[\\/]launch[\\/](.+)$/.exec(p); return m ? `/api/runs/${runId}/files/launch/${m[1]!.replace(/\\/g, '/')}` : null; };
export function ReviewPanel({ run, detail }: { run: RunView; detail: RunDetail | null }) {
  const ev = detail?.evidence ?? [];
  const find = (re: RegExp) => { const e = ev.find((x) => re.test(x.path)); return e ? launchFile(run.id, e.path) : null; };
  const hero = find(/hero\.png$/); const voice = find(/voiceover\.mp3$/); const teaser = find(/teaser\.mp4$/); const landing = find(/landing[\\/]index\.html$/);
  const copy = find(/copy\.json$/);
  const prStep = detail?.steps.find((s) => s.result && typeof s.result === 'object' && 'adapter' in s.result && 'number' in s.result);
  const pr = prStep?.result as { adapter: string; simulated?: boolean; number: number; url: string; repo: string; branch: string } | undefined;
  const labels = run.receipt?.labels ?? [];
  if (!hero && !voice && !teaser && !landing) return null;
  return (
    <section className="card review" data-testid="review" aria-label="Review what Darby made">
      <h2>Review — what Darby made <span className="muted small">(look before you approve)</span></h2>
      <div className="review-grid">
        {hero && (<figure><img src={hero} alt="Hero image" data-testid="review-hero" /><figcaption>Hero image <span className="chip label">{labels.some((l) => l.startsWith('GENERATED:')) ? 'AI-generated artwork' : 'generated placeholder'}</span></figcaption></figure>)}
        {teaser && (<figure><video src={teaser} poster={hero ?? undefined} controls preload="metadata" data-testid="review-video" /><figcaption>15-second teaser (hero + captions + voiceover)</figcaption></figure>)}
        {voice && (<figure><audio src={voice} controls preload="metadata" data-testid="review-audio" /><figcaption>Voiceover {labels.filter((l) => /^(VOICE:|PLACEHOLDER:voiceover)/.test(l)).map((l) => (<span key={l} className="chip label">{l}</span>))}</figcaption></figure>)}
        {landing && (<figure className="wide"><iframe src={landing} title="Landing page preview" sandbox="allow-scripts" data-testid="review-page" /><figcaption>Landing page (runs in a sandbox) · <a href={landing} target="_blank" rel="noreferrer">open</a>{copy && <> · <a href={copy} target="_blank" rel="noreferrer">copy.json</a></>}</figcaption></figure>)}
      </div>
      {pr && (
        <p className="pr-line" data-testid="review-pr">
          {pr.simulated ? <span className="chip label">SIMULATED</span> : <span className="chip chain-ok">REAL</span>} Pull request #{pr.number} on <strong>{pr.simulated ? 'the local test repo' : pr.repo}</strong> (branch {pr.branch}){!pr.simulated && <> · <a href={pr.url} target="_blank" rel="noreferrer">open on GitHub</a></>}
        </p>
      )}
    </section>
  );
}

/* ---------- receipt ---------- */
export function Receipt({ run, verify, tamper, onTamper, onRemember, remembered, onRepair, onSavePlaybook, onOpenHub }: {
  run: RunView; verify: VerifyResult | null; tamper: { original: VerifyResult; tampered: VerifyResult; edit: { index: number; type: string } } | null;
  onTamper: () => void; onRemember: () => void; remembered: boolean; onRepair?: () => void;
  onSavePlaybook?: (name: string) => Promise<PlaybookItem | null>; onOpenHub?: () => void;
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
      {r.recovery && (
        <div className="recovery" data-testid="recovery"><strong>Safe recovery.</strong> {r.recovery}
          {onRepair && <div className="row"><button className="btn primary" onClick={onRepair} data-testid="repair-btn">Try a safer way (re-plan)</button></div>}
        </div>
      )}
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
      {onSavePlaybook && (r.verdict === 'VERIFIED' || r.verdict === 'VERIFIED_WITH_GAPS') && <SavePlaybook goal={run.goal} onSave={onSavePlaybook} onOpenHub={onOpenHub} />}
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

/* ---------- Playbooks (M7) ---------- */
function SavePlaybook({ goal, onSave, onOpenHub }: { goal: string; onSave: (name: string) => Promise<PlaybookItem | null>; onOpenHub?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<PlaybookItem | null>(null);
  if (saved) return (<p className="pb-saved" data-testid="pb-saved">Saved as <code>playbooks/{saved.slug}/</code> — a re-runnable skill with its own permission manifest. {onOpenHub && <button className="linkbtn" onClick={onOpenHub}>Open the Hub</button>}</p>);
  if (!open) return (<div className="row"><button className="btn primary" onClick={() => { setOpen(true); setName(goal.replace(/[^\w ]+/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ')); }} data-testid="save-playbook-btn">Save as Playbook</button><span className="muted small">Reuse this proven recipe with new inputs; it is verified again every time.</span></div>);
  return (
    <form className="row pb-form" onSubmit={(e) => { e.preventDefault(); void onSave(name.trim()).then((pb) => pb && setSaved(pb)); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playbook name" aria-label="Playbook name" maxLength={80} data-testid="pb-name" autoFocus />
      <button className="btn primary" type="submit" disabled={name.trim().length < 2} data-testid="save-playbook-go">Save</button>
      <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

const BADGE: Record<PlaybookItem['badge'], { cls: string; text: string; tip: string }> = {
  passed: { cls: 'chain-ok', text: 'CI passed ✓', tip: 'npm run playbook:check passed for exactly this version of the Playbook' },
  stale: { cls: 'gap', text: 'CI stale', tip: 'playbook.json changed after the last check: run npm run playbook:check' },
  failed: { cls: 'chain-bad', text: 'CI failed ✗', tip: 'the last npm run playbook:check failed: see the check results' },
  none: { cls: 'label', text: 'not checked yet', tip: 'no badge until npm run playbook:check passes' },
};
const pageName = (u: string) => prettySlug(u.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() ?? u);

function PlaybookCard({ pb, busy, onRun }: { pb: PlaybookItem; busy: boolean; onRun: (slug: string, params: Record<string, unknown>) => void }) {
  const init = useMemo(() => Object.fromEntries(pb.params.map((p) => [p.key, p.default])) as Record<string, string | string[]>, [pb]);
  const [vals, setVals] = useState<Record<string, string | string[]>>(init);
  const [showCheck, setShowCheck] = useState(false);
  const b = BADGE[pb.badge];
  const m = pb.manifest;
  const urlsOk = pb.params.every((p) => p.type !== 'urls' || (vals[p.key] as string[]).length > 0);
  return (
    <li className="pbcard" data-testid={`playbook-${pb.slug}`} data-reveal>
      <div className="pb-head">
        <div><h3 className="pb-title">{pb.name}</h3><div className="muted">{pb.description}</div></div>
        <span className={`chip ${b.cls}`} title={b.tip} data-testid="pb-badge" data-badge={pb.badge}>{b.text}</span>
      </div>
      <div className="chips pb-perms" aria-label="Permission manifest">
        {m.reads.map((x) => (<span key={x} className="chip perm-read" title="pages this Playbook may read">reads · {x}</span>))}
        {m.writes.map((x) => (<span key={x} className="chip perm-write">writes · {x}</span>))}
        {m.externalEffects.map((x) => (<span key={x.tool} className="chip perm-ext" title="always waits for your approval">external · {x.what}</span>))}
        {m.externalEffects.length === 0 && <span className="chip chain-ok">no external effects</span>}
        {m.needsApproval && <span className="chip label">asks you before it acts</span>}
      </div>
      <details className="pb-steps"><summary>{pb.steps.length} steps · saved from run {pb.createdFrom.runId.slice(4, 19)} ({pb.createdFrom.verdict.replace(/_/g, ' ').toLowerCase()})</summary>
        <ol>{pb.steps.map((s) => (<li key={s.id}><code>{s.tool}</code> — {s.title}{s.proof ? <span className="muted"> · proof: {s.proof}</span> : null}</li>))}</ol>
      </details>
      <form className="pb-params" onSubmit={(e) => { e.preventDefault(); onRun(pb.slug, vals); }}>
        {pb.params.map((p) => p.type === 'urls' ? (
          <fieldset key={p.key} className="pb-field"><legend>{p.label} <span className="muted small">({(vals[p.key] as string[]).length} selected)</span></legend>
            <div className="pb-checks">{(p.choices ?? (p.default as string[])).map((c) => {
              const on = (vals[p.key] as string[]).includes(c);
              return (<label key={c} className={`pb-check ${on ? 'on' : ''}`}><input type="checkbox" checked={on} onChange={() => setVals((v) => ({ ...v, [p.key]: on ? (v[p.key] as string[]).filter((x) => x !== c) : [...(v[p.key] as string[]), c] }))} />{pageName(c)}</label>);
            })}</div>
          </fieldset>
        ) : (
          <label key={p.key} className="pb-field">{p.label}<input value={vals[p.key] as string} onChange={(e) => setVals((v) => ({ ...v, [p.key]: e.target.value }))} maxLength={40} data-testid={`pb-param-${p.key}`} /></label>
        ))}
        <div className="row">
          <button className="btn primary" type="submit" disabled={busy || !urlsOk} data-testid={`run-playbook-${pb.slug}`}>Run this Playbook</button>
          <button className="btn ghost" type="button" onClick={() => setVals(init)}>Reset inputs</button>
          {pb.check && <button className="btn ghost" type="button" onClick={() => setShowCheck((x) => !x)}>{showCheck ? 'Hide' : 'Show'} check results</button>}
          {pb.badge !== 'passed' && <span className="muted small">Run <code>npm run playbook:check</code> to earn the badge.</span>}
        </div>
      </form>
      {showCheck && pb.check && (
        <ul className="pb-check-list" data-testid="pb-check-list">{pb.check.checks.map((c, i) => (<li key={i}><span className={`chip ${c.ok ? 'chain-ok' : 'chain-bad'}`}>{c.ok ? 'pass' : 'FAIL'}</span> <strong>{c.name}</strong><div className="muted small">{c.detail}</div></li>))}
          <li className="muted small">checked {new Date(pb.check.at).toLocaleString()} · {pb.check.llm}</li></ul>
      )}
    </li>
  );
}

export function Hub({ items, busy, onRun }: { items: PlaybookItem[]; busy: boolean; onRun: (slug: string, params: Record<string, unknown>) => void }) {
  return (
    <section className="card" aria-labelledby="hub-h">
      <h2 id="hub-h">Hub — Playbooks you can re-run</h2>
      <p className="muted">A Playbook is a verified run saved as a recipe. Each replay is planned by code from the saved steps, goes through the same policy and approvals, and ends in its own signed receipt. The CI badge appears only after <code>npm run playbook:check</code> passes for this exact version.</p>
      {items.length === 0 ? <div className="empty" data-testid="hub-empty"><EmptyArt kind="recipes" /><b>No Playbooks yet</b>Finish a run, then press “Save as Playbook” on its receipt. It becomes a re-runnable skill here.</div> : (
        <ul className="playbooks" data-testid="hub">{items.map((pb) => (<PlaybookCard key={pb.slug + pb.sha256} pb={pb} busy={busy} onRun={onRun} />))}</ul>
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
    case 'media_probe': return [['kind', 'media_probe'], ['file', c.path], ['length', `${c.minSeconds}–${c.maxSeconds} s (${c.media})`]];
    case 'tests_pass': return [['kind', 'tests_pass'], ['project', c.dir], ['at least', `${c.minTests} tests`]];
    case 'pr_exists': return [['kind', 'pr_exists'], ['repo', c.repo], ['pull request', c.number ? `#${c.number} “${c.title}”` : c.title], ['branch', c.branch]];
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
    <>
    <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" data-testid="drawer-backdrop" />
    <aside className="drawer" data-testid="evidence-drawer" role="dialog" aria-modal="false" aria-label={`Evidence for ${step.title}`} ref={ref as never}>
      <div className="drawer-head">
        <div>
          <div className="eyebrow">Evidence · step {step.id}</div>
          <h2>{step.title}</h2>
        </div>
        <button className="btn ghost drawer-close" onClick={onClose} aria-label="Close evidence panel" data-testid="drawer-close">✕ Close</button>
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
    </>
  );
}

/* ---------- history ---------- */
/** "12 min ago", "3 h ago", or the date: easier to read than a timestamp. The full time stays in the tooltip. */
export function relTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
const dayLabel = (iso: string): string => {
  const d = new Date(iso); const t = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, t)) return 'Today';
  const y = new Date(t); y.setDate(t.getDate() - 1);
  return same(d, y) ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
};
const HIST_ICON: Record<string, ReactNode> = { VERIFIED: Icon.check, VERIFIED_WITH_GAPS: Icon.check, FAILED: Icon.x, NEEDS_YOU: Icon.clock };
const EmptyArt = ({ kind }: { kind: 'runs' | 'notes' | 'recipes' }) => (
  <svg className="empty-art" viewBox="0 0 120 90" width="132" height="99" fill="none" aria-hidden="true">
    <ellipse cx="60" cy="80" rx="38" ry="6" fill="rgba(15,122,92,.10)" />
    <rect x="22" y="14" width="76" height="58" rx="12" fill="#fff" stroke="#cfe6dc" strokeWidth="2" />
    {kind === 'runs' && <><path d="M36 34h30M36 46h48M36 58h38" stroke="#bcd9cc" strokeWidth="4" strokeLinecap="round" /><circle cx="88" cy="34" r="9" fill="#e5f5ed" stroke="#0f7a5c" strokeWidth="2" /><path d="M84 34l3 3 5-6" stroke="#0f7a5c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></>}
    {kind === 'notes' && <><rect x="34" y="26" width="52" height="14" rx="5" fill="#fff6d6" stroke="#ecd98a" strokeWidth="1.5" /><rect x="34" y="46" width="36" height="14" rx="5" fill="#e8f1ff" stroke="#bcd0f2" strokeWidth="1.5" /><path d="M94 22l4 4-14 14-5 1 1-5z" fill="#0f7a5c" /></>}
    {kind === 'recipes' && <><path d="M36 30h48M36 42h34" stroke="#bcd9cc" strokeWidth="4" strokeLinecap="round" /><path d="M42 58l6-8 6 5 8-10 8 6" stroke="#0f7a5c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></>}
  </svg>
);

export function History({ items, onOpen }: { items: RunSummary[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const shown = items.filter((h) => !q || h.goal.toLowerCase().includes(q.toLowerCase()) || (h.verdict ?? '').toLowerCase().includes(q.toLowerCase()));
  let lastDay = '';
  return (
    <section className="card" aria-labelledby="hist-h">
      <div className="card-head"><h2 id="hist-h">Recent runs</h2><input className="search" placeholder="Filter by goal or verdict" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter history" /></div>
      {shown.length === 0 ? <div className="empty"><EmptyArt kind="runs" /><b>{q ? 'No matching runs' : 'No runs yet'}</b>{q ? 'Try a different word.' : 'Pick an example above or describe a goal. Finished runs and their receipts appear here.'}</div> : (
        <ul className="history" data-testid="history">
          {shown.map((h) => {
            const day = dayLabel(h.createdAt);
            const head = day !== lastDay ? (lastDay = day, <li className="hist-day" key={`d-${h.id}`} aria-hidden="true">{day}</li>) : null;
            return (
              <Fragment key={h.id}>
                {head}
                <li className={`hist v-${h.verdict ?? 'none'}`} onClick={() => onOpen(h.id)} data-reveal>
                  <span className="hist-ico" aria-hidden="true">{h.verdict ? HIST_ICON[h.verdict] : Icon.run}</span>
                  <div className="hist-main">
                    <button className="linkbtn" onClick={(e) => { e.stopPropagation(); onOpen(h.id); }}>{h.goal.slice(0, 110)}{h.goal.length > 110 ? '…' : ''}</button>
                    <div className="chips">
                      <span className={`chip v-${h.verdict ?? 'none'}`}>{h.verdict ? VERDICT_TEXT[h.verdict] : h.status}</span>
                      {h.labels.map((l) => (<span key={l} className="chip label">{l}</span>))}
                      {h.blocked > 0 && <span className="chip contained">CONTAINED · {h.blocked}</span>}
                      {h.repairOf && <span className="chip label">repair</span>}
                      <span className="muted small" title={new Date(h.createdAt).toLocaleString()}>{relTime(h.createdAt)}</span>
                    </div>
                  </div>
                  <span className="hist-go" aria-hidden="true">{Icon.arrow}</span>
                </li>
              </Fragment>
            );
          })}
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
      {items.length === 0 ? <div className="empty" data-testid="memory-empty"><EmptyArt kind="notes" /><b>Nothing remembered yet</b>Add a preference above, or press “Remember this run” on a receipt.</div> : (
        <ul className="memory" data-testid="memory">
          {items.map((m) => (
            <li key={m.id} className={m.sourceRunId ? 'note from-run' : 'note mine'} data-reveal>
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
