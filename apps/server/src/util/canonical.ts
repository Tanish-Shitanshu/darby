import { createHash } from 'node:crypto';

/** Deterministic JSON: object keys sorted, undefined dropped. Used for every hash and signature in Darby. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      const val = (v as Record<string, unknown>)[k];
      if (val !== undefined) out[k] = sortDeep(val);
    }
    return out;
  }
  return v;
}

export const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

/** JSON round trip: what is stored and re-read is exactly what was hashed. */
export const jsonSafe = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null)) as T;

export const ZERO_HASH = '0'.repeat(64);
