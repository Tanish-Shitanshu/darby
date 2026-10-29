// npm run verify-receipt -- <receipt-bundle.json>
// Recomputes every hash in the ledger chain and the Ed25519 signature. Exit code 0 = VALID, 1 = INVALID.
import { readFileSync } from 'node:fs';
import { verifyBundle } from '../apps/server/src/ledger/receipt';

const file = process.argv[2];
if (!file) {
  console.error('usage: npm run verify-receipt -- <receipt-bundle.json>   (download it from the receipt page or GET /api/runs/:id/receipt)');
  process.exit(2);
}
let json: unknown;
try {
  json = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`cannot read ${file}: ${(e as Error).message}`);
  process.exit(2);
}
const v = verifyBundle(json);
for (const c of v.checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name.padEnd(14)} ${c.detail}`);
const r = (json as any)?.receipt;
if (r?.verdict) console.log(`\nverdict: ${r.verdict}${r.labels?.length ? ` [${r.labels.join(', ')}]` : ''}  ·  run ${r.runId}  ·  gaps: ${(r.gaps ?? []).join(', ') || 'none'}  ·  blocked attempts: ${(r.blocked ?? []).length}`);
console.log(v.valid ? '\nVALID ✓' : '\nINVALID ✗');
process.exit(v.valid ? 0 : 1);
