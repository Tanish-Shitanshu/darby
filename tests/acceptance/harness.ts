// Shared helpers for acceptance scenarios: boots a private fixture web, an isolated Darby state dir, and runs goals through the real pipeline.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { ROOT } from '../../apps/server/src/config';

export const ACCEPT_PORT = 4018;
export const STATE_DIR = path.join(ROOT, '.darby', 'acceptance');

export interface Harness {
  base: string;
  manager: import('../../apps/server/src/runs/manager').RunManager;
  stop(): Promise<void>;
  resetFixtures(): Promise<void>;
  outbox(): Promise<unknown[]>;
  leads(): Promise<unknown[]>;
}

async function waitUp(base: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${base}/health`); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('fixture server did not start');
}

/** opts.replay=true forces LLM_PROVIDER=replay (deterministic, offline). */
export async function startHarness(opts: { replay: boolean; headless?: boolean; keepState?: boolean }): Promise<Harness> {
  const base = `http://localhost:${ACCEPT_PORT}`;
  const fx: ChildProcess = spawn(process.execPath, ['fixtures/site/server.mjs'], { cwd: ROOT, env: { ...process.env, FIXTURE_PORT: String(ACCEPT_PORT) }, stdio: ['ignore', 'ignore', 'inherit'] });
  await waitUp(base);

  if (!opts.keepState) rmSync(STATE_DIR, { recursive: true, force: true });
  mkdirSync(STATE_DIR, { recursive: true });
  process.env.DARBY_DIR = STATE_DIR;
  process.env.DARBY_WORKSPACE = path.join(STATE_DIR, 'workspace');
  process.env.FIXTURE_PORT = String(ACCEPT_PORT);
  process.env.FIXTURE_URL = base;
  if (opts.replay) process.env.LLM_PROVIDER = 'replay';
  if (opts.headless !== undefined) process.env.DARBY_HEADLESS = opts.headless ? '1' : '0';

  const { createManager } = await import('../../apps/server/src/bootstrap');
  const manager = await createManager();
  return {
    base,
    manager,
    async stop() {
      await manager.shutdown();
      fx.kill();
    },
    async resetFixtures() { await fetch(`${base}/api/reset`, { method: 'POST' }); },
    async outbox() { return (await (await fetch(`${base}/api/outbox`)).json()) as unknown[]; },
    async leads() { return (await (await fetch(`${base}/api/leads`)).json()) as unknown[]; },
  };
}

export interface Check { name: string; ok: boolean; detail: string }
export const expected = () => JSON.parse(readFileSync(path.join(ROOT, 'fixtures', 'expected.json'), 'utf8')) as {
  startups: { slug: string; name: string; url: string; priceUsd: number | null; quote: string | null }[];
  gaps: string[];
  injection: { pageSlug: string; attackerEmail: string };
};

export async function readSheetRows(file: string): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0]!;
  const rows: string[][] = [];
  ws.eachRow((row) => rows.push(Array.from({ length: 6 }, (_, i) => { const v = row.getCell(i + 1).value; return v === null || v === undefined ? '' : String(v); })));
  return rows;
}
