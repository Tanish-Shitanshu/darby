import { describe, expect, it } from 'vitest';
import { getConfig } from '../config';
import { loadCatalog } from '../sources';
import { compilePlan, PlannerOutput } from './planner';

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
