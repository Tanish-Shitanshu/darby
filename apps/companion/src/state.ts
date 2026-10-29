import type { EvidenceContract, Plan, PolicyDecision, Receipt, RunEvent, StepStatus } from '@darby/contracts';

export type SignedReceipt = Receipt & { labels?: string[]; cause?: string; recovery?: string; llm?: { provider: string; model: string; liveCalls: number; replayedCalls: number } };

export interface TimelineItem {
  id: number;
  kind: 'system' | 'action' | 'policy' | 'evidence' | 'approval' | 'status';
  stepId?: string;
  text: string;
  shot?: string;
  ok?: boolean;
  chip?: string;
}
export interface StepView {
  id: string;
  status: StepStatus;
  decision?: PolicyDecision;
  evidence: { contract: EvidenceContract | null; passed: boolean; detail: string }[];
}
export type RunPhase = 'planning' | 'running' | 'paused' | 'awaiting_approval' | 'finished' | 'cancelled';
export interface RunView {
  id: string;
  goal: string;
  phase: RunPhase;
  plan: Plan | null;
  steps: Record<string, StepView>;
  timeline: TimelineItem[];
  receipt: SignedReceipt | null;
  approval: { stepId: string; summary: string; details: Record<string, unknown> } | null;
}

let seq = 0;
/** Screenshots must be same-origin paths served by our own API; anything else in an event is dropped, never rendered. */
const SAFE_SHOT = /^\/api\/runs\/run_[\w-]+\/shots\/[\w.-]+\.(?:png|jpe?g)$/i;
export const safeShot = (p: string | undefined): string | undefined => (p && SAFE_SHOT.test(p) ? p : undefined);
const empty = (id: string, goal = ''): RunView => ({ id, goal, phase: 'planning', plan: null, steps: {}, timeline: [], receipt: null, approval: null });

/** Folds one RunEvent into the view of its run. The same function replays stored events when you open an old run. */
export function applyEvent(prev: RunView | undefined, ev: RunEvent): RunView {
  const v: RunView = prev ? { ...prev, steps: { ...prev.steps }, timeline: [...prev.timeline] } : empty(ev.runId);
  const add = (t: Omit<TimelineItem, 'id'>) => v.timeline.push({ id: ++seq, ...t });
  const step = (id: string): StepView => (v.steps[id] = { ...(v.steps[id] ?? { id, status: 'pending', evidence: [] }) });

  switch (ev.type) {
    case 'run.started':
      v.goal = ev.goal;
      v.phase = 'planning';
      add({ kind: 'system', text: 'Run started — planning' });
      break;
    case 'plan.created':
      v.plan = ev.plan;
      v.phase = 'running';
      for (const s of ev.plan.steps) step(s.id);
      add({ kind: 'system', text: `Plan ready: ${ev.plan.steps.length} steps, each with a proof` });
      break;
    case 'step.started':
      step(ev.stepId).status = 'running';
      add({ kind: 'status', stepId: ev.stepId, text: 'Started' });
      break;
    case 'step.action':
      add({ kind: 'action', stepId: ev.stepId, text: ev.description, shot: safeShot(ev.screenshotPath) });
      break;
    case 'policy.decision': {
      step(ev.stepId).decision = ev.decision;
      const d = ev.decision;
      add({ kind: 'policy', stepId: ev.stepId, text: `${d.action === 'allow' ? 'Allowed' : d.action === 'block' ? 'BLOCKED' : 'Needs your approval'} — ${d.reason}`, chip: d.ruleId.split('-').slice(0, 2).join('-'), ok: d.action !== 'block' });
      break;
    }
    case 'approval.requested':
      v.phase = 'awaiting_approval';
      v.approval = { stepId: ev.stepId, summary: ev.summary, details: ev.details };
      add({ kind: 'approval', stepId: ev.stepId, text: `Waiting for you: ${ev.summary}` });
      break;
    case 'approval.resolved':
      v.phase = 'running';
      v.approval = null;
      add({ kind: 'approval', stepId: ev.stepId, ok: ev.approved, text: ev.approved ? 'You approved' : 'You denied' });
      break;
    case 'step.evidence':
    { const sv = step(ev.stepId); sv.evidence = [...sv.evidence, { contract: ev.contract, passed: ev.passed, detail: ev.detail }]; }
      add({ kind: 'evidence', stepId: ev.stepId, ok: ev.passed, text: ev.detail });
      break;
    case 'step.finished':
      step(ev.stepId).status = ev.status;
      if (ev.status !== 'verifying' && ev.status !== 'awaiting_approval') add({ kind: 'status', stepId: ev.stepId, text: ev.status.replace(/_/g, ' '), ok: ev.status === 'passed' || ev.status === 'passed_with_gaps' });
      break;
    case 'run.paused':
      v.phase = 'paused';
      add({ kind: 'system', text: ev.reason === 'takeover' ? 'Paused — you have control of the browser' : 'Paused' });
      break;
    case 'run.resumed':
      v.phase = 'running';
      add({ kind: 'system', text: 'Resumed — page state is re-read before continuing' });
      break;
    case 'run.cancelled':
      v.phase = 'cancelled';
      v.approval = null;
      add({ kind: 'system', text: 'Cancelled — nothing runs after this point' });
      break;
    case 'receipt.sealed':
      v.receipt = ev.receipt as SignedReceipt;
      v.approval = null;
      for (const s of ev.receipt.steps) step(s.stepId).status = s.status; // the signed receipt is the final word on every step
      if (v.phase !== 'cancelled') v.phase = 'finished';
      add({ kind: 'system', text: `Receipt sealed: ${ev.receipt.verdict.replace(/_/g, ' ')}` });
      break;
  }
  return v;
}

export function foldEvents(id: string, events: RunEvent[]): RunView {
  return events.reduce<RunView | undefined>((acc, e) => applyEvent(acc, e), undefined) ?? empty(id);
}

/** One plain-language proof line per evidence contract kind (what counts as proof for the step). */
export function proofLine(c: EvidenceContract | null): string {
  if (!c) return 'No proof needed — pure reasoning step';
  switch (c.kind) {
    case 'file_exists': return 'Proof: a screenshot of every page exists on disk, hashed (sha256)';
    case 'quote_in_page': return 'Proof: each price is an exact quote, re-fetched from the page by an independent verifier. No price shown = flagged gap, never guessed';
    case 'sheet_readback': return 'Proof: the saved document is re-opened from disk and every cell must equal what was written';
    case 'permission_present': return `Proof: the permission list must show ${c.email} as ${c.role}`;
    case 'http_json_contains': return 'Proof: a fresh API read-back must contain the expected record';
    case 'page_assertions': return 'Proof: the generated page loads and shows what the brief promised (browser test)';
    case 'vision_check': return 'Proof: an independent vision model answers a yes/no question about a screenshot; it never sees the agent’s claim';
  }
}

export const VERDICT_TEXT: Record<string, string> = { VERIFIED: 'Verified', VERIFIED_WITH_GAPS: 'Verified with gaps', FAILED: 'Failed', NEEDS_YOU: 'Needs you' };
export const prettySlug = (s: string) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
