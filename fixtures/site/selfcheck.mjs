// Verifies the fixtures match ground truth. Run with the fixture server up: node fixtures/site/selfcheck.mjs
import { startups, injection, redteam, canary } from './data.mjs';
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
// Canary pages: each carries its order and a visible price; none may load the beacon by itself (that would trip it on a plain page view); the control carries no order.
const host = new URL(base).host;
for (const c of canary) {
  const html = await (await fetch(`${base}/canary/${c.slug}`)).text();
  const t = text(html);
  const visiblePrice = t.includes(c.quote) || html.includes(c.quote);
  const hasTag = html.includes(`[CN-${c.n}]`);
  const needsBeacon = !!c.payload && c.payload.includes('{BEACON}');
  const carried = c.payload === null ? !/\[CN-\d\]/.test(html) : hasTag && (!needsBeacon || html.includes(`http://${host}/beacon/c${c.n}`)) && (!c.phrase || html.includes(c.phrase));
  const autoFetch = /(?:src|href|action|data|poster|srcset)\s*=\s*["'][^"']*beacon/i.test(html) || /url\([^)]*beacon/i.test(html) || /@import[^;]*beacon/i.test(html) || /<(?:img|script|link|iframe|embed|object|video|audio|source)\b/i.test(html);
  if (!carried || !visiblePrice || autoFetch) { bad++; console.log('FAIL', c.slug, { carried, visiblePrice, autoFetch }); } else console.log('ok  ', c.slug, `(canary: ${c.technique})`);
}
// The beacon records a visit and a reset clears it. Only run this round trip on a server that holds no state, so it can never wipe a live demo.
const held = (await Promise.all(['/api/beacon', '/api/leads', '/api/outbox'].map(async (p) => (await (await fetch(base + p)).json()).length))).reduce((a, b) => a + b, 0);
if (held > 0) console.log('skip beacon round trip (the server holds state; use `npm run fixtures:check`, which boots its own)');
else {
  const hit = await fetch(`${base}/beacon/selfcheck-x?a=1`);
  const logged = await (await fetch(`${base}/api/beacon`)).json();
  const viewer = await (await fetch(`${base}/app/beacon`)).text();
  await fetch(`${base}/api/reset`, { method: 'POST' });
  const cleared = await (await fetch(`${base}/api/beacon`)).json();
  const ok = hit.status === 200 && logged.length === 1 && logged[0].id === 'selfcheck-x' && logged[0].query === '?a=1' && /1 hit/.test(viewer) && cleared.length === 0;
  if (!ok) { bad++; console.log('FAIL beacon round trip', { status: hit.status, logged: logged.length, cleared: cleared.length }); } else console.log('ok   beacon records a visit, viewer shows it, reset clears it');
}
const truth =startups.map(({ slug, name, priceUsd, quote }) => ({ slug, name, url: `/startups/${slug}`, priceUsd, quote }));
console.log(`\n${truth.filter((x) => x.priceUsd === null).length} gaps expected; ${bad ? bad + ' FAILURES' : 'all fixtures consistent'}`);
process.exit(bad ? 1 : 0);
