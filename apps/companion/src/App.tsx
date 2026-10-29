import { useEffect, useState } from 'react';
import { ApprovalCard, EvidenceDrawer, History, Lightbox, Memory, PlanList, Receipt, ReviewPanel, Timeline } from './parts';
import { useDarby, type Link, type RunDetail, type VerifyResult } from './useDarby';

const LINK_TEXT: Record<Link, string> = { connecting: 'connecting', up: 'connected', down: 'offline' };
const GOAL_EXAMPLE = 'Research the 10 AI startups on the fixture site, record name, lowest paid monthly price in USD and an evidence quote in a new sheet called Competitors, then share it with the team email.';
type Tab = 'run' | 'history' | 'memory';
type Tamper = { original: VerifyResult; tampered: VerifyResult; edit: { index: number; type: string } };

function Led({ name, link, detail }: { name: string; link: Link; detail?: string }) {
  return (
    <li className={`led led-${link}`} data-testid={`status-${name}`} title={`${name}: ${detail ?? LINK_TEXT[link]}`}>
      <span className="dot" aria-hidden="true" />
      <span className="led-name">{name}</span>
      <span className="led-val">{detail ?? LINK_TEXT[link]}</span>
    </li>
  );
}

const PHASE_TEXT: Record<string, string> = { planning: 'Planning…', running: 'Working in real tabs', paused: 'Paused — you have control of the browser', awaiting_approval: 'Waiting for your approval', finished: 'Finished', cancelled: 'Cancelled' };

export function App() {
  const d = useDarby();
  const [tab, setTab] = useState<Tab>('run');
  const [goal, setGoal] = useState('');
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [tamper, setTamper] = useState<Tamper | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [shot, setShot] = useState<string | null>(null);

  const run = d.run;
  const runId = run?.id ?? null;
  const hasReceipt = !!run?.receipt;
  const live = !!run && ['planning', 'running', 'paused', 'awaiting_approval'].includes(run.phase);
  const allUp = d.server === 'up' && d.socket === 'up' && d.echo === 'ok';

  // reset per-run UI state when the run changes
  useEffect(() => { setVerify(null); setTamper(null); setRemembered(false); setDrawer(null); setDetail(null); }, [runId]);
  // the green "chain valid" badge is computed by the server from the stored receipt, not assumed
  useEffect(() => { if (runId && hasReceipt) d.verify(runId).then(setVerify).catch(() => setVerify(null)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, hasReceipt]);
  // evidence rows / stored results for the drawer
  const isLaunch = !!run?.plan?.steps.some((s) => s.tool.startsWith('gtm.'));
  useEffect(() => { if (runId && (drawer || isLaunch)) d.detail(runId).then(setDetail).catch(() => undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, drawer, isLaunch, hasReceipt, run?.timeline.length]);

  const go = (t: Tab) => { setTab(t); if (t === 'history') void d.refreshHistory(); if (t === 'memory') void d.loadMemory(); };

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">✓</span>
          <div><h1>Darby</h1><p className="tagline">The AI-native browser where “done” means proven.</p></div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {(['run', 'history', 'memory'] as Tab[]).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => go(t)} aria-current={tab === t ? 'page' : undefined} data-testid={`tab-${t}`}>{t === 'run' ? 'Run' : t === 'history' ? 'History' : 'Memory'}</button>
          ))}
        </nav>
        <ul className="leds">
          <Led name="Server" link={d.server} />
          <Led name="Live channel" link={d.socket} />
          <Led name="Event round-trip" link={d.echo === 'ok' ? 'up' : d.echo === 'failed' ? 'down' : 'connecting'} detail={d.echo === 'ok' ? 'validated' : undefined} />
          {d.config && <Led name="Model" link="up" detail={d.config.llm.replayOnly ? 'REPLAY (recorded)' : `${d.config.llm.provider}/${d.config.llm.model}`} />}
        </ul>
      </header>
      <div data-testid="overall" className="sr">{allUp ? 'Connected to Darby server' : 'Waiting for server'}</div>

      {/* always-visible run controls */}
      {run && tab === 'run' && (
        <div className={`runbar phase-${run.phase}`} data-testid="runbar">
          <div className="runbar-text"><span className="eyebrow">{PHASE_TEXT[run.phase] ?? run.phase}</span><span className="runbar-goal" data-testid="run-goal">{run.goal || '…'}</span></div>
          <div className="row tight">
            {live && <button className="btn danger" onClick={() => void d.cancel(run.id)} data-testid="cancel-btn">Cancel</button>}
            {live && run.phase !== 'paused' && <button className="btn ghost" onClick={() => void d.takeover(run.id)} data-testid="takeover-btn">Take over</button>}
            {run.phase === 'paused' && <button className="btn primary" onClick={() => void d.resume(run.id)} data-testid="resume-btn">Resume</button>}
            {!live && <button className="btn ghost" onClick={() => { d.newRun(); setGoal(''); void d.refreshHistory(); }} data-testid="new-goal">New goal</button>}
          </div>
        </div>
      )}
      {run && tab === 'run' && <ApprovalCard run={run} onResolve={(s, ok) => void d.approve(run.id, s, ok)} onTakeover={() => void d.takeover(run.id)} />}

      {tab === 'run' && !run && (
        <main className="stack">
          <section className="card hero" aria-labelledby="goal-h">
            <h2 id="goal-h">What should Darby get done?</h2>
            <textarea data-testid="goal-box" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} placeholder="Describe your goal in plain language…" aria-label="Your goal" />
            <div className="row">
              <button className="btn primary" disabled={!allUp || goal.trim().length < 3} onClick={() => void d.start(goal.trim())} data-testid="run-btn">Plan &amp; run</button>
              <button className="btn ghost" onClick={() => setGoal(GOAL_EXAMPLE)}>Use the example goal</button>
              <span className="muted">Every step gets a proof; the run ends in a signed receipt.</span>
            </div>
            {d.error && <p className="error" role="alert">{d.error}</p>}
          </section>
          <History items={d.history.slice(0, 5)} onOpen={(id) => void d.open(id)} />
        </main>
      )}

      {tab === 'run' && run && (
        <main className="cols">
          <div className="col">
            <section className="card">
              <h2>Plan — a proof for every step <span className="muted small">(click a step for its evidence)</span></h2>
              <PlanList run={run} onOpen={setDrawer} active={drawer} />
            </section>
            {isLaunch && <ReviewPanel run={run} detail={detail} />}
            {run.receipt && (
              <Receipt run={run} verify={verify} tamper={tamper} remembered={remembered}
                onTamper={() => void d.verifyReceipt(run.id).then(setTamper)}
                onRemember={() => void d.remember(run.id).then(() => setRemembered(true))}
                onRepair={run.receipt.verdict === 'FAILED' ? () => void d.repair(run.id) : undefined} />
            )}
          </div>
          <div className="col">
            <section className="card">
              <h2>Live timeline</h2>
              <Timeline items={run.timeline} onShot={setShot} />
            </section>
          </div>
          {d.error && <p className="error" role="alert">{d.error}</p>}
        </main>
      )}

      {tab === 'history' && (<main className="stack"><History items={d.history} onOpen={(id) => { setTab('run'); void d.open(id); }} /></main>)}
      {tab === 'memory' && (<main className="stack"><Memory items={d.memory} onAdd={(k, v) => void d.addMemory(k, v)} onDelete={(id) => void d.deleteMemory(id)} /></main>)}

      {run && tab === 'run' && <EvidenceDrawer run={run} stepId={drawer} detail={detail} onClose={() => setDrawer(null)} onShot={setShot} />}
      <Lightbox src={shot} onClose={() => setShot(null)} />
    </div>
  );
}
