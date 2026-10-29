import { useEffect, useRef, useState } from 'react';
import { ApprovalCard, EvidenceDrawer, History, Hub, Lightbox, Memory, PlanList, Receipt, ReviewPanel, Timeline } from './parts';
import { useDarby, type Link, type RunDetail, type VerifyResult } from './useDarby';

const LINK_TEXT: Record<Link, string> = { connecting: 'connecting', up: 'connected', down: 'offline' };
import demoGoals from '../../../fixtures/demo-goals.json';
const EXAMPLES = Object.values(demoGoals) as { label: string; goal: string }[];
type Tab = 'run' | 'history' | 'memory' | 'hub';
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
  const [pageUrl, setPageUrl] = useState('');
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const recRef = useRef<any>(null);
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setNote('Voice input needs Chrome or Edge (speech recognition is not available in this browser). Type the goal instead.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (ev: any) => { const said = String(ev.results[0][0].transcript).trim(); setGoal((g) => (g ? `${g} ${said}` : said)); setNote('Heard you. Check the text, then press Plan & run.'); };
    rec.onerror = (ev: any) => setNote(`Voice input stopped (${ev.error}). Type the goal instead.`);
    rec.onend = () => setListening(false);
    recRef.current = rec; setListening(true); setNote(''); rec.start();
  };
  const attachShot = async (file?: File) => {
    if (!file) return;
    if (file.size > 4_000_000) { setNote('That image is over 4 MB. Use a smaller screenshot.'); return; }
    setNote('Reading the screenshot…');
    const dataUrl = await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.readAsDataURL(file); });
    try {
      const res = await fetch('/api/describe-image', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataUrl }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message ?? j?.message ?? 'The screenshot could not be read.');
      setGoal((g) => `${g ? g + '\n' : ''}[From my screenshot: ${j.description}]`);
      setNote('Screenshot described below. Edit the text if it is wrong, then press Plan & run.');
    } catch (e) { setNote(`${(e as Error).message} Type the goal instead.`); }
  };
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
  const total = run?.plan?.steps.length ?? 0;
  const doneN = run ? Object.values(run.steps).filter((s) => ['passed', 'passed_with_gaps', 'failed', 'blocked', 'cancelled'].includes(s.status)).length : 0;

  // reset per-run UI state when the run changes
  useEffect(() => { setVerify(null); setTamper(null); setRemembered(false); setDrawer(null); setDetail(null); }, [runId]);
  // the green "chain valid" badge is computed by the server from the stored receipt, not assumed
  useEffect(() => { if (runId && hasReceipt) d.verify(runId).then(setVerify).catch(() => setVerify(null)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, hasReceipt]);
  // evidence rows / stored results for the drawer
  const isLaunch = !!run?.plan?.steps.some((s) => s.tool.startsWith('gtm.'));
  useEffect(() => { if (runId && (drawer || isLaunch)) d.detail(runId).then(setDetail).catch(() => undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, drawer, isLaunch, hasReceipt, run?.timeline.length]);

  const go = (t: Tab) => { setTab(t); if (t === 'history') void d.refreshHistory(); if (t === 'memory') void d.loadMemory(); if (t === 'hub') void d.loadPlaybooks(); };

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" /><path d="M8.5 12.2l2.4 2.4 4.6-4.9" /></svg></span>
          <div><h1>Darby</h1><p className="tagline">“Done” means proven.</p></div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {(['run', 'history', 'memory', 'hub'] as Tab[]).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => go(t)} aria-current={tab === t ? 'page' : undefined} data-testid={`tab-${t}`}>{t === 'run' ? 'Run' : t === 'history' ? 'History' : t === 'memory' ? 'Memory' : 'Hub'}</button>
          ))}
        </nav>
        <details className={`status ${allUp ? 'ok' : d.server === 'down' ? 'bad' : ''}`}>
          <summary aria-label="System status"><span className="pulse" aria-hidden="true" />{allUp ? (d.config?.llm.replayOnly ? 'Ready · offline replay' : 'Ready · live model') : d.server === 'down' ? 'Server offline' : 'Connecting…'}</summary>
        <ul className="leds">
          <Led name="Server" link={d.server} />
          <Led name="Live updates" link={d.socket} />
          <Led name="Self-check" link={d.echo === 'ok' ? 'up' : d.echo === 'failed' ? 'down' : 'connecting'} detail={d.echo === 'ok' ? 'validated' : undefined} />
          {d.config && <Led name="Model" link="up" detail={d.config.llm.replayOnly ? 'REPLAY (recorded)' : `${d.config.llm.provider}/${d.config.llm.model}`} />}
        </ul>
        </details>
      </header>
      <div data-testid="overall" className="sr">{allUp ? 'Connected to Darby server' : 'Waiting for server'}</div>

      {/* always-visible run controls */}
      {run && tab === 'run' && (
        <div className={`runbar phase-${run.phase}`} data-testid="runbar">
          <span className="progress" style={{ width: `${total ? Math.round((doneN / total) * 100) : run.phase === 'planning' ? 4 : 0}%` }} aria-hidden="true" />
          <div className="runbar-text"><span className="eyebrow">{run.phase === 'planning' || run.phase === 'running' ? <span className="spinner" aria-hidden="true" /> : null}{PHASE_TEXT[run.phase] ?? run.phase}{total > 0 ? ` · ${doneN} of ${total} steps` : ''}</span><span className="runbar-goal" data-testid="run-goal">{run.goal || '…'}</span></div>
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
          <section className="lede" aria-label="What Darby is">
            <h2>Delegate web work. <em>Get proof,</em> not promises.</h2>
            <p>Darby plans the job, does it in real browser tabs, then independently re-checks every claim and hands you a signed receipt with an honest verdict.</p>
          </section>
          <section className="card hero" aria-labelledby="goal-h">
            <h2 id="goal-h">What should Darby get done?</h2>
            <textarea data-testid="goal-box" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} placeholder="Describe your goal in plain language…" aria-label="Your goal" />
            <div className="row">
              <button className="btn primary" disabled={!allUp || goal.trim().length < 3} onClick={() => void d.start(pageUrl.trim() ? `${goal.trim()}
(Work on this page: ${pageUrl.trim()})` : goal.trim())} data-testid="run-btn">Plan &amp; run</button>
              <button className={`btn ghost${listening ? ' on' : ''}`} onClick={toggleVoice} data-testid="voice-btn" aria-pressed={listening} title="Speak your goal (Chrome speech recognition, needs internet)">{listening ? '● Listening… stop' : '🎤 Speak'}</button>
              <label className="btn ghost" data-testid="shot-btn" title="Attach a screenshot: the vision model describes it into the goal box for you to edit">
                📎 Screenshot<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void attachShot(e.target.files?.[0])} />
              </label>
              <span className="muted">Every step gets a proof; the run ends in a signed receipt.</span>
            </div>
            {note && <p className="muted small" role="status" data-testid="input-note">{note}</p>}
            <label className="ctx"><span className="muted small">Page context (optional): the page Darby should start from</span>
              <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder={d.config?.allowedOrigins?.[0] ? `${d.config.allowedOrigins[0]}/startups/acme-ai` : 'https://…'} aria-label="Page to work on" data-testid="page-context" inputMode="url" />
              <span className="muted small">{d.config?.allowedOrigins?.length ? `Darby may only read: ${d.config.allowedOrigins.join(', ')}. Anything else is blocked by policy.` : ''}</span>
            </label>
            <div className="row examples" aria-label="Example goals"><span className="muted small">Try an example:</span>
              {EXAMPLES.map((x) => (<button key={x.label} className="btn ghost" onClick={() => setGoal(x.goal)} data-testid={`example-${x.label.slice(0, 6).replace(/\W/g, '').toLowerCase()}`}>{x.label}</button>))}
            </div>
            {d.error && <p className="error" role="alert">{d.error}</p>}
          </section>
          <ul className="trust" aria-label="What you can rely on">
            <li><b>Proof per step</b>Every step names what would prove it</li>
            <li><b>Isolated reader</b>Web pages never reach the planner</li>
            <li><b>You approve</b>Sends, shares and posts always wait</li>
            <li><b>Signed receipt</b>Tamper-evident, verifiable by anyone</li>
          </ul>
          <section className="how" aria-label="How Darby works">
            <ol>
              <li><span className="how-n">1</span><div><strong>Plans with proof</strong><p>Every step names what would prove it, before anything runs.</p></div></li>
              <li><span className="how-n">2</span><div><strong>Works in real tabs</strong><p>Pages are read by an isolated reader. Risky steps wait for you.</p></div></li>
              <li><span className="how-n">3</span><div><strong>Checks itself, then shows the receipt</strong><p>An independent verifier re-reads the result. You get a signed, tamper-evident verdict.</p></div></li>
            </ol>
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
                onRepair={run.receipt.verdict === 'FAILED' ? () => void d.repair(run.id) : undefined}
                onSavePlaybook={(name) => d.savePlaybook(run.id, name)} onOpenHub={() => go('hub')} />
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
      {tab === 'hub' && (<main className="stack"><Hub items={d.playbooks} busy={live} onRun={(slug, params) => void d.runPlaybook(slug, params).then((ok) => ok && setTab('run'))} />{d.error && <p className="error" role="alert">{d.error}</p>}</main>)}
      {tab === 'memory' && (<main className="stack"><Memory items={d.memory} onAdd={(k, v) => void d.addMemory(k, v)} onDelete={(id) => void d.deleteMemory(id)} /></main>)}

      {run && tab === 'run' && <EvidenceDrawer run={run} stepId={drawer} detail={detail} onClose={() => setDrawer(null)} onShot={setShot} />}
      <Lightbox src={shot} onClose={() => setShot(null)} />
      <footer className="footer">
        <span><strong>Darby</strong> · runs on your computer; your files and receipts stay here.</span>
        <span>{d.config ? `Receipts signed with key ${String(d.config.signerFingerprint).slice(0, 12)}…` : ''} · <a href="https://github.com/Tanish-Shitanshu/darby" target="_blank" rel="noreferrer">Source</a></span>
      </footer>
    </div>
  );
}
