import type { LedgerEntry } from '@darby/contracts';
import { canonicalJson, sha256, ZERO_HASH } from '../util/canonical';

/** hash = sha256(prevHash + canonicalJson({index,ts,runId,stepId,type,payload})) — exactly as docs/SPEC.md §8 and the contracts say. */
export function computeEntryHash(e: Omit<LedgerEntry, 'hash'>): string {
  return sha256(e.prevHash + canonicalJson({ index: e.index, ts: e.ts, runId: e.runId, stepId: e.stepId, type: e.type, payload: e.payload }));
}

export interface ChainCheck {
  valid: boolean;
  entries: number;
  brokenAt?: number;
  reason?: string;
}

/** Recompute every hash and link of a run's chain. Pure: works on a DB read or on a receipt file. */
export function verifyChain(entries: LedgerEntry[], runId?: string): ChainCheck {
  let prev = ZERO_HASH;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (e.index !== i) return { valid: false, entries: entries.length, brokenAt: i, reason: `entry ${i}: index is ${e.index} (gap or reorder)` };
    if (runId && e.runId !== runId) return { valid: false, entries: entries.length, brokenAt: i, reason: `entry ${i}: belongs to another run` };
    if (e.prevHash !== prev) return { valid: false, entries: entries.length, brokenAt: i, reason: `entry ${i}: prevHash does not match previous entry` };
    const h = computeEntryHash(e);
    if (h !== e.hash) return { valid: false, entries: entries.length, brokenAt: i, reason: `entry ${i} (${e.type}): content does not match its hash (edited)` };
    prev = e.hash;
  }
  return { valid: true, entries: entries.length };
}
