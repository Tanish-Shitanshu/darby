// The ONLY module with SQL. Everything else uses these typed functions.
import type { EvidenceContract, LedgerEntry, Plan, Receipt, StepStatus, Verdict } from '@darby/contracts';
import { computeEntryHash } from '../ledger/chain';
import { canonicalJson, jsonSafe, ZERO_HASH } from '../util/canonical';
import type { Db } from './index';

export interface RunRow {
  id: string;
  goal: string;
  mode: string;
  status: string;
  verdict: Verdict | null;
  repairOf: string | null;
  labels: string[];
  plan: Plan | null;
  receipt: (Receipt & Record<string, unknown>) | null;
  createdAt: string;
  finishedAt: string | null;
}
export interface StepRow {
  runId: string;
  stepId: string;
  position: number;
  title: string;
  tool: string;
  status: StepStatus;
  args: Record<string, unknown>;
  contract: EvidenceContract | null;
  result: Record<string, unknown> | null;
  startedAt: string | null;
  finishedAt: string | null;
}
export interface EventRow { id: number; runId: string; ts: string; type: string; payload: Record<string, unknown> }
export interface ApprovalRow {
  id: string; runId: string; stepId: string; summary: string; details: Record<string, unknown>;
  contentHash: string; status: 'pending' | 'approved' | 'denied' | 'cancelled'; requestedAt: string; resolvedAt: string | null;
}
export interface EvidenceRow { id: number; runId: string; stepId: string | null; kind: string; path: string; sha256: string; bytes: number; createdAt: string }
export interface MemoryRow { id: string; key: string; value: string; sourceRunId: string | null; createdAt: string }
export interface PlaybookRow { id: string; slug: string; name: string; json: Record<string, unknown>; ciPassed: boolean; createdAt: string }

const parse = <T>(s: string | null): T | null => (s === null ? null : (JSON.parse(s) as T));
const now = () => new Date().toISOString();

export function createRepo(db: Db) {
  /* ---------------- runs ---------------- */
  const toRun = (r: any): RunRow => ({
    id: r.id, goal: r.goal, mode: r.mode, status: r.status, verdict: r.verdict, repairOf: r.repair_of,
    labels: JSON.parse(r.labels_json), plan: parse(r.plan_json), receipt: parse(r.receipt_json), createdAt: r.created_at, finishedAt: r.finished_at,
  });
  const toStep = (r: any): StepRow => ({
    runId: r.run_id, stepId: r.step_id, position: r.position, title: r.title, tool: r.tool, status: r.status,
    args: JSON.parse(r.args_json), contract: parse(r.contract_json), result: parse(r.result_json), startedAt: r.started_at, finishedAt: r.finished_at,
  });

  const insertLedger = db.prepare(
    'INSERT INTO ledger (run_id, idx, ts, step_id, type, payload_json, prev_hash, hash) VALUES (?,?,?,?,?,?,?,?)',
  );
  const lastLedger = db.prepare('SELECT idx, hash FROM ledger WHERE run_id = ? ORDER BY idx DESC LIMIT 1');

  return {
    createRun(a: { id: string; goal: string; mode: string; repairOf?: string | null }): void {
      db.prepare('INSERT INTO runs (id, goal, mode, status, repair_of, created_at) VALUES (?,?,?,?,?,?)').run(a.id, a.goal, a.mode, 'planning', a.repairOf ?? null, now());
    },
    updateRun(id: string, p: Partial<{ status: string; verdict: Verdict; labels: string[]; plan: Plan; receipt: unknown; finished: boolean }>): void {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (p.status !== undefined) { sets.push('status = ?'); vals.push(p.status); }
      if (p.verdict !== undefined) { sets.push('verdict = ?'); vals.push(p.verdict); }
      if (p.labels !== undefined) { sets.push('labels_json = ?'); vals.push(JSON.stringify(p.labels)); }
      if (p.plan !== undefined) { sets.push('plan_json = ?'); vals.push(JSON.stringify(p.plan)); }
      if (p.receipt !== undefined) { sets.push('receipt_json = ?'); vals.push(JSON.stringify(p.receipt)); }
      if (p.finished) { sets.push('finished_at = ?'); vals.push(now()); }
      if (!sets.length) return;
      db.prepare(`UPDATE runs SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    },
    getRun(id: string): RunRow | null {
      const r = db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
      return r ? toRun(r) : null;
    },
    listRuns(limit = 50): RunRow[] {
      return db.prepare('SELECT * FROM runs ORDER BY created_at DESC, rowid DESC LIMIT ?').all(limit).map(toRun);
    },

    /* ---------------- steps ---------------- */
    upsertStep(s: { runId: string; stepId: string; position: number; title: string; tool: string; status: StepStatus; args: Record<string, unknown>; contract: EvidenceContract | null }): void {
      db.prepare(
        `INSERT INTO steps (run_id, step_id, position, title, tool, status, args_json, contract_json) VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(run_id, step_id) DO UPDATE SET title=excluded.title, tool=excluded.tool, status=excluded.status, args_json=excluded.args_json, contract_json=excluded.contract_json`,
      ).run(s.runId, s.stepId, s.position, s.title, s.tool, s.status, JSON.stringify(s.args), s.contract ? JSON.stringify(s.contract) : null);
    },
    updateStep(runId: string, stepId: string, p: Partial<{ status: StepStatus; result: Record<string, unknown>; started: boolean; finished: boolean }>): void {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (p.status !== undefined) { sets.push('status = ?'); vals.push(p.status); }
      if (p.result !== undefined) { sets.push('result_json = ?'); vals.push(JSON.stringify(p.result)); }
      if (p.started) { sets.push('started_at = ?'); vals.push(now()); }
      if (p.finished) { sets.push('finished_at = ?'); vals.push(now()); }
      if (!sets.length) return;
      db.prepare(`UPDATE steps SET ${sets.join(', ')} WHERE run_id = ? AND step_id = ?`).run(...vals, runId, stepId);
    },
    listSteps(runId: string): StepRow[] {
      return db.prepare('SELECT * FROM steps WHERE run_id = ? ORDER BY position').all(runId).map(toStep);
    },

    /* ---------------- events (UI stream history) ---------------- */
    addEvent(runId: string, type: string, payload: Record<string, unknown>): number {
      return Number(db.prepare('INSERT INTO events (run_id, ts, type, payload_json) VALUES (?,?,?,?)').run(runId, now(), type, JSON.stringify(payload)).lastInsertRowid);
    },
    listEvents(runId: string, afterId = 0): EventRow[] {
      return db.prepare('SELECT * FROM events WHERE run_id = ? AND id > ? ORDER BY id').all(runId, afterId).map((r: any) => ({ id: r.id, runId: r.run_id, ts: r.ts, type: r.type, payload: JSON.parse(r.payload_json) }));
    },

    /* ---------------- ledger (append-only hash chain) ---------------- */
    appendLedger(runId: string, stepId: string | null, type: string, payload: Record<string, unknown>): LedgerEntry {
      return db.transaction((): LedgerEntry => {
        const last = lastLedger.get(runId) as { idx: number; hash: string } | undefined;
        const base = {
          index: last ? last.idx + 1 : 0,
          ts: now(),
          runId,
          stepId,
          type,
          payload: jsonSafe(payload),
          prevHash: last ? last.hash : ZERO_HASH,
        };
        const entry: LedgerEntry = { ...base, hash: computeEntryHash(base) };
        insertLedger.run(runId, entry.index, entry.ts, stepId, type, canonicalJson(entry.payload), entry.prevHash, entry.hash);
        return entry;
      })();
    },
    getLedger(runId: string): LedgerEntry[] {
      return db.prepare('SELECT * FROM ledger WHERE run_id = ? ORDER BY idx').all(runId).map((r: any) => ({
        index: r.idx, ts: r.ts, runId: r.run_id, stepId: r.step_id, type: r.type, payload: JSON.parse(r.payload_json), prevHash: r.prev_hash, hash: r.hash,
      }));
    },

    /* ---------------- approvals ---------------- */
    createApproval(a: { id: string; runId: string; stepId: string; summary: string; details: Record<string, unknown>; contentHash: string }): void {
      db.prepare('INSERT INTO approvals (id, run_id, step_id, summary, details_json, content_hash, status, requested_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(a.id, a.runId, a.stepId, a.summary, JSON.stringify(a.details), a.contentHash, 'pending', now());
    },
    resolveApproval(id: string, status: 'approved' | 'denied' | 'cancelled'): void {
      db.prepare("UPDATE approvals SET status = ?, resolved_at = ? WHERE id = ? AND status = 'pending'").run(status, now(), id);
    },
    listApprovals(runId: string): ApprovalRow[] {
      return db.prepare('SELECT * FROM approvals WHERE run_id = ? ORDER BY requested_at').all(runId).map((r: any) => ({
        id: r.id, runId: r.run_id, stepId: r.step_id, summary: r.summary, details: JSON.parse(r.details_json), contentHash: r.content_hash, status: r.status, requestedAt: r.requested_at, resolvedAt: r.resolved_at,
      }));
    },

    /* ---------------- evidence files ---------------- */
    addEvidence(e: { runId: string; stepId: string | null; kind: string; path: string; sha256: string; bytes: number }): void {
      db.prepare('INSERT INTO evidence (run_id, step_id, kind, path, sha256, bytes, created_at) VALUES (?,?,?,?,?,?,?)').run(e.runId, e.stepId, e.kind, e.path, e.sha256, e.bytes, now());
    },
    listEvidence(runId: string): EvidenceRow[] {
      return db.prepare('SELECT * FROM evidence WHERE run_id = ? ORDER BY id').all(runId).map((r: any) => ({
        id: r.id, runId: r.run_id, stepId: r.step_id, kind: r.kind, path: r.path, sha256: r.sha256, bytes: r.bytes, createdAt: r.created_at,
      }));
    },

    /* ---------------- memory (user-controlled) ---------------- */
    addMemory(m: { id: string; key: string; value: string; sourceRunId?: string | null }): void {
      db.prepare('INSERT INTO memory (id, key, value, source_run_id, created_at) VALUES (?,?,?,?,?)').run(m.id, m.key, m.value, m.sourceRunId ?? null, now());
    },
    listMemory(): MemoryRow[] {
      return db.prepare('SELECT * FROM memory ORDER BY created_at DESC, rowid DESC').all().map((r: any) => ({ id: r.id, key: r.key, value: r.value, sourceRunId: r.source_run_id, createdAt: r.created_at }));
    },
    deleteMemory(id: string): boolean {
      return db.prepare('DELETE FROM memory WHERE id = ?').run(id).changes > 0;
    },

    /* ---------------- playbooks ---------------- */
    upsertPlaybook(p: { id: string; slug: string; name: string; json: Record<string, unknown> }): void {
      db.prepare(
        `INSERT INTO playbooks (id, slug, name, json, created_at) VALUES (?,?,?,?,?)
         ON CONFLICT(slug) DO UPDATE SET name=excluded.name, json=excluded.json`,
      ).run(p.id, p.slug, p.name, JSON.stringify(p.json), now());
    },
    setPlaybookCi(slug: string, passed: boolean): void {
      db.prepare('UPDATE playbooks SET ci_passed = ? WHERE slug = ?').run(passed ? 1 : 0, slug);
    },
    listPlaybooks(): PlaybookRow[] {
      return db.prepare('SELECT * FROM playbooks ORDER BY created_at DESC, rowid DESC').all().map((r: any) => ({ id: r.id, slug: r.slug, name: r.name, json: JSON.parse(r.json), ciPassed: !!r.ci_passed, createdAt: r.created_at }));
    },

    /* ---------------- settings ---------------- */
    getSetting(key: string): string | null {
      const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return r ? r.value : null;
    },
    setSetting(key: string, value: string): void {
      db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    },
  };
}
export type Repo = ReturnType<typeof createRepo>;
