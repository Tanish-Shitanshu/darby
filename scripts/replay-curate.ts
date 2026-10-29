// npm run replay:curate — copy the recorded LLM responses worth committing from .darby/replay to replay/llm/.
// Keeps the demo and the tests runnable from a clean clone without any API key. Refuses anything that looks like a secret.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getConfig } from '../apps/server/src/config';

const cfg = getConfig();
const src = cfg.replayRecordDir;
const dst = cfg.replayCuratedDir;
if (!existsSync(src)) { console.error(`nothing recorded yet in ${src}`); process.exit(1); }
mkdirSync(dst, { recursive: true });

const SECRET = /AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|PRIVATE KEY/;
let copied = 0, skipped = 0, already = 0;
const summary: Record<string, number> = {};
for (const f of readdirSync(src).filter((x) => x.endsWith('.json'))) {
  const text = readFileSync(path.join(src, f), 'utf8');
  const rec = JSON.parse(text) as { role: string; promptPreview: string; model: string };
  if (/connectivity check/.test(rec.promptPreview)) { skipped++; continue; }       // llm:ping recordings are not part of any case
  if (SECRET.test(text)) { console.error(`REFUSING ${f}: looks like it contains a secret`); process.exit(1); }
  if (existsSync(path.join(dst, f))) { already++; continue; }
  copyFileSync(path.join(src, f), path.join(dst, f));
  copied++;
  summary[rec.role] = (summary[rec.role] ?? 0) + 1;
}
const total = readdirSync(dst).filter((x) => x.endsWith('.json')).length;
writeFileSync(path.join(cfg.root, 'replay', 'README.md'), `# Recorded LLM responses (REPLAY)

${total} recordings of real model calls (planner, reader, vision) made while running the demo cases against the fixture web.
They contain no keys and no personal data: prompts are fixture page text and fixed instructions.

The replay provider (\`LLM_PROVIDER=replay\`) answers from these files by request hash, so the acceptance tests and the offline demo run
without any API key or network. Runs served this way are labelled **REPLAY** in the UI and in the signed receipt.

Add more with \`LLM_PROVIDER=gemini npm run test:acceptance -- --live\` followed by \`npm run replay:curate\`.
`);
console.log(`copied ${copied} new, ${already} already present, ${skipped} skipped (ping). replay/llm now has ${total} files.`, summary);
