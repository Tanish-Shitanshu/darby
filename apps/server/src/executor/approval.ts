import type { PlanStep } from '@darby/contracts';
import type { RunContext } from './context';

/** What the approval card shows: target, content summary, and (via the context) a content hash. Built from trusted data only. */
export function describeApproval(ctx: RunContext, step: PlanStep): { summary: string; details: Record<string, unknown> } {
  const cfg = ctx.deps.cfg;
  if (step.tool === 'share.grant') {
    const src = ctx.outputs.get(String(step.args.fromStep)) as { ref?: string; name?: string; matrix?: string[][] } | undefined;
    const rows = Math.max(0, (src?.matrix?.length ?? 1) - 1);
    return {
      summary: `Share the document “${src?.name ?? 'Competitors'}” with ${cfg.teamEmail} (view access)`,
      details: {
        action: 'share.grant',
        target: cfg.teamEmail,
        role: String(step.args.role ?? 'reader'),
        document: src?.ref ?? '(unknown)',
        contentSummary: `${rows} rows: startup name, lowest paid monthly price (USD), evidence quote, source URL`,
        adapter: 'local',
        simulated: true,
        note: 'Local adapter: this share is SIMULATED (recorded in a sidecar file, nothing leaves this computer).',
      },
    };
  }
  return { summary: `Run ${step.tool}`, details: { action: step.tool, args: step.args } };
}
