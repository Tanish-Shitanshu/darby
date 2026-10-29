import { describe, expect, it } from 'vitest';
import type { Plan, RunEvent } from '@darby/contracts';
import { applyEvent, foldEvents, proofLine, safeShot } from './state';

const plan: Plan = {
  id: 'p', goal: 'g', createdAt: new Date().toISOString(),
  steps: [
    { id: 's1', title: 'Read', tool: 'browser.read_page', args: {}, dependsOn: [], suggestedRisk: 'read', contract: { kind: 'file_exists', path: 'x.png', minBytes: 1 } },
    { id: 's2', title: 'Share', tool: 'share.grant', args: {}, dependsOn: ['s1'], suggestedRisk: 'external_effect', contract: null },
  ],
};
const receipt = (extra: Record<string, unknown> = {}) => ({
  runId: 'r', goal: 'g', verdict: 'VERIFIED_WITH_GAPS' as const, createdAt: new Date().toISOString(),
  steps: [{ stepId: 's1', title: 'Read', status: 'passed' as const, evidenceSummary: 'ok', gaps: [] }, { stepId: 's2', title: 'Share', status: 'cancelled' as const, evidenceSummary: 'cancelled', gaps: [] }],
  gaps: [], blocked: [], chainHead: 'h', publicKey: 'k', signature: 's', ...extra,
});

describe('companion event reducer', () => {
  it('builds the plan, timeline, approval card and receipt from the event stream', () => {
    const events: RunEvent[] = [
      { type: 'run.started', runId: 'r', goal: 'g' },
      { type: 'plan.created', runId: 'r', plan },
      { type: 'step.started', runId: 'r', stepId: 's1' },
      { type: 'step.action', runId: 'r', stepId: 's1', description: 'Read a page', screenshotPath: '/api/runs/run_r1/shots/a.png' },
      { type: 'step.evidence', runId: 'r', stepId: 's1', contract: plan.steps[0]!.contract, passed: true, detail: 'file exists' },
      { type: 'step.finished', runId: 'r', stepId: 's1', status: 'passed' },
      { type: 'approval.requested', runId: 'r', stepId: 's2', summary: 'Share it', details: { target: 'team@example.test' } },
    ];
    const v = foldEvents('r', events);
    expect(v.plan?.steps).toHaveLength(2);
    expect(v.steps.s1!.status).toBe('passed');
    expect(v.steps.s1!.evidence[0]!.passed).toBe(true);
    expect(v.timeline.some((t) => t.shot === '/api/runs/run_r1/shots/a.png')).toBe(true);
    expect(v.phase).toBe('awaiting_approval');
    expect(v.approval?.summary).toBe('Share it');
  });

  it('cancel clears a waiting approval card and the receipt is the final word on step status', () => {
    let v = foldEvents('r', [
      { type: 'run.started', runId: 'r', goal: 'g' }, { type: 'plan.created', runId: 'r', plan },
      { type: 'approval.requested', runId: 'r', stepId: 's2', summary: 'Share it', details: {} },
    ]);
    expect(v.approval).not.toBeNull();
    v = applyEvent(v, { type: 'run.cancelled', runId: 'r' });
    expect(v.approval).toBeNull();
    expect(v.phase).toBe('cancelled');
    v = applyEvent(v, { type: 'receipt.sealed', runId: 'r', receipt: receipt() });
    expect(v.steps.s2!.status).toBe('cancelled');
    expect(v.phase).toBe('cancelled');
  });

  it('keeps the signed extras on the receipt (labels, cause)', () => {
    const v = foldEvents('r', [{ type: 'receipt.sealed', runId: 'r', receipt: receipt({ labels: ['REPLAY', 'SIMULATED:share.grant'], cause: 'because' }) as never }]);
    expect(v.receipt?.labels).toEqual(['REPLAY', 'SIMULATED:share.grant']);
    expect(v.receipt?.cause).toBe('because');
  });

  it('shows a proof line for every contract kind, and says so when a step needs none', () => {
    expect(proofLine(null)).toMatch(/No proof needed/);
    expect(proofLine({ kind: 'quote_in_page', url: 'http://x.test', items: [] })).toMatch(/exact quote/);
    expect(proofLine({ kind: 'permission_present', fileRef: 'f', email: 'a@b.test', role: 'reader' })).toMatch(/a@b\.test/);
  });

  it('only same-origin screenshot paths from our own API are ever rendered', () => {
    expect(safeShot('/api/runs/run_20261029_090403_tjk2/shots/01-read-acme-ai.png')).toBeDefined();
    for (const bad of ['javascript:alert(1)', 'https://evil.test/a.png', '//evil.test/a.png', '/api/runs/../x/shots/a.png', '/api/runs/run_1/shots/../../etc/passwd.png', 'data:image/png;base64,AAAA', '/api/runs/run_1/shots/a.svg']) expect(safeShot(bad), bad).toBeUndefined();
    const v = applyEvent(undefined, { type: 'step.action', runId: 'r', stepId: 's1', description: 'x', screenshotPath: 'https://evil.test/p.png' });
    expect(v.timeline[0]!.shot).toBeUndefined();
  });
});
