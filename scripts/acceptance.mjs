// M0 placeholder: lists the acceptance scenarios from tests/acceptance/scenarios.json.
// The real runner arrives with M1 (case1) and grows each milestone; until a scenario has a runner it is reported as PENDING.
import { readFileSync } from 'node:fs';

const file = new URL('../tests/acceptance/scenarios.json', import.meta.url);
const { scenarios } = JSON.parse(readFileSync(file, 'utf8'));

console.log(`Darby acceptance scenarios (${scenarios.length}) — runners not implemented yet (placeholder, M0)\n`);
for (const s of scenarios) {
  const variants = (s.variants ?? []).map((v) => v.id).join(', ');
  console.log(`  PENDING  ${s.id.padEnd(9)} ${s.title}${variants ? `  [+ ${variants}]` : ''}`);
}
console.log('\n0 passed, 0 failed, ' + scenarios.length + ' pending');
