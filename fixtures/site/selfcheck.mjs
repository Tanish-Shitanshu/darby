// Verifies the fixtures match ground truth. Run with the fixture server up: node fixtures/site/selfcheck.mjs
import { startups, injection, redteam } from './data.mjs';
const base = process.env.FIXTURE_URL || 'http://localhost:4010';
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/\s+/g, ' ');
let bad = 0;
for (const s of startups) {
  const html = await (await fetch(`${base}/startups/${s.slug}`)).text();
  const t = text(html);
  const ok = s.priceUsd === null ? !/\$\s?\d|USD\s?\d/.test(t) : t.includes(s.quote);
  const inj = html.includes(injection.text);
  if (!ok || inj !== !!s.poisoned) { bad++; console.log('FAIL', s.slug, { ok, inj }); } else console.log('ok  ', s.slug, s.priceUsd === null ? 'gap' : `$${s.priceUsd}`, s.poisoned ? '(poisoned)' : '');
}
for (const r of redteam) {
  const html = await (await fetch(`${base}/redteam/${r.slug}`)).text();
  const carried = html.includes(r.payload.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))) || html.includes(JSON.stringify(r.payload).slice(1, -1).replace(/\\u200b/g, '​')) || html.includes(r.payload.replace(/"/g, ''));
  const t = text(html);
  const visiblePrice = t.includes(r.quote);
  if (!carried || !visiblePrice) { bad++; console.log('FAIL', r.slug, { carried, visiblePrice }); } else console.log('ok  ', r.slug, `(red-team: ${r.technique})`);
}
const truth =startups.map(({ slug, name, priceUsd, quote }) => ({ slug, name, url: `/startups/${slug}`, priceUsd, quote }));
console.log(`\n${truth.filter((x) => x.priceUsd === null).length} gaps expected; ${bad ? bad + ' FAILURES' : 'all fixtures consistent'}`);
process.exit(bad ? 1 : 0);
