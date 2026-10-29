import type { PlanStep } from '@darby/contracts';
import type { RunContext } from './context';
import { prDraft } from './gtm-tools';
import { ToolError } from './tools';

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
  if (step.tool === 'github.create_pr') {
    try {
      const d = prDraft(ctx);
      return {
        summary: d.summary,
        details: {
          action: 'github.create_pr',
          target: d.adapter === 'github' ? d.draft.repo : `${d.draft.repo} (local test repo)`,
          branch: d.draft.branch,
          title: d.draft.title,
          files: d.files,
          contentSummary: `${d.files.length} files: ${d.files.map((f) => f.path).join(', ')}`,
          body: d.draft.body.slice(0, 600),
          adapter: d.adapter,
          simulated: d.adapter === 'local',
          note: d.adapter === 'local' ? 'No GitHub token is configured: this pull request is SIMULATED in a local test repo (nothing leaves this computer).' : 'This opens a real pull request on the test repository only.',
        },
      };
    } catch (e) {
      const m = e instanceof ToolError ? e.message : (e as Error).message;
      return { summary: 'Open a pull request on the test repo', details: { action: 'github.create_pr', note: `The pull request cannot be prepared yet: ${m}` } };
    }
  }
  return { summary: `Run ${step.tool}`, details: { action: step.tool, args: step.args } };
}
