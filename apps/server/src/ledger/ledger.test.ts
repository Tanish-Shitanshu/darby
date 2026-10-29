import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { LedgerEntry } from '@darby/contracts';
import { getConfig } from '../config';
import { openDb, type Db } from '../db';
import { createRepo, type Repo } from '../db/repo';
import { computeEntryHash, verifyChain } from './chain';
import { loadSigner, sealReceipt, verifyBundle, type ReceiptBundle } from './receipt';

const cfg = getConfig();
let db: Db;
let repo: Repo;
const tmp = mkdtempSync(path.join(tmpdir(), 'darby-test-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function seedRun(n = 5): LedgerEntry[] {
  repo.createRun({ id: 'r1', goal: 'test goal', mode: 'fixture' });
  for (let i = 0; i < n - 1; i++) repo.appendLedger('r1', i ? `s${i}` : null, 'step.action', { i, text: `entry ${i}` });
  repo.appendLedger('r1', null, 'verdict', { verdict: 'VERIFIED' });
  return repo.getLedger('r1');
}

beforeEach(() => {
  db = openDb(':memory:', cfg.migrationsDir);
  repo = createRepo(db);
});

describe('ledger hash chain', () => {
  it('links every entry to the previous one and verifies', () => {
    const l = seedRun();
    expect(l).toHaveLength(5);
    expect(l[0]!.prevHash).toBe('0'.repeat(64));
    expect(l[1]!.prevHash).toBe(l[0]!.hash);
    expect(verifyChain(l, 'r1')).toEqual({ valid: true, entries: 5 });
  });

  it('detects an edited entry (payload changed, hash left alone)', () => {
    const l = seedRun();
    const bad = structuredClone(l);
    bad[2]!.payload = { ...bad[2]!.payload, text: 'edited' };
    const c = verifyChain(bad, 'r1');
    expect(c.valid).toBe(false);
    expect(c.brokenAt).toBe(2);
    expect(c.reason).toMatch(/edited/);
  });

  it('detects a deleted entry and a re-ordered chain', () => {
    const l = seedRun();
    expect(verifyChain([l[0]!, l[2]!, l[3]!, l[4]!], 'r1').valid).toBe(false);
    expect(verifyChain([l[1]!, l[0]!, l[2]!], 'r1').valid).toBe(false);
  });

  it('detects an edit that the attacker re-hashed locally (chain of later entries breaks)', () => {
    const l = seedRun();
    const bad = structuredClone(l);
    bad[1]!.payload = { forged: true };
    // recompute entry 1's own hash, but entry 2 still points at the old hash
    bad[1]!.hash = computeEntryHash(bad[1]!);
    const c = verifyChain(bad, 'r1');
    expect(c.valid).toBe(false);
    expect(c.brokenAt).toBe(2);
  });
});

describe('database triggers', () => {
  it('reject UPDATE and DELETE on the ledger', () => {
    seedRun();
    expect(() => db.prepare("UPDATE ledger SET payload_json = '{}' WHERE run_id = 'r1' AND idx = 1").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM ledger WHERE run_id = 'r1'").run()).toThrow(/append-only/);
    expect(repo.getLedger('r1')).toHaveLength(5);
  });

  it('a row edited behind the triggers (they are dropped) is still caught by the chain check', () => {
    seedRun();
    db.exec('DROP TRIGGER ledger_no_update');
    db.prepare("UPDATE ledger SET payload_json = '{\"i\":1,\"text\":\"edited\"}' WHERE run_id = 'r1' AND idx = 1").run();
    expect(verifyChain(repo.getLedger('r1'), 'r1').valid).toBe(false);
  });

  it('keeps foreign keys on and migrations versioned', () => {
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(() => repo.appendLedger('missing-run', null, 'x', {})).toThrow();
    expect(repo.listTables()).toEqual(expect.arrayContaining(['runs', 'steps', 'events', 'ledger', 'approvals', 'evidence', 'memory', 'playbooks', 'settings', 'schema_migrations']));
  });
});

describe('signed receipt', () => {
  function bundle(): ReceiptBundle {
    const ledger = seedRun();
    const signer = loadSigner(path.join(tmp, `keys-${Math.random()}`));
    const receipt = sealReceipt(
      { runId: 'r1', goal: 'test goal', verdict: 'VERIFIED', createdAt: new Date().toISOString(), steps: [], gaps: [], blocked: [], chainHead: ledger.at(-1)!.hash, labels: [] },
      signer,
    );
    return { format: 'darby-receipt-bundle/1', receipt, ledger };
  }

  it('sign -> verify round trip is valid', () => {
    const v = verifyBundle(bundle());
    expect(v.valid).toBe(true);
    expect(v.checks.map((c) => c.name)).toEqual(['receipt schema', 'hash chain', 'chain head', 'signature']);
  });

  it('survives a JSON round trip through a file', () => {
    expect(verifyBundle(JSON.parse(JSON.stringify(bundle()))).valid).toBe(true);
  });

  it('fails when the verdict is edited', () => {
    const b = bundle();
    b.receipt.verdict = 'FAILED';
    expect(verifyBundle(b).valid).toBe(false);
  });

  it('fails when a ledger entry is edited', () => {
    const b = bundle();
    b.ledger[1]!.payload = { text: 'rewritten history' };
    const v = verifyBundle(b);
    expect(v.valid).toBe(false);
    expect(v.checks.find((c) => c.name === 'hash chain')?.ok).toBe(false);
  });

  it('fails when the signature belongs to another key', () => {
    const b = bundle();
    const other = loadSigner(path.join(tmp, 'other-key'));
    b.receipt.publicKey = other.publicKeyB64;
    const v = verifyBundle(b);
    expect(v.valid).toBe(false);
    expect(v.checks.find((c) => c.name === 'signature')?.ok).toBe(false);
  });

  it('fails when a signed label (REPLAY / SIMULATED) is stripped', () => {
    const b = bundle();
    b.receipt.labels = ['REPLAY'];
    expect(verifyBundle(b).valid).toBe(false);
  });

  it('rejects files that are not receipt bundles', () => {
    expect(verifyBundle({ hello: 'world' }).valid).toBe(false);
  });
});
