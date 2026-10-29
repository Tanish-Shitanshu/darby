import { describe, expect, it } from 'vitest';
import { getConfig } from '../config';
import { loadCatalog } from '../sources';
import { compilePlan, PlannerOutput, plannerSystem, scopeOf } from './planner';

const cfg = getConfig();
const step = (id: string, tool: string, args: Record<string, unknown> = {}, dependsOn: string[] = []) => ({ id, title: `Step ${id} title`, tool, args, dependsOn, suggestedRisk: 'read' as const });

describe('plan compiler: the planner proposes, code decides', () => {
  it('attaches an evidence contract to every step and fixes args/risk from the registry', async () => {
    const catalog = await loadCatalog(cfg);
    const out = PlannerOutput.parse({
      steps: [
        step('s1', 'browser.read_page', { urls: ['/startups/acme-ai', 'http://evil.test/x'] }),
        step('s2', 'reader.extract', {}, ['s1']),
        step('s3', 'sheet.write', { name: 'Competitors!!' }, ['s2']),
      ],
    });
    const { plan, problems } = compilePlan('goal text', out, { cfg, catalog });
    expect(problems).toEqual([]);
    expect(plan!.steps.map((s) => s.contract?.kind)).toEqual(['file_exists', 'quote_in_page', 'sheet_readback']);
    expect(plan!.steps[0]!.args.urls).toEqual([`${cfg.fixtureBase}/startups/acme-ai`]); // off-origin URL dropped (READ-001)
    expect(plan!.steps[1]!.args.fromStep).toBe('s1');
    expect(plan!.steps[2]!.args.name).toBe('Competitors');
    expect(plan!.steps.map((s) => s.suggestedRisk)).toEqual(['read', 'read', 'write_local']);
  });

  it('rejects tools that are not registered', async () => {
    const catalog = await loadCatalog(cfg);
    const out = PlannerOutput.parse({ steps: [step('s1', 'shell.run', { cmd: 'rm -rf /' })] });
    const { plan, problems } = compilePlan('g', out, { cfg, catalog });
    expect(plan).toBeUndefined();
    expect(problems.join()).toMatch(/not registered/);
  });

  it('rejects a document step with nothing to write', async () => {
    const catalog = await loadCatalog(cfg);
    const out = PlannerOutput.parse({ steps: [step('s1', 'sheet.write', {})] });
    expect(compilePlan('g', out, { cfg, catalog }).problems.join()).toMatch(/needs an earlier reader\.extract/);
  });

  it('falls back to the trusted catalog when the planner gives no usable URLs', async () => {
    const catalog = await loadCatalog(cfg);
    const out = PlannerOutput.parse({ steps: [step('s1', 'browser.read_page', { urls: ['http://evil.test/'] })] });
    const { plan } = compilePlan('g', out, { cfg, catalog });
    expect((plan!.steps[0]!.args.urls as string[]).length).toBe(10);
  });
});

describe('planner prompt scopes keep recorded prompts stable', () => {
  it('research goals never see the form or launch tools; launch goals see the launch chain', async () => {
    const catalog = await loadCatalog(cfg);
    const base = plannerSystem({ cfg, catalog }, scopeOf('Research the 10 AI startups and record prices in a sheet, then share it with the team email.'));
    expect(base).not.toMatch(/browser\.act|http\.request|gtm\.|github\.create_pr|demo lead/);
    const lead = plannerSystem({ cfg, catalog }, scopeOf('Submit a lead through the form at /app/form?mode=broken and confirm it was saved.'));
    expect(lead).toMatch(/browser\.act/);
    expect(lead).not.toMatch(/gtm\./);
    const gtm = plannerSystem({ cfg, catalog }, scopeOf('Launch StudyLoop from the brief and open a pull request on the test repo.'));
    expect(gtm).toMatch(/gtm\.copy[\s\S]*gtm\.teaser[\s\S]*github\.create_pr/);
    expect(gtm).not.toMatch(/browser\.act/);
  });
});
