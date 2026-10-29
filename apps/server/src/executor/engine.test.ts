import { describe, expect, it } from 'vitest';
import { computeVerdict, foldChecks } from './engine';

const o = (...x: string[]) => x.map((outcome) => ({ outcome: outcome as any }));
const chk = (p: Partial<{ passed: boolean; gap: boolean; error: boolean }>) => ({ passed: true, gap: false, gaps: [], error: false, detail: '', ...p });

describe('verdict', () => {
  it('VERIFIED only when every step is proven and there are no gaps', () => {
    expect(computeVerdict(o('ok', 'ok', 'ok'))).toBe('VERIFIED');
  });
  it('VERIFIED_WITH_GAPS when everything passed and some items are flagged gaps', () => {
    expect(computeVerdict(o('ok', 'gap', 'ok'))).toBe('VERIFIED_WITH_GAPS');
  });
  it('FAILED when any contract failed verification', () => {
    expect(computeVerdict(o('ok', 'failed', 'gap'))).toBe('FAILED');
  });
  it('NEEDS_YOU for anything unverified, blocked, skipped or cancelled — never VERIFIED', () => {
    expect(computeVerdict(o('ok', 'needs_you'))).toBe('NEEDS_YOU');
    expect(computeVerdict(o('ok', 'blocked'))).toBe('NEEDS_YOU');
    expect(computeVerdict(o('ok', 'cancelled'))).toBe('NEEDS_YOU');
    expect(computeVerdict(o('ok', 'ok'), true)).toBe('NEEDS_YOU');
  });
  it('a run with no steps cannot be verified', () => {
    expect(computeVerdict([])).toBe('FAILED');
  });
});

describe('folding contract checks into a step outcome', () => {
  it('error beats failure beats gap beats ok', () => {
    expect(foldChecks([chk({}), chk({})])).toEqual({ outcome: 'ok', status: 'passed' });
    expect(foldChecks([chk({}), chk({ gap: true })])).toEqual({ outcome: 'gap', status: 'passed_with_gaps' });
    expect(foldChecks([chk({ gap: true }), chk({ passed: false })])).toEqual({ outcome: 'failed', status: 'failed' });
    expect(foldChecks([chk({ passed: false }), chk({ passed: false, error: true })])).toEqual({ outcome: 'needs_you', status: 'failed' });
  });
});
