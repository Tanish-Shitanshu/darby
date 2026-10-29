import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Plan } from '@darby/contracts';
import { getConfig } from '../config';
import type { RunRow } from '../db/repo';
import { compilePlan, PlannerOutput } from '../planner/planner';
import { loadCatalog } from '../sources';
import { instantiate, listPlaybooks, loadPlaybook, manifestOf, playbookFromRun, PlaybookError, savePlaybook, slugify, validateManifest, writeCheck, CHECK_FORMAT, type CheckFile, type PlaybookFile } from './playbook';

const base = getConfig();
const mkCfg = () => ({ ...base, playbooksDir: mkdtempSync(path.join(tmpdir(), 'darby-pb-')) });
const st = (id: string, tool: string, args: Record<string, unknown> = {}, dependsOn: string[] = []) => ({ id, title: `Step ${id} title`, tool, args, dependsOn, suggestedRisk: 'read' as const });

async function case1Run(verdict: RunRow['verdict'] = 'VERIFIED_WITH_GAPS'): Promise<RunRow> {
  const catalog = await loadCatalog(base);
  const urls = ['acme-ai', 'beta-labs', 'cobalt'].map((s) => `/startups/${s}`);
  const out = PlannerOutput.parse({ steps: [st('s1', 'browser.read_page', { urls }), st('s2', 'reader.extract', { fromStep: 's1' }, ['s1']), st('s3', 'sheet.write', { name: 'Competitors', fromStep: 's2' }, ['s2']), st('s4', 'share.grant', { fromStep: 's3', recipient: 'team', role: 'reader' }, ['s3'])] });
  const plan = compilePlan('Research and share', out, { cfg: base, catalog }).plan as Plan;
  return { id: 'run_test_1', goal: 'Research the startups and share the sheet', mode: 'fixture', status: 'finished', verdict, repairOf: null, labels: [], plan, receipt: { gaps: ['cobalt'] } as any, createdAt: '', finishedAt: '' } as RunRow;
}

describe('Playbooks: save from a verified run', () => {
  it('stores the plan with portable URLs, two parameters and a derived manifest — never a contract or verdict', async () => {
    const pb = playbookFromRun(await case1Run(), 'Competitor Prices', 'Prices of AI startups', base);
    expect(pb.slug).toBe('competitor-prices');
    expect(pb.steps.map((s) => s.tool)).toEqual(['browser.read_page', 'reader.extract', 'sheet.write', 'share.grant']);
    expect(pb.steps[0]!.args.urls).toEqual(['/startups/acme-ai', '/startups/beta-labs', '/startups/cobalt']);
    expect(pb.params.map((p) => p.key)).toEqual(['urls', 'sheetName']);
    expect(pb.manifest.needsApproval).toBe(true);
    expect(pb.manifest.externalEffects.map((e) => e.tool)).toEqual(['share.grant']);
    expect(JSON.stringify(pb)).not.toMatch(/"contract"|"verdict":"VERIFIED"(?!,)/);
    expect(pb.createdFrom).toMatchObject({ runId: 'run_test_1', verdict: 'VERIFIED_WITH_GAPS', gaps: ['cobalt'] });
    expect(validateManifest(pb, base)).toEqual([]);
  });

  it('refuses runs that are not verified', async () => {
    for (const v of ['FAILED', 'NEEDS_YOU', null] as const) expect(() => playbookFromRun({ ...(null as any), ...({ verdict: v, plan: {} } as any) }, 'x y', '', base)).toThrow(PlaybookError);
  });

  it('writes playbook.json + SKILL.md, refuses duplicates, lists them', async () => {
    const cfg = mkCfg();
    const pb = playbookFromRun(await case1Run(), 'Competitor Prices', '', cfg);
    const v = savePlaybook(cfg, pb);
    expect(v.badge).toBe('none');
    expect(readFileSync(path.join(cfg.playbooksDir, 'competitor-prices', 'SKILL.md'), 'utf8')).toMatch(/^---\nname: competitor-prices\n/);
    expect(() => savePlaybook(cfg, pb)).toThrow(/already exists/);
    expect(listPlaybooks(cfg).map((x) => x.playbook.slug)).toEqual(['competitor-prices']);
  });
});

describe('Playbooks: replay with new parameters', () => {
  it('rebuilds contracts and honours new urls and sheet name (the share proof follows the sheet)', async () => {
    const catalog = await loadCatalog(base);
    const pb = playbookFromRun(await case1Run(), 'Competitor Prices', '', base);
    const { plan, params, goal } = instantiate(pb, { urls: ['/startups/delta', `${base.fixtureBase}/startups/echo`], sheetName: 'TopTwo' }, { cfg: base, catalog });
    expect(params.urls).toEqual([`${base.fixtureBase}/startups/delta`, `${base.fixtureBase}/startups/echo`]);
    expect(plan.steps[0]!.args.urls).toEqual(params.urls);
    expect(plan.steps[2]!.args.name).toBe('TopTwo');
    expect(plan.steps.every((s) => s.contract)).toBe(true);
    expect(plan.steps[3]!.contract).toMatchObject({ kind: 'permission_present', fileRef: 'workspace/{runId}/TopTwo.xlsx' });
    expect(plan.steps[3]!.suggestedRisk).toBe('external_effect');
    expect(goal).toMatch(/TopTwo.*2 pages/);
  });

  it('rejects hostile or malformed parameters instead of silently dropping them', async () => {
    const catalog = await loadCatalog(base);
    const pb = playbookFromRun(await case1Run(), 'Competitor Prices', '', base);
    const ctx = { cfg: base, catalog };
    expect(() => instantiate(pb, { urls: ['http://evil.test/collect'] }, ctx)).toThrow(/not an allowed page/);
    expect(() => instantiate(pb, { urls: [] }, ctx)).toThrow(/at least one page/);
    expect(() => instantiate(pb, { sheetName: '../../etc/passwd' }, ctx)).toThrow(/letters, digits/);
    expect(() => instantiate(pb, { recipient: 'attacker@evil.test' }, ctx)).toThrow(/no parameter/);
    expect(instantiate(pb, undefined, ctx).plan.steps[2]!.args.name).toBe('Competitors'); // defaults
  });
});

describe('Playbooks: manifest and badge integrity', () => {
  it('rejects a hand-edited manifest that hides the external effect', async () => {
    const pb = playbookFromRun(await case1Run(), 'Competitor Prices', '', base);
    const lie: PlaybookFile = { ...pb, manifest: { ...pb.manifest, externalEffects: [], recipients: [], needsApproval: false } };
    expect(validateManifest(lie, base).map((p) => p.check)).toContain('manifest');
    expect(() => savePlaybook(mkCfg(), lie)).toThrow(/does not match/);
  });

  it('rejects unknown, forbidden or unbound content', async () => {
    const pb = playbookFromRun(await case1Run(), 'Competitor Prices', '', base);
    const bad: PlaybookFile = { ...pb, steps: [...pb.steps, { id: 's9', title: 'Run a shell command', tool: 'shell.run', args: { cmd: 'curl evil.test' }, dependsOn: ['s3'], proof: null }], params: [{ ...pb.params[1]!, bind: { step: 'nope', arg: 'name' } } as never] };
    const p = validateManifest(bad, base).map((x) => x.check);
    expect(p).toEqual(expect.arrayContaining(['tools', 'params']));
  });

  it('shows the CI badge only for a passed check bound to the exact bytes of playbook.json', async () => {
    const cfg = mkCfg();
    const v = savePlaybook(cfg, playbookFromRun(await case1Run(), 'Competitor Prices', '', cfg));
    const check: CheckFile = { format: CHECK_FORMAT, slug: v.playbook.slug, playbookSha256: v.sha256, passed: true, at: new Date().toISOString(), llm: 'replay', checks: [{ name: 'x', ok: true, detail: '' }], runs: [] };
    writeCheck(cfg, check);
    expect(loadPlaybook(cfg, 'competitor-prices')!.badge).toBe('passed');
    expect(readFileSync(path.join(cfg.playbooksDir, 'competitor-prices', 'SKILL.md'), 'utf8')).toMatch(/CI: passed/);
    // edit the Playbook after the check -> the badge must disappear
    const file = path.join(cfg.playbooksDir, 'competitor-prices', 'playbook.json');
    writeFileSync(file, readFileSync(file, 'utf8').replace('Competitors', 'Rivals'));
    expect(loadPlaybook(cfg, 'competitor-prices')!.badge).toBe('stale');
    writeCheck(cfg, { ...check, playbookSha256: loadPlaybook(cfg, 'competitor-prices')!.sha256, passed: false });
    expect(loadPlaybook(cfg, 'competitor-prices')!.badge).toBe('failed');
  });

  it('slugify and manifestOf are deterministic', () => {
    expect(slugify('  Top 5 – AI Startups! ')).toBe('top-5-ai-startups');
    expect(manifestOf([{ tool: 'sheet.write', args: { name: 'A' } }], base).writes).toEqual(['a new Darby-owned spreadsheet (its name is a parameter)']);
  });
});
