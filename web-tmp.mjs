const goal = process.argv[2];
const r = await fetch('http://localhost:4000/api/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal }) });
const { id } = await r.json(); console.log('run', id);
for (let i = 0; i < 90; i++) {
  await new Promise(r => setTimeout(r, 4000));
  const run = await (await fetch(`http://localhost:4000/api/runs/${id}`)).json();
  if (['finished', 'cancelled'].includes(run.status)) { console.log(run.status, run.verdict, run.receipt?.cause ?? ''); console.log(JSON.stringify(run.receipt?.steps?.map(s => `${s.status}: ${s.title} :: ${s.evidenceSummary}`.slice(0, 200)), null, 1)); console.log('gaps', run.receipt?.gaps); break; }
  if (run.status === 'awaiting_approval') console.log('awaiting approval at poll', i);
}
