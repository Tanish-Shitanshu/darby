import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApprovalCard, EvidenceDrawer, History, Hub, Lightbox, Memory, PlanList, Receipt, ReviewPanel, Timeline } from './parts';
import { Icon, ResultHero, SheetPreview } from './extras';
import { useDarby, type Link, type RunDetail, type VerifyResult } from './useDarby';
import demoGoals from '../../../fixtures/demo-goals.json';

const LINK_TEXT: Record<Link, string> = { connecting: 'connecting', up: 'connected', down: 'offline' };
type Tab = 'run' | 'history' | 'memory' | 'hub';
type Tamper = { original: VerifyResult; tampered: VerifyResult; edit: { index: number; type: string } };
const GOALS = demoGoals as Record<string, { label: string; goal: string }>;
const WEB_GOAL = 'Research the top 5 AI startups and write their name, lowest paid monthly price in USD and an evidence quote in an Excel sheet called Top AI Startups.';

const CODE_GOAL = 'Fix the failing tests in the sample app and prove the fix by running the tests again.';

const SUGGESTIONS: { testid: string; icon: ReactNode; title: string; text: string; tag: string; tone: string; goal: string }[] = [
  { testid: 'example-case1', icon: Icon.sheet, title: 'Research into a spreadsheet', text: 'Reads 10 startup pages, writes prices with exact quotes to a sheet, shares it only after you approve.', tag: 'Verified, with gaps flagged', tone: 'teal', goal: GOALS.case1?.goal ?? '' },
  { testid: 'example-web', icon: Icon.globe, title: 'Research the open web', text: 'Searches the live web for top AI startups and puts their pricing in an Excel sheet you can download.', tag: 'Live web · read-only', tone: 'green', goal: WEB_GOAL },
  { testid: 'example-case3', icon: Icon.rocket, title: 'Launch assets', text: 'Copy, hero image, voiceover, teaser video and a landing page that Darby tests itself.', tag: 'Pull request waits for you', tone: 'blue', goal: GOALS.case3?.goal ?? '' },
  { testid: 'example-case6', icon: Icon.code, title: 'Fix a failing test', text: 'Runs a project\'s tests, lets the coder model fix the bug, and proves it by running the tests again.', tag: 'Verifier runs the tests itself', tone: 'amber', goal: GOALS.case6?.goal ?? CODE_GOAL },
  { testid: 'example-case4', icon: Icon.form, title: 'A form that lies', text: 'A page says "Saved ✓" but stores nothing. Darby catches it, reports FAILED, then repairs it.', tag: 'Fails honestly, then fixed', tone: 'red', goal: GOALS.case4?.goal ?? '' },
];

function Led({ name, link, detail }: { name: string; link: Link; detail?: string }) {
  return (
    <li className={`led led-${link}`} data-testid={`status-${name}`} title={`${name}: ${detail ?? LINK_TEXT[link]}`}>
      <span className="dot" aria-hidden="true" />
      <span className="led-name">{name}</span>
      <span className="led-val">{detail ?? LINK_TEXT[link]}</span>
    </li>
  );
}

const PHASE_TEXT: Record<string, string> = { planning: 'Planning', running: 'Working in real tabs', paused: 'Paused: you have control', awaiting_approval: 'Waiting for your approval', finished: 'Finished', cancelled: 'Cancelled' };

export function App() {
  const d = useDarby();
  const [tab, setTab] = useState<Tab>('run');
  const [goal, setGoal] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [showPage, setShowPage] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const recRef = useRef<any>(null);
  const toggleVoiceBrowser = () => {
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
  const mediaRef = useRef<MediaRecorder | null>(null);
  /** Record with the microphone, let the server transcribe it (works in any browser); fall back to the browser's own speech recognition. */
  const toggleVoice = async () => {
    if (listening) { mediaRef.current?.stop(); recRef.current?.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toggleVoiceBrowser(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setListening(false);
        if (!chunks.length) { setNote('No sound was recorded. Try again, or type the goal.'); return; }
        setNote('Transcribing…');
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const audio = await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1] ?? ''); fr.readAsDataURL(blob); });
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio, mime: blob.type }) });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.error?.message ?? j?.message ?? 'The recording could not be transcribed.');
          if (!j.transcript) { setNote('No speech was heard. Try again, or type the goal.'); return; }
          setGoal((g) => (g ? `${g} ${j.transcript}` : j.transcript));
          setNote('Transcribed. Check the text, then press Plan & run.');
        } catch (e) { setNote(`${(e as Error).message} Type the goal instead.`); }
      };
      rec.start(); setListening(true); setNote('Recording… press the button again to stop (it stops by itself after 60 s).');
      setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 60_000);
    } catch { toggleVoiceBrowser(); }
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
      setNote('Screenshot described in the box. Edit the text if it is wrong, then press Plan & run.');
    } catch (e) { setNote(`${(e as Error).message} Type the goal instead.`); }
  };
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [tamper, setTamper] = useState<Tamper | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [rtab, setRtab] = useState<'activity' | 'result'>('activity');

  const run = d.run;
  const runId = run?.id ?? null;
  const hasReceipt = !!run?.receipt;
  const live = !!run && ['planning', 'running', 'paused', 'awaiting_approval'].includes(run.phase);
  const allUp = d.server === 'up' && d.socket === 'up' && d.echo === 'ok';
  const total = run?.plan?.steps.length ?? 0;
  const doneN = run ? Object.values(run.steps).filter((s) => ['passed', 'passed_with_gaps', 'failed', 'blocked', 'cancelled'].includes(s.status)).length : 0;

  // reset per-run UI state when the run changes
  useEffect(() => { setVerify(null); setTamper(null); setRemembered(false); setDrawer(null); setDetail(null); setRtab('activity'); }, [runId]);
  // the receipt is the point of a run: show it as soon as it exists
  useEffect(() => { if (hasReceipt) setRtab('result'); }, [hasReceipt, runId]);
  // the green "chain valid" badge is computed by the server from the stored receipt, not assumed
  useEffect(() => { if (runId && hasReceipt) d.verify(runId).then(setVerify).catch(() => setVerify(null)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, hasReceipt]);
  // evidence rows / stored results for the drawer
  const isLaunch = !!run?.plan?.steps.some((s) => s.tool.startsWith('gtm.'));
  useEffect(() => { if (runId && (drawer || isLaunch)) d.detail(runId).then(setDetail).catch(() => undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, drawer, isLaunch, hasReceipt, run?.timeline.length]);

  const go = (t: Tab) => { setTab(t); if (t === 'history') void d.refreshHistory(); if (t === 'memory') void d.loadMemory(); if (t === 'hub') void d.loadPlaybooks(); };
  const submit = () => { if (allUp && goal.trim().length >= 3) void d.start(pageUrl.trim() ? `${goal.trim()}\n(Work on this page: ${pageUrl.trim()})` : goal.trim()); };
  const status = allUp ? (d.config?.llm.replayOnly ? 'Ready · offline replay' : 'Ready · live model') : d.server === 'down' ? 'Server offline' : 'Connecting…';

  const NAV: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'run', label: run && tab === 'run' ? 'Current task' : 'New task', icon: Icon.run },
    { id: 'history', label: 'History', icon: Icon.history },
    { id: 'memory', label: 'Memory', icon: Icon.memory },
    { id: 'hub', label: 'Playbooks', icon: Icon.hub },
  ];

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo" aria-hidden="true">{Icon.shield}</span>
          <div><h1>Darby</h1><p className="tagline">“Done” means proven</p></div>
        </div>
        <nav className="nav" aria-label="Sections">
          {NAV.map((n) => (
            <button key={n.id} className={`navbtn ${tab === n.id ? 'on' : ''}`} onClick={() => go(n.id)} aria-current={tab === n.id ? 'page' : undefined} data-testid={`tab-${n.id}`}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </nav>
        <details className={`status ${allUp ? 'ok' : d.server === 'down' ? 'bad' : ''}`}>
          <summary aria-label="System status"><span className="pulse" aria-hidden="true" />{status}</summary>
          <ul className="leds">
            <Led name="Server" link={d.server} />
            <Led name="Live updates" link={d.socket} />
            <Led name="Self-check" link={d.echo === 'ok' ? 'up' : d.echo === 'failed' ? 'down' : 'connecting'} detail={d.echo === 'ok' ? 'validated' : undefined} />
            {d.config && <Led name="Model" link="up" detail={d.config.llm.replayOnly ? 'REPLAY (recorded)' : `${d.config.llm.provider}/${d.config.llm.model}`} />}
          </ul>
        </details>
        <p className="side-foot">Runs on your computer. Receipts signed with key {d.config ? String(d.config.signerFingerprint).slice(0, 10) : '…'} · <a href="https://github.com/Tanish-Shitanshu/darby" target="_blank" rel="noreferrer">Source</a></p>
      </aside>

      <div className="content">
        <div data-testid="overall" className="sr">{allUp ? 'Connected to Darby server' : 'Waiting for server'}</div>

        {run && tab === 'run' && (
          <header className={`runhead phase-${run.phase}`} data-testid="runbar">
            <span className="progress" style={{ width: `${total ? Math.round((doneN / total) * 100) : run.phase === 'planning' ? 4 : 0}%` }} aria-hidden="true" />
            <div className="runhead-text">
              <span className="eyebrow">{run.phase === 'planning' || run.phase === 'running' ? <span className="spinner" aria-hidden="true" /> : null}{PHASE_TEXT[run.phase] ?? run.phase}{total > 0 ? ` · ${doneN} of ${total} steps` : ''}</span>
              <span className="runhead-goal" data-testid="run-goal" title={run.goal}>{run.goal || '…'}</span>
            </div>
            <div className="row tight">
              {live && <button className="btn danger" onClick={() => void d.cancel(run.id)} data-testid="cancel-btn">Cancel</button>}
              {live && run.phase !== 'paused' && <button className="btn ghost" onClick={() => void d.takeover(run.id)} data-testid="takeover-btn">Take over</button>}
              {run.phase === 'paused' && <button className="btn primary" onClick={() => void d.resume(run.id)} data-testid="resume-btn">Resume</button>}
              {!live && <button className="btn ghost" onClick={() => { d.newRun(); setGoal(''); void d.refreshHistory(); }} data-testid="new-goal">{Icon.arrow} New task</button>}
            </div>
          </header>
        )}
        {run && tab === 'run' && <ApprovalCard run={run} onResolve={(s, ok) => void d.approve(run.id, s, ok)} onTakeover={() => void d.takeover(run.id)} />}

        {tab === 'run' && !run && (
          <main className="home">
            <section className="lede" aria-label="What Darby is">
              <p className="kicker">Your AI browser workspace</p>
              <h2>Delegate web work. <em>Get proof,</em> not promises.</h2>
              <p>Darby plans the job, does it in real browser tabs, re-checks every claim on its own, and hands you a signed receipt with an honest verdict.</p>
            </section>

            <section className="composer card" aria-labelledby="goal-h">
              <h2 id="goal-h" className="sr">What should Darby get done?</h2>
              <textarea data-testid="goal-box" value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
                rows={3} placeholder="Describe what you want done, e.g. “Research the top 5 AI startups and put their prices in a spreadsheet”" aria-label="Your goal" />
              {showPage && (
                <label className="ctx"><span className="muted small">Start from this page (optional)</span>
                  <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder={d.config?.allowedOrigins?.[0] ? `${d.config.allowedOrigins[0]}/startups/acme-ai` : 'https://…'} aria-label="Page to work on" data-testid="page-context" inputMode="url" />
                  <span className="muted small">{d.config?.allowedOrigins?.length ? `Pages outside ${d.config.allowedOrigins.join(', ')} can only be reached through a web search.` : ''}</span>
                </label>
              )}
              <div className="composer-bar">
                <div className="tools">
                  <button className={`iconbtn${listening ? ' on' : ''}`} onClick={toggleVoice} data-testid="voice-btn" aria-pressed={listening} title="Speak your goal (Chrome speech recognition, needs internet)">{Icon.mic}<span>{listening ? 'Listening… stop' : 'Speak'}</span></button>
                  <label className="iconbtn" data-testid="shot-btn" title="Attach a screenshot: the vision model describes it into the box for you to edit">
                    {Icon.image}<span>Screenshot</span><input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void attachShot(e.target.files?.[0])} />
                  </label>
                  <button className={`iconbtn${showPage ? ' on' : ''}`} onClick={() => setShowPage((v) => !v)} aria-pressed={showPage} title="Choose the page Darby starts from">{Icon.link}<span>Page</span></button>
                </div>
                <div className="go">
                  <span className="hint">Ctrl + Enter</span>
                  <button className="btn primary big" disabled={!allUp || goal.trim().length < 3} onClick={submit} data-testid="run-btn">Plan &amp; run {Icon.arrow}</button>
                </div>
              </div>
              {note && <p className="muted small note" role="status" data-testid="input-note">{note}</p>}
              {d.error && <p className="error" role="alert">{d.error}</p>}
            </section>

            <section aria-label="Try an example">
              <h3 className="sec">Try an example</h3>
              <div className="sugg-grid">
                {SUGGESTIONS.map((x) => (
                  <button key={x.testid} className={`sugg tone-${x.tone}`} onClick={() => setGoal(x.goal)} data-testid={x.testid}>
                    <span className="sugg-icon">{x.icon}</span>
                    <strong>{x.title}</strong>
                    <span className="sugg-text">{x.text}</span>
                    <span className="sugg-tag">{x.tag}</span>
                  </button>
                ))}
              </div>
            </section>

            <ul className="trust" aria-label="What you can rely on">
              <li>{Icon.check}<div><b>Proof for every step</b>Each step names what would prove it.</div></li>
              <li>{Icon.shield}<div><b>Pages stay in quarantine</b>Web text never reaches the planner.</div></li>
              <li>{Icon.lock}<div><b>You approve what matters</b>Sends, shares and posts always wait.</div></li>
              <li>{Icon.sheet}<div><b>Signed receipt</b>Tamper-evident and verifiable by anyone.</div></li>
            </ul>

            <History items={d.history.slice(0, 5)} onOpen={(id) => void d.open(id)} />
          </main>
        )}

        {tab === 'run' && run && (
          <main className="run-grid">
            <aside className="plan-col card" aria-label="Plan">
              <h2>Plan <span className="muted small">a proof for every step</span></h2>
              <PlanList run={run} onOpen={setDrawer} active={drawer} />
            </aside>
            <section className="main-col">
              <div className="rtabs" role="tablist" aria-label="Run views">
                <button role="tab" aria-selected={rtab === 'activity'} className={rtab === 'activity' ? 'on' : ''} onClick={() => setRtab('activity')} data-testid="rtab-activity">Live activity</button>
                <button role="tab" aria-selected={rtab === 'result'} className={rtab === 'result' ? 'on' : ''} onClick={() => setRtab('result')} disabled={!run.receipt} data-testid="rtab-result">Result &amp; receipt</button>
              </div>
              <div hidden={rtab !== 'activity'}>
                <section className="card">
                  <h2>Live timeline</h2>
                  <Timeline items={run.timeline} onShot={setShot} />
                </section>
              </div>
              <div hidden={rtab !== 'result'} className="stack">
                {run.receipt && <ResultHero run={run} />}
                {run.receipt && <SheetPreview run={run} />}
                {isLaunch && <ReviewPanel run={run} detail={detail} />}
                {run.receipt && (
                  <Receipt run={run} verify={verify} tamper={tamper} remembered={remembered}
                    onTamper={() => void d.verifyReceipt(run.id).then(setTamper)}
                    onRemember={() => void d.remember(run.id).then(() => setRemembered(true))}
                    onRepair={run.receipt.verdict === 'FAILED' ? () => void d.repair(run.id) : undefined}
                    onSavePlaybook={(name) => d.savePlaybook(run.id, name)} onOpenHub={() => go('hub')} />
                )}
              </div>
              {d.error && <p className="error" role="alert">{d.error}</p>}
            </section>
          </main>
        )}

        {tab === 'history' && (<main className="page"><PageHead title="History" sub="Every task Darby has run, with its receipt." /><History items={d.history} onOpen={(id) => { setTab('run'); void d.open(id); }} /></main>)}
        {tab === 'hub' && (<main className="page"><PageHead title="Playbooks" sub="Verified runs saved as re-runnable skills." /><Hub items={d.playbooks} busy={live} onRun={(slug, params) => void d.runPlaybook(slug, params).then((ok) => ok && setTab('run'))} />{d.error && <p className="error" role="alert">{d.error}</p>}</main>)}
        {tab === 'memory' && (<main className="page"><PageHead title="Memory" sub="Preferences you control. View, add and delete." /><Memory items={d.memory} onAdd={(k, v) => void d.addMemory(k, v)} onDelete={(id) => void d.deleteMemory(id)} /></main>)}

        {run && tab === 'run' && <EvidenceDrawer run={run} stepId={drawer} detail={detail} onClose={() => setDrawer(null)} onShot={setShot} />}
        <Lightbox src={shot} onClose={() => setShot(null)} />
      </div>
    </div>
  );
}

function PageHead({ title, sub }: { title: string; sub: string }) {
  return <div className="pagehead"><h2>{title}</h2><p className="muted">{sub}</p></div>;
}
