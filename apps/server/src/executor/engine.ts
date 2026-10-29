import type { EvidenceContract, Plan, PlanStep, StepStatus, StepSummary, Verdict } from '@darby/contracts';
import { sealReceipt, type SignedReceipt } from '../ledger/receipt';
import { makePlan, PlanningError } from '../planner/planner';
import { evaluatePolicy } from '../policy/engine';
import { verifyContract, type CheckResult } from '../verifier/verifier';
import { RunContext, type Outcome, type StepOutcome } from './context';
import { describeApproval } from './approval';
import { runTool, ToolError } from './tools';
import { simulateObeyingAgent } from './redteam';

const isAbort = (e: unknown) => (e as Error)?.name === 'AbortError' || (e as any)?.code === 20;

/** Run verdict from step outcomes. Pure, unit-tested. A verified failure beats everything; anything unfinished or unverifiable is NEEDS_YOU, never VERIFIED. */
export function computeVerdict(outcomes: Pick<StepOutcome, 'outcome'>[], cancelled = false): Verdict {
  if (cancelled) return 'NEEDS_YOU';
  if (!outcomes.length) return 'FAILED';
  if (outcomes.some((o) => o.outcome === 'failed')) return 'FAILED';
  if (outcomes.some((o) => o.outcome === 'needs_you' || o.outcome === 'blocked' || o.outcome === 'cancelled')) return 'NEEDS_YOU';
  if (outcomes.some((o) => o.outcome === 'gap')) return 'VERIFIED_WITH_GAPS';
  return 'VERIFIED';
}

/** Fold the per-contract check results of one step into one outcome. */
export function foldChecks(results: CheckResult[]): { outcome: Outcome; status: StepStatus } {
  if (results.some((r) => r.error)) return { outcome: 'needs_you', status: 'failed' };
  if (results.some((r) => !r.passed)) return { outcome: 'failed', status: 'failed' };
  if (results.some((r) => r.gap)) return { outcome: 'gap', status: 'passed_with_gaps' };
  return { outcome: 'ok', status: 'passed' };
}

function summarizeChecks(contracts: EvidenceContract[], results: CheckResult[]): string {
  const kind = contracts[0]?.kind;
  const n = results.length;
  const ok = results.filter((r) => r.passed).length;
  const bad = results.filter((r) => !r.passed);
  if (bad.length) return bad.slice(0, 3).map((r) => r.detail).join(' | ');
  const gaps = [...new Set(results.flatMap((r) => r.gaps))];
  switch (kind) {
    case 'file_exists': return `${ok}/${n} screenshots exist on disk (sha256 recorded)`;
    case 'quote_in_page': {
      const proven = results.filter((r) => r.passed && !r.gap).length;
      return gaps.length
        ? `${proven} prices proven by exact quotes re-fetched independently; ${gaps.length} gaps (${gaps.join(', ')}): no paid price on the page, flagged as NOT FOUND, never guessed`
        : `${proven}/${n} prices proven by exact quotes re-fetched independently`;
    }
    case 'sheet_readback': return results.map((r) => r.detail).join(' | ');
    default: return results.map((r) => r.detail).join(' | ');
  }
}

export async function runEngine(ctx: RunContext): Promise<void> {
  const { deps, runId, goal } = ctx;
  const { repo, cfg, llm } = deps;
  const llmStart = { ...llm.stats };
  const outcomes: StepOutcome[] = [];
  let plan: Plan | null = null;
  let cause = '';
  let cancelled = false;

  try {
    ctx.emit({ type: 'run.started', runId, goal });
    ctx.ledger('run.config', { mode: ctx.opts.mode ?? 'fixture', llmProvider: llm.providerName, llmModel: llm.model, repairOf: ctx.opts.repairOf ?? null, headless: cfg.headless });
    repo.updateRun(runId, { status: 'planning' });

    try {
      if (ctx.opts.planOverride) {
        plan = await ctx.opts.planOverride(goal);
      } else {
        const pr = await makePlan(goal, { cfg, catalog: deps.catalog, llm, memory: repo.listMemory().filter((m) => m.sourceRunId === null) }, ctx.signal);
        pr.llm.forEach((r) => ctx.noteLlm(r, 'planner'));
        plan = pr.plan;
      }
    } catch (e) {
      if (ctx.signal.aborted || isAbort(e)) throw e;
      cause = e instanceof PlanningError ? `${e.message} ${e.problems.slice(0, 2).join('; ')}` : `Planning failed: ${(e as Error).message.slice(0, 200)}`;
      throw new Error(cause);
    }

    ctx.emit({ type: 'plan.created', runId, plan });
    repo.updateRun(runId, { plan, status: 'running' });
    plan.steps.forEach((s, i) => repo.upsertStep({ runId, stepId: s.id, position: i, title: s.title, tool: s.tool, status: 'pending', args: s.args, contract: s.contract }));

    for (const step of plan.steps) {
      await ctx.checkpoint();
      outcomes.push(await runStep(ctx, step, outcomes));
    }
    if (ctx.opts.redteam?.simulateObeyingAgent) await simulateObeyingAgent(ctx);
  } catch (e) {
    if (ctx.signal.aborted || isAbort(e)) {
      cancelled = true;
      ctx.cancelled = true;
      if (plan) {
        for (const s of plan.steps) {
          if (!outcomes.some((o) => o.step.id === s.id)) outcomes.push({ step: s, outcome: 'cancelled', status: 'cancelled', summary: 'cancelled before it ran', gaps: [] });
        }
        // tell the UI (and the ledger) about every step that was cut off, and close any approval card that was waiting
        repo.listApprovals(runId).filter((a) => a.status === 'pending').forEach((a) => repo.resolveApproval(a.id, 'cancelled'));
        for (const r of repo.listSteps(runId).filter((x) => ['running', 'pending', 'awaiting_approval', 'verifying'].includes(x.status))) {
          repo.updateStep(runId, r.stepId, { status: 'cancelled', finished: true });
          ctx.emit({ type: 'step.finished', runId, stepId: r.stepId, status: 'cancelled' });
        }
      }
      ctx.emit({ type: 'run.cancelled', runId });
      cause = 'You cancelled the run. Nothing after the cancel point was executed.';
    } else {
      if (!cause) cause = `Darby hit an unexpected error: ${(e as Error).message.slice(0, 200)}`;
      ctx.ledger('error', { message: cause });
      // steps that never ran are not "passed": they make the run NEEDS_YOU
      for (const s of plan?.steps ?? []) {
        if (!outcomes.some((o) => o.step.id === s.id)) outcomes.push({ step: s, outcome: 'needs_you', status: 'failed', summary: 'did not run because of an earlier error', gaps: [] });
      }
    }
  }

  await finalize(ctx, plan, outcomes, cancelled, cause, llmStart);
}

async function runStep(ctx: RunContext, step: PlanStep, done: StepOutcome[]): Promise<StepOutcome> {
  const { deps, runId } = ctx;
  const { repo, cfg } = deps;
  const out = (outcome: Outcome, status: StepStatus, summary: string, gaps: string[] = []): StepOutcome => ({ step, outcome, status, summary, gaps });

  // a step whose input did not complete is skipped, not guessed
  const broken = step.dependsOn.map((id) => done.find((o) => o.step.id === id)).find((o) => o && o.outcome !== 'ok' && o.outcome !== 'gap');
  if (broken) {
    const summary = `skipped: it needs step ${broken.step.id}, which did not complete (${broken.outcome})`;
    repo.updateStep(runId, step.id, { status: 'cancelled', finished: true });
    ctx.emit({ type: 'step.started', runId, stepId: step.id });
    ctx.emit({ type: 'step.action', runId, stepId: step.id, description: summary });
    ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'cancelled' });
    return out('cancelled', 'cancelled', summary);
  }

  repo.updateStep(runId, step.id, { status: 'running', started: true });
  ctx.emit({ type: 'step.started', runId, stepId: step.id });

  // policy: plain code decides, every decision is evented + ledgered
  const decision = evaluatePolicy({ step, ...ctx.policyContext() });
  ctx.emit({ type: 'policy.decision', runId, stepId: step.id, decision });

  if (decision.action === 'block') {
    ctx.blocked.push({ stepId: step.id, ruleId: decision.ruleId, summary: `${step.tool}: ${decision.reason}` });
    repo.updateStep(runId, step.id, { status: 'blocked', finished: true });
    ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'blocked' });
    return out('blocked', 'blocked', `blocked by ${decision.ruleId}: ${decision.reason}`);
  }
  if (decision.action === 'require_approval') {
    const desc = describeApproval(ctx, step);
    const approved = await ctx.requestApproval(step, desc.summary, desc.details);
    if (!approved) {
      repo.updateStep(runId, step.id, { status: 'blocked', finished: true });
      ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'blocked' });
      return out('blocked', 'blocked', 'you denied this step; nothing was done');
    }
    repo.updateStep(runId, step.id, { status: 'running' });
  }

  // execute
  let tool;
  try {
    tool = await runTool(ctx, step);
  } catch (e) {
    if (ctx.signal.aborted || isAbort(e)) throw e;
    const te = e instanceof ToolError ? e : new ToolError(`${step.tool} failed: ${(e as Error).message.slice(0, 200)}`, 'needs_you');
    ctx.emit({ type: 'step.action', runId, stepId: step.id, description: `Error: ${te.message}` });
    ctx.emit({ type: 'step.evidence', runId, stepId: step.id, contract: step.contract, passed: false, detail: te.message });
    repo.updateStep(runId, step.id, { status: 'failed', finished: true, result: { error: te.message } });
    ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'failed' });
    return out(te.kind === 'failed' ? 'failed' : 'needs_you', 'failed', te.message);
  }

  // verify: independent of everything above (own fetch, own file open)
  repo.updateStep(runId, step.id, { status: 'verifying' });
  ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'verifying' });
  if (!tool.contracts.length) {
    if (step.contract) {
      ctx.emit({ type: 'step.evidence', runId, stepId: step.id, contract: step.contract, passed: false, detail: 'the step produced nothing the contract could check' });
      repo.updateStep(runId, step.id, { status: 'failed', finished: true, result: tool.result });
      ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'failed' });
      return out('needs_you', 'failed', 'the step produced nothing the contract could check');
    }
    repo.updateStep(runId, step.id, { status: 'passed', finished: true, result: tool.result });
    ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: 'passed' });
    return out('ok', 'passed', tool.summary);
  }

  await ctx.checkpoint();
  const vctx = { root: cfg.root, workspaceDir: cfg.workspaceDir };
  const results: CheckResult[] = [];
  for (const c of tool.contracts) {
    const r = await verifyContract(c, vctx);
    results.push(r);
    ctx.emit({ type: 'step.evidence', runId, stepId: step.id, contract: c, passed: r.passed, detail: `${r.error ? 'COULD NOT VERIFY — ' : r.gap ? 'GAP — ' : ''}${r.detail}` });
  }
  const gaps = [...new Set(results.flatMap((r) => r.gaps))];
  gaps.forEach((g) => { if (!ctx.gapSlugs.includes(g)) ctx.gapSlugs.push(g); });
  const folded = foldChecks(results);
  const summary = summarizeChecks(tool.contracts, results);
  repo.updateStep(runId, step.id, { status: folded.status, finished: true, result: { ...tool.result, verification: summary } });
  ctx.emit({ type: 'step.finished', runId, stepId: step.id, status: folded.status });
  return out(folded.outcome, folded.status, summary, gaps);
}

async function finalize(ctx: RunContext, plan: Plan | null, outcomes: StepOutcome[], cancelled: boolean, cause: string, llmStart: { live: number; replay: number }): Promise<void> {
  const { deps, runId, goal } = ctx;
  const { repo, llm, signer } = deps;
  const verdict = computeVerdict(outcomes, cancelled);
  const live = llm.stats.live - llmStart.live;
  const replayed = llm.stats.replay - llmStart.replay;
  const labels = [...ctx.labels];
  if (live === 0 && replayed > 0) labels.push('REPLAY');
  if (!cause) {
    const bad = outcomes.find((o) => o.outcome === 'failed') ?? outcomes.find((o) => o.outcome === 'needs_you' || o.outcome === 'blocked');
    if (bad) cause = `Step “${bad.step.title}”: ${bad.summary}`;
  }
  const steps: StepSummary[] = outcomes.map((o) => ({ stepId: o.step.id, title: o.step.title, status: o.status, evidenceSummary: o.summary, gaps: o.gaps }));
  const gaps = ctx.gapSlugs.slice();

  repo.appendLedger(runId, null, 'verdict', { verdict, gaps, blocked: ctx.blocked, labels, cause, steps: steps.map((s) => ({ stepId: s.stepId, status: s.status })) });
  const head = repo.getLedger(runId).at(-1)!;
  const receipt: SignedReceipt = sealReceipt(
    {
      runId, goal, verdict, createdAt: new Date().toISOString(), steps, gaps, blocked: ctx.blocked,
      ...(ctx.opts.repairOf ? { repairOf: ctx.opts.repairOf } : {}),
      chainHead: head.hash, labels, ...(cause ? { cause } : {}),
      llm: { provider: llm.providerName, model: llm.model, liveCalls: live, replayedCalls: replayed },
    },
    signer,
  );
  repo.updateRun(runId, { status: cancelled ? 'cancelled' : 'finished', verdict, labels, receipt, finished: true });
  ctx.emit({ type: 'receipt.sealed', runId, receipt });
}
