import { Plan } from '@darby/contracts';
import { completeJson, type Llm } from '../llm/llm';
import type { LlmResult } from '../llm/types';
import { compilePlan, PlannerOutput, plannerSystem, PlanningError } from './planner';
import type { CompileCtx } from '../tools/registry';

export const MAX_REPAIRS = 2;

export interface RepairContext {
  fromRunId: string;
  failedPlan: Plan;
  /** the verifier's plain-language cause (our own words, no page text) */
  cause: string;
}

/** The lead the failed attempt tried to save. Taken from the trusted plan arguments, never re-invented by the model. */
function leadOf(plan: Plan): Record<string, string> | null {
  for (const s of plan.steps) {
    if (s.tool === 'browser.act' && s.args.fields && typeof s.args.fields === 'object') return s.args.fields as Record<string, string>;
    if (s.tool === 'http.request' && s.args.body && typeof s.args.body === 'object') return s.args.body as Record<string, string>;
  }
  return null;
}

/**
 * Re-plan after a VERIFIED failure. The replanner sees the goal, the failed plan's tools/arguments and the verifier's cause,
 * and is told to choose a different, documented route. Code then pins the data (the lead) to what the failed attempt used.
 */
export async function makeRepairPlan(goal: string, repair: RepairContext, ctx: CompileCtx & { llm: Llm }, signal?: AbortSignal): Promise<{ plan: Plan; llm: LlmResult[] }> {
  const failedSteps = repair.failedPlan.steps.map((s) => `- ${s.id} ${s.tool} ${JSON.stringify(s.args)}`).join('\n');
  const system = `${plannerSystem(ctx)}

REPAIR MODE: a previous attempt at this goal was independently verified as FAILED.
Failed attempt:
${failedSteps}
Verified cause (from the independent verifier): ${repair.cause}
Do NOT repeat the same approach. The user-interface path cannot be trusted for this task. Use a DOCUMENTED API of the same app from the trusted list below, with the same data, as a single http.request step (method POST). Verification is done by Darby after your step; do not add steps for it.
Trusted documented APIs:
- LeadDesk: POST ${ctx.catalog.apis.leads}  body {name,email,company}   (read back with GET ${ctx.catalog.apis.leads})`;
  const llm: LlmResult[] = [];
  let feedback = '';
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await completeJson(ctx.llm, { role: 'planner', system, prompt: `USER GOAL:\n${goal}${feedback}` }, PlannerOutput, signal);
    if (r.result) llm.push(r.result);
    if (!r.ok) problems = [`planner output invalid: ${r.reason}`];
    else {
      const c = compilePlan(goal, r.value, ctx);
      if (c.plan) {
        const lead = leadOf(repair.failedPlan);
        const pinned = c.plan.steps.map((s) => (s.tool === 'http.request' && lead ? { ...s, args: { ...s.args, body: lead } } : s));
        if (!pinned.some((s) => s.tool === 'http.request')) problems = ['the repair plan must use the documented API (http.request)'];
        else return { plan: Plan.parse({ ...c.plan, steps: pinned }), llm };
      } else problems = c.problems;
    }
    feedback = `\n\nYour previous answer was rejected:\n- ${problems.join('\n- ')}\nReturn corrected JSON only.`;
  }
  throw new PlanningError('The replanner could not produce a valid repair plan.', problems);
}
