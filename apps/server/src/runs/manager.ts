import { RunEvent } from '@darby/contracts';
import { RunContext, type Deps, type RunOptions } from '../executor/context';
import { runEngine } from '../executor/engine';
import type { RunRow } from '../db/repo';

interface Active {
  ctx: RunContext;
  controller: AbortController;
  done: Promise<void>;
}

export const newRunId = (): string => {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `run_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}_${Math.random().toString(36).slice(2, 6)}`;
};

/** Owns the lifecycle of runs: start, cancel, takeover/resume, approvals. */
export class RunManager {
  private active = new Map<string, Active>();
  constructor(readonly deps: Deps) {}

  async start(goal: string, opts: RunOptions = {}): Promise<string> {
    const id = newRunId();
    this.deps.repo.createRun({ id, goal, mode: opts.mode ?? 'fixture', repairOf: opts.repairOf ?? null });
    const controller = new AbortController();
    const ctx = new RunContext(this.deps, id, goal, controller.signal, opts);
    const done = runEngine(ctx)
      .catch((e) => console.error(`[run ${id}] engine crashed:`, (e as Error).message))
      .finally(() => this.active.delete(id));
    this.active.set(id, { ctx, controller, done });
    return id;
  }

  /** Resolves with the final run row once the run (and its receipt) is complete. */
  async wait(id: string): Promise<RunRow> {
    await this.active.get(id)?.done;
    const run = this.deps.repo.getRun(id);
    if (!run) throw new Error(`unknown run ${id}`);
    return run;
  }

  isActive(id: string): boolean { return this.active.has(id); }
  context(id: string): RunContext | undefined { return this.active.get(id)?.ctx; }

  cancel(id: string): boolean {
    const a = this.active.get(id);
    if (!a) return false;
    a.ctx.cancelled = true;
    a.controller.abort(new DOMException('Run cancelled by the user', 'AbortError'));
    return true;
  }

  resolveApproval(runId: string, stepId: string, approved: boolean): boolean {
    const w = this.active.get(runId)?.ctx.approvalWaiters.get(stepId);
    if (!w) return false;
    w(approved);
    return true;
  }

  /** Pause the executor, bring the browser to the front so the user can act. */
  async takeover(id: string): Promise<boolean> {
    const a = this.active.get(id);
    if (!a || a.ctx.isPaused) return false;
    a.ctx.pause();
    this.deps.repo.updateRun(id, { status: 'paused' });
    a.ctx.emit(RunEvent.parse({ type: 'run.paused', runId: id, reason: 'takeover' }));
    a.ctx.ledger('takeover', { note: 'executor paused; the user has control of the browser' });
    try {
      const pages = (await this.deps.browser.context()).pages();
      await pages[pages.length - 1]?.bringToFront();
    } catch { /* browser may not be open yet */ }
    return true;
  }

  /** Resume after takeover. The executor re-reads page state before continuing (see tools: re-read marker). */
  resume(id: string): boolean {
    const a = this.active.get(id);
    if (!a || !a.ctx.isPaused) return false;
    a.ctx.rereadAfterResume = true;
    this.deps.repo.updateRun(id, { status: 'running' });
    a.ctx.ledger('resume', { note: 'user handed control back; page state will be re-read before the next action' });
    a.ctx.resume();
    a.ctx.emit({ type: 'run.resumed', runId: id });
    return true;
  }

  async shutdown(): Promise<void> {
    for (const a of this.active.values()) a.controller.abort(new DOMException('shutdown', 'AbortError'));
    await Promise.allSettled([...this.active.values()].map((a) => a.done));
    await this.deps.browser.close();
  }
}
