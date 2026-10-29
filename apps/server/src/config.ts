import { existsSync } from 'node:fs';
import path from 'node:path';

function findRoot(): string {
  let dir = import.meta.dirname;
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, 'packages', 'contracts')) && existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Cannot locate the Darby repo root');
}

export const ROOT = findRoot();

let envLoaded = false;
/** Loads <root>/.env into process.env (never overrides variables already set). */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const file = path.join(ROOT, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}

export interface Config {
  root: string;
  port: number;
  fixtureBase: string;
  darbyDir: string;
  dbPath: string;
  runsDir: string;
  keysDir: string;
  profileDir: string;
  workspaceDir: string;
  replayCuratedDir: string;
  replayRecordDir: string;
  migrationsDir: string;
  llm: { provider: string; geminiModel: string; geminiFallbacks: string[]; rpm: number; concurrency: number };
  headless: boolean;
  browserChannel: 'chrome' | 'chromium';
  teamEmail: string;
  teamEmailConfigured: boolean;
  allowedOrigins: string[];
}

/** Read config from the environment at call time (tests override DARBY_DIR etc.). Never contains secrets. */
export function getConfig(): Config {
  loadEnv();
  const e = process.env;
  const darbyDir = path.resolve(e.DARBY_DIR || path.join(ROOT, '.darby'));
  const fixtureBase = e.FIXTURE_URL || `http://localhost:${e.FIXTURE_PORT || '4010'}`;
  return {
    root: ROOT,
    port: Number(e.PORT || 4000),
    fixtureBase,
    darbyDir,
    dbPath: path.join(darbyDir, 'darby.db'),
    runsDir: path.join(darbyDir, 'runs'),
    keysDir: path.join(darbyDir, 'keys'),
    profileDir: path.join(darbyDir, 'profile'),
    workspaceDir: path.resolve(e.DARBY_WORKSPACE || path.join(ROOT, 'workspace')),
    replayCuratedDir: path.join(ROOT, 'replay', 'llm'),
    replayRecordDir: path.resolve(e.DARBY_REPLAY_DIR || path.join(ROOT, '.darby', 'replay')),
    migrationsDir: path.join(ROOT, 'apps', 'server', 'db', 'migrations'),
    llm: {
      provider: (e.LLM_PROVIDER || 'replay').toLowerCase(),
      geminiModel: e.GEMINI_MODEL || 'gemini-3.5-flash',
      geminiFallbacks: (e.GEMINI_FALLBACK_MODELS ?? 'gemini-3-flash-preview,gemini-3.8-flash').split(',').map((m) => m.trim()).filter(Boolean),
      rpm: Number(e.GEMINI_RPM || 9),
      concurrency: Number(e.LLM_CONCURRENCY || 2),
    },
    headless: e.DARBY_HEADLESS === '1',
    browserChannel: e.BROWSER_CHANNEL === 'chromium' ? 'chromium' : 'chrome',
    teamEmail: e.SHARE_TEST_EMAIL || 'team@example.test',
    teamEmailConfigured: Boolean(e.SHARE_TEST_EMAIL),
    allowedOrigins: [new URL(fixtureBase).origin],
  };
}
