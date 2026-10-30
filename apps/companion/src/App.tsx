import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApprovalCard, EvidenceDrawer, History, Hub, Lightbox, Memory, PlanList, Receipt, ReviewPanel, Timeline } from './parts';
import { Icon, ResultHero, SheetPreview } from './extras';
import { Buddy, useBuddyLine, type BuddyMode } from './buddy';
import { DepthField, useDepthEffects } from './depth';
import { SummaryCard, useSpeaker, useVoiceConfig } from './voice';
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
  const voiceCfg = useVoiceConfig();
  const speaker = useSpeaker();
  const [lang, setLang] = useState('auto');
  const [voiceReplies, setVoiceReplies] = useState(() => { try { return localStorage.getItem('darby.voiceReplies') !== 'off'; } catch { return true; } });
  const [runMeta, setRunMeta] = useState<Record<string, { lang: string; voice: boolean }>>({});
  const setReplies = (on: boolean) => { setVoiceReplies(on); if (!on) speaker.stop(); try { localStorage.setItem('darby.voiceReplies', on ? 'on' : 'off'); } catch { /* storage unavailable */ } };
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [talkLang, setTalkLang] = useState('en-IN');   // language of the latest spoken or typed request: the companion answers in it
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
        setTranscribing(true);
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const audio = await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1] ?? ''); fr.readAsDataURL(blob); });
        try {
          const res = await fetch('/api/voice/transcribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio, mime: blob.type }) });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.error?.message ?? j?.message ?? 'The recording could not be transcribed.');
          if (!j.transcript) { setNote('No speech was heard. Try again, or type the goal.'); return; }
          const spoken = j.languageName && j.languageName !== 'English' ? ` (${j.languageName})` : '';
          if (voiceReplies) {   // voice chat: the spoken request runs straight away and Darby answers aloud when it is done
            setGoal(j.transcript);
            if (j.language) setTalkLang(j.language);
            setNote(`Heard${spoken}: “${j.transcript}”${j.english && j.english !== j.transcript ? ` → understood as: “${j.english}”` : ''}. Working on it…`);
            void submit({ goal: j.transcript, lang: j.language, voice: true });
          } else {
            setGoal((g) => (g ? `${g} ${j.transcript}` : j.transcript));
            setNote(`Heard${spoken}: “${j.transcript}”. Check the text, then press Plan & run.`);
            if (j.language && j.language !== 'en-IN') setLang(j.language);
          }
        } catch (e) { setNote(`${(e as Error).message} Type the goal instead.`); }
        finally { setTranscribing(false); }
      };
      rec.start(); setListening(true); setNote('Recording… press the button again to stop (it stops by itself after 28 s).');
      setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 28_000);
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
  const [lost, setLost] = useState<string | null>(null);

  const run = d.run;
  const runId = run?.id ?? null;
  const hasReceipt = !!run?.receipt;
  const live = !!run && ['planning', 'running', 'paused', 'awaiting_approval'].includes(run.phase);
  const allUp = d.server === 'up' && d.socket === 'up' && d.echo === 'ok';
  const total = run?.plan?.steps.length ?? 0;
  const doneN = run ? Object.values(run.steps).filter((s) => ['passed', 'passed_with_gaps', 'failed', 'blocked', 'cancelled'].includes(s.status)).length : 0;

  // a run whose server was restarted would otherwise look "stuck" forever: notice it and offer to start again
  useEffect(() => {
    if (!run || !live) return;
    const t = setInterval(async () => {
      try {
        const st = (await (await fetch(`/api/runs/${run.id}`)).json())?.run?.status;
        if (st && !['planning', 'running', 'paused', 'awaiting_approval'].includes(st) && !run.receipt) setLost(run.id);
      } catch { /* server unreachable: the status light already says so */ }
    }, 4000);
    return () => clearInterval(t);
  }, [run?.id, live, run?.receipt]);

  // a run that has shown no progress for 90 s (not counting waits for you) gets a plain notice with a way out
  const [stalled, setStalled] = useState(false);
  const lastMove = useRef(Date.now());
  useEffect(() => { lastMove.current = Date.now(); setStalled(false); }, [runId, run?.timeline.length, run?.phase]);
  useEffect(() => {
    if (!live || run?.phase === 'awaiting_approval' || run?.phase === 'paused') { setStalled(false); return; }
    const t = setInterval(() => setStalled(Date.now() - lastMove.current > 90_000), 5000);
    return () => clearInterval(t);
  }, [live, run?.phase]);

  // reset per-run UI state when the run changes
  useEffect(() => { setVerify(null); setTamper(null); setRemembered(false); setDrawer(null); setDetail(null); setRtab('activity'); }, [runId]);
  // the receipt is the point of a run: show it as soon as it exists
  useEffect(() => { if (hasReceipt) setRtab('result'); }, [hasReceipt, runId]);
  // the green "chain valid" badge is computed by the server from the stored receipt, not assumed
  useEffect(() => { if (runId && hasReceipt) d.verify(runId).then(setVerify).catch(() => setVerify(null)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, hasReceipt]);
  // evidence rows / stored results for the drawer
  const isLaunch = !!run?.plan?.steps.some((s) => s.tool.startsWith('gtm.'));
  useEffect(() => { if (runId && (drawer || isLaunch)) d.detail(runId).then(setDetail).catch(() => undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [runId, drawer, isLaunch, hasReceipt, run?.timeline.length]);

  const voiceRun = !!(run && runMeta[run.id]?.voice);
  const buddyMode: BuddyMode | null = listening ? 'listening' : transcribing ? 'thinking' : speaker.speaking ? 'speaking'
    : voiceRun && run?.phase === 'awaiting_approval' ? 'attention' : voiceRun && live ? 'working' : null;
  const buddyLine = useBuddyLine(buddyMode, talkLang);

  useDepthEffects(`${tab}|${runId ?? ''}|${hasReceipt ? 'r' : ''}`);

  const go = (t: Tab) => { setTab(t); if (t === 'history') void d.refreshHistory(); if (t === 'memory') void d.loadMemory(); if (t === 'hub') void d.loadPlaybooks(); };
  const submit = async (o?: { goal: string; lang: string; voice: boolean }) => {
    const g = (o?.goal ?? goal).trim();
    if (!allUp || g.length < 3) return;
    const useLang = o?.lang ?? lang;
    const r = await d.start(!o && pageUrl.trim() ? `${g}\n(Work on this page: ${pageUrl.trim()})` : g, useLang);
    if (r) {
      const runLang = useLang === 'auto' ? r.language : useLang;   // typed non-English goals: the server reports the language it detected
      setRunMeta((m) => ({ ...m, [r.id]: { lang: runLang, voice: !!o?.voice } }));
      setTalkLang(runLang);
    }
  };
  const status = allUp ? (d.config?.llm.replayOnly ? 'Ready · offline replay' : 'Ready · live model') : d.server === 'down' ? 'Server offline' : 'Connecting…';

  const NAV: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'run', label: run && tab === 'run' ? 'Current task' : 'New task', icon: Icon.run },
    { id: 'history', label: 'History', icon: Icon.history },
    { id: 'memory', label: 'Memory', icon: Icon.memory },
    { id: 'hub', label: 'Playbooks', icon: Icon.hub },
  ];

  return (
    <div className="app">
      <DepthField />
      <aside className="side">
        <div className="brand">
          <span className="logo" aria-hidden="true"><img src="/darby-logo.svg" alt="" width="38" height="38" /></span>
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
        {run && tab === 'run' && lost === run.id && !run.receipt && (
          <div className="banner" role="alert" data-testid="run-lost">
            <b>This run stopped before it finished.</b> Darby was restarted while it was working, so nothing more will happen for it.
            <button className="btn primary" onClick={() => { const g = run.goal; setLost(null); d.newRun(); void submit({ goal: g, lang: 'en-IN', voice: false }); }}>Run it again</button>
          </div>
        )}
        {run && tab === 'run' && live && stalled && lost !== run.id && (
          <div className="banner" role="status" data-testid="run-stalled">
            <b>This is taking longer than usual.</b> No progress for 90 seconds. A slow web page or a busy model is the usual reason, and Darby gives up on its own after a few minutes. You can wait, or cancel and try again.
            <button className="btn danger" onClick={() => void d.cancel(run.id)}>Cancel this run</button>
          </div>
        )}
        {run && tab === 'run' && <ApprovalCard run={run} onResolve={(s, ok) => void d.approve(run.id, s, ok)} onTakeover={() => void d.takeover(run.id)} />}

        {tab === 'run' && !run && (
          <main className="home">
            <div className="hero-glow" aria-hidden="true" />
            <section className="lede" aria-label="What Darby is" data-reveal>
              <p className="kicker">The AI-native browser workspace</p>
              <h2>Work done. <em>Proven</em> by Darby.</h2>
              <p>Darby plans the job, does it in real browser tabs, re-checks every claim on its own, and hands you a signed receipt with an honest verdict.</p>
            </section>

            <section className="composer card" aria-labelledby="goal-h" data-reveal>
              <h2 id="goal-h" className="sr">What should Darby get done?</h2>
              <textarea data-testid="goal-box" value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submit(); } }}
                rows={3} placeholder="Describe what you want done, e.g. “Research the top 5 AI startups and put their prices in a spreadsheet”" aria-label="Your goal" />
              {showPage && (
                <label className="ctx"><span className="muted small">Start from this page (optional)</span>
                  <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder={d.config?.allowedOrigins?.[0] ? `${d.config.allowedOrigins[0]}/startups/acme-ai` : 'https://…'} aria-label="Page to work on" data-testid="page-context" inputMode="url" />
                  <span className="muted small">{d.config?.allowedOrigins?.length ? `Pages outside ${d.config.allowedOrigins.join(', ')} can only be reached through a web search.` : ''}</span>
                </label>
              )}
              <div className="composer-bar">
                <div className="tools">
                  <button className={`iconbtn${listening ? ' on' : ''}`} onClick={toggleVoice} data-testid="voice-btn" aria-pressed={listening} title="Speak your goal in any Indian language or English">{Icon.mic}<span>{listening ? 'Listening… stop' : 'Speak'}</span></button>
                  <label className="iconbtn" data-testid="shot-btn" title="Attach a screenshot: the vision model describes it into the box for you to edit">
                    {Icon.image}<span>Screenshot</span><input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void attachShot(e.target.files?.[0])} />
                  </label>
                  <button className={`iconbtn${showPage ? ' on' : ''}`} onClick={() => setShowPage((v) => !v)} aria-pressed={showPage} title="Choose the page Darby starts from">{Icon.link}<span>Page</span></button>
                  <label className="selectwrap" title="Language you will speak or type. Auto-detect works for voice.">
                    <span className="sr">Language</span>
                    <select value={lang} onChange={(e) => setLang(e.target.value)} data-testid="lang-select" aria-label="Language">
                      <option value="auto">Auto</option>
                      {voiceCfg.languages.map((l) => <option key={l.code} value={l.code}>{l.native === l.name ? l.name : `${l.name} · ${l.native}`}</option>)}
                    </select>
                  </label>
                  <button className={`iconbtn${voiceReplies ? ' on' : ''}`} onClick={() => setReplies(!voiceReplies)} aria-pressed={voiceReplies} data-testid="voice-replies" title="When you talk to Darby, it talks back and runs your request at once. Turn off to get text only.">{Icon.speaker}<span>{voiceReplies ? 'Voice chat on' : 'Voice chat off'}</span></button>
                </div>
                <div className="go">
                  <button className="btn primary big" disabled={!allUp || goal.trim().length < 3} onClick={() => void submit()} data-testid="run-btn" title="Ctrl + Enter">Plan &amp; run {Icon.arrow}</button>
                </div>
              </div>
              {note && <p className="muted small note" role="status" data-testid="input-note">{note}</p>}
              {d.error && <p className="error" role="alert">{d.error}</p>}
            </section>

            <p className="langs" aria-label="Languages you can speak or type" data-reveal><b>Speak or type in</b>{voiceCfg.languages.slice(1, 9).map((l) => <span key={l.code}>{l.native}</span>)}<span>English</span></p>

            <section aria-label="Try an example">
              <h3 className="sec">Try an example</h3>
              <div className="sugg-grid">
                {SUGGESTIONS.map((x) => (
                  <button key={x.testid} className={`sugg tone-${x.tone}`} onClick={() => setGoal(x.goal)} data-testid={x.testid} data-reveal data-tilt>
                    <span className="sugg-icon">{x.icon}</span>
                    <strong>{x.title}</strong>
                    <span className="sugg-text">{x.text}</span>
                    <span className="sugg-tag">{x.tag}</span>
                  </button>
                ))}
              </div>
            </section>

            <ul className="trust" aria-label="What you can rely on" data-reveal>
              <li data-tilt>{Icon.check}<div><b>Proof for every step</b>Each step names what would prove it.</div></li>
              <li data-tilt>{Icon.shield}<div><b>Pages stay in quarantine</b>Web text never reaches the planner.</div></li>
              <li data-tilt>{Icon.lock}<div><b>You approve what matters</b>Sends, shares and posts always wait.</div></li>
              <li data-tilt>{Icon.sheet}<div><b>Signed receipt</b>Tamper-evident and verifiable by anyone.</div></li>
            </ul>

            <History items={d.history.slice(0, 5)} onOpen={(id) => void d.open(id)} />
          </main>
        )}

        {tab === 'run' && run && (
          <main className="run-grid">
            <aside className="plan-col card" aria-label="Plan">
              <h2>Plan <span className="muted small">a proof for every step</span></h2>
              <PlanList run={run} onOpen={(id) => setDrawer((cur) => (cur === id ? null : id))} active={drawer} />
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
                {run.receipt && <SummaryCard runId={run.id} lang={runMeta[run.id]?.lang ?? 'en-IN'} sarvam={voiceCfg.sarvam} autoSpeak={voiceReplies && !!runMeta[run.id]?.voice} speaker={speaker} />}
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

        {tab === 'history' && (<main className="page"><PageHead title="History" sub="Every task Darby has run, with its receipt." icon={Icon.history} stats={[{ n: d.history.length, label: 'tasks' }, { n: d.history.filter((h) => h.verdict === 'VERIFIED' || h.verdict === 'VERIFIED_WITH_GAPS').length, label: 'proven', tone: 'good' }, { n: d.history.filter((h) => h.verdict === 'NEEDS_YOU' || h.verdict === 'FAILED').length, label: 'need a look', tone: 'warn' }]} /><History items={d.history} onOpen={(id) => { setTab('run'); void d.open(id); }} /></main>)}
        {tab === 'hub' && (<main className="page"><PageHead title="Playbooks" sub="Verified runs saved as re-runnable skills." icon={Icon.hub} stats={[{ n: d.playbooks.length, label: 'saved recipes' }]} /><Hub items={d.playbooks} busy={live} onRun={(slug, params) => void d.runPlaybook(slug, params).then((ok) => ok && setTab('run'))} />{d.error && <p className="error" role="alert">{d.error}</p>}</main>)}
        {tab === 'memory' && (<main className="page"><PageHead title="Memory" sub="Preferences you control. View, add and delete." icon={Icon.memory} stats={[{ n: d.memory.length, label: 'notes' }]} /><Memory items={d.memory} onAdd={(k, v) => void d.addMemory(k, v)} onDelete={(id) => void d.deleteMemory(id)} /></main>)}

        {run && tab === 'run' && <EvidenceDrawer run={run} stepId={drawer} detail={detail} onClose={() => setDrawer(null)} onShot={setShot} />}
                <Lightbox src={shot} onClose={() => setShot(null)} />
        <Buddy mode={buddyMode} line={buddyLine} speech={speaker.text} onStop={speaker.stop} />
        {!(tab === 'run' && !run) && (
          <button className={`voice-fab${listening ? ' on' : ''}`} onClick={toggleVoice} disabled={transcribing} data-testid="voice-fab" aria-pressed={listening} title="Talk to Darby in your language">
            {Icon.mic}<span>{listening ? 'Listening… tap to send' : 'Talk to Darby'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PageHead({ title, sub, icon, stats }: { title: string; sub: string; icon?: ReactNode; stats?: { n: number | string; label: string; tone?: string }[] }) {
  return (
    <div className="pagehead" data-reveal>
      {icon && <span className="ph-ico" aria-hidden="true">{icon}</span>}
      <div className="ph-text"><h2>{title}</h2><p className="muted">{sub}</p></div>
      {stats && <ul className="ph-stats" aria-label="At a glance">{stats.map((x) => <li key={x.label} className={x.tone ?? ''}><b>{x.n}</b><span>{x.label}</span></li>)}</ul>}
    </div>
  );
}
