import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { Config } from './config';

export interface Source {
  id: string;
  label: string;
  urls: string[];
}
export interface DemoLead { name: string; email: string; company: string }
export interface Catalog {
  /** Trusted, documented API endpoints of the fixture apps (configuration, not learned from pages). */
  apis: { leads: string };
  /** Used when a goal asks to "submit a lead" but names none. */
  demoLead: DemoLead;
  /** Trusted configuration (like a user's bookmarks): URLs come from here, never from page text. */
  sources: Source[];
  names: Record<string, string>;
}

/** In fixture mode the "directory" of fixture pages is configuration, not something learned from a page (page-derived URLs would be tainted). */
export async function loadCatalog(cfg: Config): Promise<Catalog> {
  const data: any = await import(pathToFileURL(path.join(cfg.root, 'fixtures', 'site', 'data.mjs')).href);
  const base = cfg.fixtureBase.replace(/\/$/, '');
  const names: Record<string, string> = {};
  for (const s of data.startups) names[s.slug] = s.name;
  for (const c of data.competitors) names[c.slug] = c.name;
  return {
    names,
    apis: { leads: `${base}/api/leads` },
    demoLead: { name: 'Ada Lovelace', email: 'ada.lovelace@example.test', company: 'Analytical Engines Ltd' },
    sources: [
      { id: 'fixture-startups', label: 'AI startups on the fixture web', urls: data.startups.map((s: any) => `${base}/startups/${s.slug}`) },
      { id: 'fixture-competitors', label: 'StudyLoop competitor pages on the fixture web', urls: data.competitors.map((c: any) => `${base}/competitors/${c.slug}`) },
      { id: 'fixture-leaddesk', label: 'LeadDesk demo app', urls: [`${base}/app/form`, `${base}/app/form?mode=broken`, `${base}/app/leads`, `${base}/app/help`] },
    ],
  };
}
