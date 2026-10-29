import { RunEvent, type PlanStep } from '@darby/contracts';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
import type { Config } from '../config';
import type { Repo } from '../db/repo';
import type { Llm } from '../llm/llm';
import type { LlmResult } from '../llm/types';
import type { Signer } from '../ledger/receipt';
import { TaintTracker, trustedRecipientsFrom } from '../policy/engine';
import type { Catalog } from '../sources';
import { sha256 } from '../util/canonical';
import type { BrowserHost } from './browser';

export class EventBus {
  private listeners = new Set<(e: RunEvent) => void>();
  subscribe(fn: (e: RunEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  publish(e: RunEvent): void {
    for (const l of this.listeners) {
      try { l(e); } catch { /* a broken subscriber must not break a run */ }
    }
  }
}

export interface Deps {
  cfg: Config;
  repo: Repo;
  llm: Llm;
  browser: BrowserHost;
  signer: Signer;
  catalog: Catalog;
  bus: EventBus;
}

export interface RunOptions {
  /** extra tools the executor should treat as an attack injected into the run (red-team): see redteam/ */
  redteam?: { simulateObeyingAgent?: boolean };
  repairOf?: string | null;
  /** set by RunManager.repair(): re-plan after a verified failure (max 2 per chain) */
  repair?: import('../planner/replanner').RepairContext;
  /** replace the planner (used by the compromised-planner red-team variant and by Playbook replay) */
  planOverride?: (goal: string) => Promise<import('@darby/contracts').Plan>;
  mode?: string;
}

export type Outcome = 'ok' | 'gap' | 'failed' | 'needs_you' | 'blocked' | 'cancelled';

export interface StepOutcome {
  step: PlanStep;
  outcome: Outcome;
  status: import('@darby/contracts').StepStatus;
  summary: string;
  gaps: string[];
}

/** Everything one run needs: event emission (-> DB, ledger, WebSocket), screenshots/evidence, pause/cancel gates, taint. */
export class RunContext {
  readonly outputs = new Map<string, any>();
  readonly taint = new TaintTracker();
  readonly labels = new Set<string>();
  readonly blocked: { stepId: string; ruleId: string; summary: string }[] = [];
  readonly llmResults: LlmResult[] = [];
  readonly gapSlugs: string[] = [];
  readonly shotsDir: string;
  private paused: Promise<void> | null = null;
  private resumeFn: (() => void) | null = null;
  private shotCount = 0;
  cancelled = false;
  actionsAfterCancel = 0;
  /** set when the user resumes after a takeover: the next page action re-reads page state first */
  rereadAfterResume = false;
  readonly approvalWaiters = new Map<string, (approved: boolean) => void>();

  constructor(readonly deps: Deps, readonly runId: string, readonly goal: string, readonly signal: AbortSignal, readonly opts: RunOptions = {}) {
    this.taint.exemptHosts(...deps.cfg.allowedOrigins.map((o) => new URL(o).hostname), deps.cfg.teamEmail.split('@')[1] ?? '');
    this.shotsDir = path.join(deps.cfg.runsDir, runId, 'shots');
    mkdirSync(this.shotsDir, { recursive: true });
  }

  /** The one place events leave the executor: validated against the contract, stored, ledgered, broadcast. */
  emit(ev: RunEvent): void {
    const valid = RunEvent.parse(ev); // boundary check; we store/publish `ev` itself so signed extras (receipt labels) are kept
    if (this.cancelled && valid.type === 'step.action') { this.actionsAfterCancel++; return; } // nothing happens after cancel
    const { repo } = this.deps;
    repo.addEvent(this.runId, valid.type, ev as unknown as Record<string, unknown>);
    if (valid.type !== 'receipt.sealed') repo.appendLedger(this.runId, 'stepId' in valid ? valid.stepId : null, valid.type, ev as unknown as Record<string, unknown>);
    this.deps.bus.publish(ev);
  }

  /** Ledger-only record (not shown as a UI event): llm calls, evidence files, reader rejections, decisions. */
  ledger(type: string, payload: Record<string, unknown>, stepId: string | null = null): void {
    this.deps.repo.appendLedger(this.runId, stepId, type, payload);
  }

  noteLlm(r: LlmResult, role: string): void {
    this.llmResults.push(r);
    this.ledger('llm.call', { role, source: r.source, provider: r.provider, model: r.model, requestKey: r.key });
  }

  /** Everything the policy engine needs, built from trusted data only (config, the user's goal) plus the taint set. */
  policyContext() {
    const cfg = this.deps.cfg;
    return { allowedOrigins: cfg.allowedOrigins, taint: this.taint, allowedPaths: [cfg.workspaceDir, cfg.darbyDir], trustedRecipients: trustedRecipientsFrom(this.goal, cfg.teamEmail) };
  }

  /** Called before every action: honours cancel and pause (takeover / approval wait). */
  async checkpoint(): Promise<void> {
    this.signal.throwIfAborted();
    while (this.paused) {
      await this.paused;
      this.signal.throwIfAborted();
    }
  }
  pause(): void {
    if (this.paused) return;
    this.paused = new Promise<void>((r) => { this.resumeFn = r; });
  }
  resume(): void {
    const r = this.resumeFn;
    this.paused = null;
    this.resumeFn = null;
    r?.();
  }
  get isPaused(): boolean { return this.paused !== null; }

  /** Take a screenshot, store it under .darby/runs/<id>/shots, register sha256 as evidence, return where the UI can load it. */
  async screenshot(page: Page, stepId: string, label: string): Promise<{ abs: string; rel: string; url: string }> {
    await this.checkpoint();
    const file = `${String(++this.shotCount).padStart(2, '0')}-${label.replace(/[^\w\-]/g, '_')}.png`;
    const abs = path.join(this.shotsDir, file);
    const buf = await page.screenshot({ path: abs, type: 'png' });
    this.registerFile(stepId, 'screenshot', abs, buf);
    return { abs, rel: this.relative(abs), url: `/api/runs/${this.runId}/shots/${file}` };
  }

  /** Path as shown in contracts/receipts: relative to the repo root when inside it. */
  relative(abs: string): string {
    const rel = path.relative(this.deps.cfg.root, abs);
    return rel.startsWith('..') ? abs : rel;
  }

  registerFile(stepId: string | null, kind: string, abs: string, buf?: Buffer): { sha256: string; bytes: number } {
    const data = buf ?? readFileSync(abs);
    const hash = sha256(data);
    const bytes = buf ? buf.length : statSync(abs).size;
    this.deps.repo.addEvidence({ runId: this.runId, stepId, kind, path: this.relative(abs), sha256: hash, bytes });
    this.ledger('evidence.file', { kind, path: this.relative(abs), sha256: hash, bytes }, stepId);
    return { sha256: hash, bytes };
  }

  /** Ask the user. Resolves when the companion sends approval.resolve (or rejects on cancel). */
  async requestApproval(step: PlanStep, summary: string, details: Record<string, unknown>): Promise<boolean> {
    const id = `appr_${randomUUID().slice(0, 8)}`;
    const contentHash = sha256(JSON.stringify(details));
    this.deps.repo.createApproval({ id, runId: this.runId, stepId: step.id, summary, details, contentHash });
    this.deps.repo.updateRun(this.runId, { status: 'awaiting_approval' });
    this.emit({ type: 'step.finished', runId: this.runId, stepId: step.id, status: 'awaiting_approval' });
    this.emit({ type: 'approval.requested', runId: this.runId, stepId: step.id, summary, details: { ...details, contentHash, approvalId: id } });
    const approved = await new Promise<boolean>((resolve, reject) => {
      this.approvalWaiters.set(step.id, resolve);
      this.signal.addEventListener('abort', () => reject(this.signal.reason ?? new Error('aborted')), { once: true });
    });
    this.approvalWaiters.delete(step.id);
    this.deps.repo.resolveApproval(id, approved ? 'approved' : 'denied');
    this.deps.repo.updateRun(this.runId, { status: 'running' });
    this.emit({ type: 'approval.resolved', runId: this.runId, stepId: step.id, approved });
    return approved;
  }
}
