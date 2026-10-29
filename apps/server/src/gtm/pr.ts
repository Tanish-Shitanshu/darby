import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { run } from './media';

export interface PrFile { repoPath: string; abs: string }
export interface PrDraft { repo: string; branch: string; title: string; body: string; files: PrFile[] }
export interface PrResult { adapter: 'github' | 'local'; number: number; url: string; repo: string; branch: string; title: string; files: string[] }

/* ---------------- GitHub (real): branch + files + pull request on the TEST repo only ---------------- */
async function gh(token: string, method: string, url: string, body?: unknown): Promise<any> {
  const res = await fetch(`https://api.github.com${url}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Darby', ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub ${method} ${url.replace(/\/repos\/[^/]+\/[^/]+/, '/repos/…')} answered HTTP ${res.status}`);
  return text ? JSON.parse(text) : {};
}

export async function createGithubPr(token: string, d: PrDraft): Promise<PrResult> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(d.repo)) throw new Error('GITHUB_TEST_REPO must look like owner/repo');
  const repo = await gh(token, 'GET', `/repos/${d.repo}`);
  const base: string = repo.default_branch;
  const ref = await gh(token, 'GET', `/repos/${d.repo}/git/ref/heads/${base}`);
  await gh(token, 'POST', `/repos/${d.repo}/git/refs`, { ref: `refs/heads/${d.branch}`, sha: ref.object.sha });
  for (const f of d.files) {
    await gh(token, 'PUT', `/repos/${d.repo}/contents/${f.repoPath.split('/').map(encodeURIComponent).join('/')}`, { message: `Add ${f.repoPath}`, content: readFileSync(f.abs).toString('base64'), branch: d.branch });
  }
  const pr = await gh(token, 'POST', `/repos/${d.repo}/pulls`, { title: d.title, head: d.branch, base, body: d.body });
  return { adapter: 'github', number: pr.number, url: pr.html_url, repo: d.repo, branch: d.branch, title: d.title, files: d.files.map((f) => f.repoPath) };
}

export async function readGithubPr(token: string | null, repo: string, number: number): Promise<{ title: string; state: string; branch: string; files: string[] } | null> {
  const h: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'DarbyVerifier', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const r = await fetch(`https://api.github.com/repos/${repo}/pulls/${number}`, { headers: h, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return null;
  const pr: any = await r.json();
  const f = await fetch(`https://api.github.com/repos/${repo}/pulls/${number}/files?per_page=100`, { headers: h, signal: AbortSignal.timeout(15_000) });
  const files: string[] = f.ok ? ((await f.json()) as any[]).map((x) => x.filename) : [];
  return { title: pr.title, state: pr.state, branch: pr.head?.ref, files };
}

/* ---------------- Local (SIMULATED): a real git repo + a PR record on this computer; nothing leaves it ---------------- */
export async function createLocalPr(root: string, d: PrDraft): Promise<PrResult> {
  const dir = path.join(root, d.repo.split('/').pop()!);
  mkdirSync(dir, { recursive: true });
  const git = (args: string[]) => run('git', ['-C', dir, '-c', 'user.name=Darby local simulation', '-c', 'user.email=darby@example.invalid', '-c', 'commit.gpgsign=false', ...args], 30_000);
  if (!existsSync(path.join(dir, '.git'))) {
    await run('git', ['init', '-q', '-b', 'main', dir], 15_000);
    writeFileSync(path.join(dir, 'README.md'), '# darby-launch-test (local simulation)\n');
    await git(['add', '-A']);
    const c = await git(['commit', '-q', '-m', 'Initial commit']);
    if (c.code !== 0) throw new Error(`git commit failed: ${c.err.slice(0, 120)}`);
  }
  const co = await git(['checkout', '-q', '-B', d.branch, 'main']);
  if (co.code !== 0) throw new Error(`git checkout failed: ${co.err.slice(0, 120)}`);
  for (const f of d.files) {
    const dest = path.join(dir, f.repoPath);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(f.abs, dest);
  }
  await git(['add', '-A']);
  const c2 = await git(['commit', '-q', '-m', d.title]);
  if (c2.code !== 0) throw new Error(`git commit failed: ${c2.err.slice(0, 120)}`);
  await git(['checkout', '-q', 'main']);
  const rec = { number: 1, title: d.title, branch: d.branch, base: 'main', body: d.body, files: d.files.map((f) => f.repoPath), simulated: true };
  writeFileSync(path.join(root, 'pr.json'), JSON.stringify(rec, null, 2));
  return { adapter: 'local', number: 1, url: `file://${dir}#${d.branch}`, repo: dir, branch: d.branch, title: d.title, files: rec.files };
}

/** `dir` is the local git repo; its pull-request record sits next to it (pr.json). Both are re-read from disk, not taken from the creator. */
export async function readLocalPr(dir: string, number: number, branch: string): Promise<{ title: string; branch: string; files: string[] } | null> {
  const recFile = path.join(dir, '..', 'pr.json');
  if (!existsSync(recFile) || !existsSync(path.join(dir, '.git'))) return null;
  const rec = JSON.parse(readFileSync(recFile, 'utf8'));
  if (rec.number !== number || rec.branch !== branch) return null;
  const ls = await run('git', ['-C', dir, 'ls-tree', '-r', '--name-only', branch], 15_000);
  if (ls.code !== 0) return null;
  const log = await run('git', ['-C', dir, 'log', '-1', '--format=%s', branch], 15_000);
  return { title: log.out.trim(), branch, files: ls.out.split('\n').filter(Boolean) };
}
