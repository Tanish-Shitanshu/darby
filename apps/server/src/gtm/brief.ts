import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Config } from '../config';

/** The launch brief is trusted configuration (a file the team wrote), like the Sources list. */
export const Brief = z.object({
  product: z.string().min(1).max(60),
  oneLiner: z.string().max(200),
  audience: z.string().max(300),
  pricingIdea: z.string().max(100),
  competitorUrls: z.array(z.string()).min(1).max(6),
  tone: z.string().max(100),
  assetsWanted: z.array(z.string()).default([]),
  testRepo: z.string().max(100),
});
export type Brief = z.infer<typeof Brief>;

export function loadBrief(cfg: Pick<Config, 'root'>): Brief {
  return Brief.parse(JSON.parse(readFileSync(path.join(cfg.root, 'fixtures', 'gtm', 'brief.json'), 'utf8')));
}

/** The copy the creative model writes. Every field is length-limited and checked for URLs, emails and commands before use. */
export const Copy = z.object({
  headline: z.string().min(5).max(80),
  subhead: z.string().min(10).max(180),
  bullets: z.array(z.string().min(5).max(110)).length(3),
  cta: z.string().min(2).max(30),
  positioning: z.string().min(20).max(500),
  teaserLines: z.array(z.string().min(3).max(70)).min(3).max(5),
  launchPost: z.string().min(20).max(600),
}).strict();
export type Copy = z.infer<typeof Copy>;

const BAD = /https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\$\(|`|<\s*\/?\s*(script|iframe|object|embed)|javascript:|\bon\w+\s*=/i;
/** Returns the first reason the copy is unsafe/unusable, or null. */
export function copyProblem(c: Copy): string | null {
  const all = [c.headline, c.subhead, ...c.bullets, c.cta, c.positioning, ...c.teaserLines, c.launchPost];
  const hit = all.find((t) => BAD.test(t));
  return hit ? `contains a URL, email, command or markup: “${hit.slice(0, 40)}”` : null;
}

/** Deterministic copy straight from the brief: the labelled fallback when no model answer is available. */
export function templateCopy(b: Brief, competitors: { name: string; priceUsd: number | null }[]): Copy {
  const priced = competitors.filter((c) => c.priceUsd !== null).map((c) => c.priceUsd as number);
  const lowest = priced.length ? Math.min(...priced) : null;
  return {
    headline: `${b.product}: study smarter, not longer`.slice(0, 80),
    subhead: b.oneLiner.slice(0, 180),
    bullets: ['Slides become flashcards in one click', 'Spaced repetition schedules every review for you', `${b.pricingIdea}`.slice(0, 110)],
    cta: 'Join the waitlist',
    positioning: `${b.product} is for ${b.audience.replace(/\.$/, '')}. ${lowest !== null ? `Competitors charge from $${lowest} per month; ` : ''}${b.product} starts free and stays student-priced.`.slice(0, 500),
    teaserLines: [`Meet ${b.product}`, 'Slides in. Flashcards out.', 'Spaced repetition, automatic', 'Free to start'],
    launchPost: `We are launching ${b.product}: ${b.oneLiner} ${b.pricingIdea}`.slice(0, 600),
  };
}
