import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './extras';

/* ---------- Sarvam voice + languages: config, speaker with a Stop button, and the spoken-summary card ---------- */
export interface VoiceLang { code: string; name: string; native: string; tts: boolean }
export interface VoiceConfig { sarvam: boolean; languages: VoiceLang[] }
export interface SummaryText { summary: string; highlights: string[] }
export interface RunSummary { english: SummaryText; local: SummaryText | null; lang: string; translated: boolean; polished: boolean }

export function useVoiceConfig(): VoiceConfig {
  const [cfg, setCfg] = useState<VoiceConfig>({ sarvam: false, languages: [{ code: 'en-IN', name: 'English', native: 'English', tts: true }] });
  useEffect(() => { fetch('/api/voice/config').then((r) => (r.ok ? r.json() : null)).then((c) => c && setCfg(c)).catch(() => undefined); }, []);
  return cfg;
}

/** One speaker for the whole app: Sarvam Bulbul audio when available, the browser's own voice otherwise. Stop works at any moment. */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current++;
    audio.current?.pause();
    audio.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, lang: string, sarvam: boolean) => {
    stop();
    const mine = ++token.current;
    setSpeaking(true);
    try {
      if (sarvam) {
        const res = await fetch('/api/voice/speak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang }) });
        if (res.ok) {
          const { audios } = (await res.json()) as { audios: string[] };
          for (const b64 of audios) {
            if (token.current !== mine) return;
            await new Promise<void>((done) => {
              const a = new Audio(`data:audio/wav;base64,${b64}`);
              audio.current = a;
              a.onended = () => done();
              a.onerror = () => done();
              a.play().catch(() => done());
            });
          }
          return;
        }
      }
      if (window.speechSynthesis) {   // fallback: the browser's own voice (best for English)
        await new Promise<void>((done) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang;
          u.onend = () => done();
          u.onerror = () => done();
          window.speechSynthesis.speak(u);
        });
      }
    } finally { if (token.current === mine) setSpeaking(false); }
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { speaking, speak, stop };
}

/** "What Darby did and what it found": the agentic ending of a task. Shown for every finished run; spoken when the task was a voice task. */
export function SummaryCard({ runId, lang, sarvam, autoSpeak, speaker }: { runId: string; lang: string; sarvam: boolean; autoSpeak: boolean; speaker: ReturnType<typeof useSpeaker> }) {
  const [s, setS] = useState<RunSummary | null>(null);
  const [err, setErr] = useState('');
  const [showEn, setShowEn] = useState(false);
  const spokenFor = useRef<string>('');
  useEffect(() => {
    setS(null); setErr('');
    fetch(`/api/runs/${runId}/summary?lang=${encodeURIComponent(lang)}`).then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({})))?.error?.message ?? 'No summary'))))
      .then(setS).catch((e) => setErr(String(e.message ?? e)));
  }, [runId, lang]);
  const shown = s?.local ?? s?.english ?? null;
  const spokenLang = s?.local ? lang : 'en-IN';
  const script = shown ? `${shown.summary} ${shown.highlights.join(' ')}` : '';
  useEffect(() => {
    if (shown && autoSpeak && spokenFor.current !== `${runId}|${lang}`) { spokenFor.current = `${runId}|${lang}`; void speaker.speak(script, spokenLang, sarvam); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, autoSpeak]);
  if (err) return null;
  if (!shown) return <section className="card summary" aria-busy="true"><p className="muted">Writing the summary…</p></section>;
  return (
    <section className="card summary" data-testid="summary-card" aria-label="Summary of what Darby did">
      <div className="card-head">
        <h2>{Icon.check} What Darby did and found</h2>
        <div className="row tight">
          {speaker.speaking
            ? <button className="btn danger" onClick={speaker.stop} data-testid="stop-speaking">Stop speaking</button>
            : <button className="btn ghost" onClick={() => void speaker.speak(script, spokenLang, sarvam)} data-testid="listen-btn">{Icon.mic} Listen</button>}
        </div>
      </div>
      <p className="summary-lead">{shown.summary}</p>
      <ul className="summary-points">{shown.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
      {s?.local && (
        <p className="small muted">
          <button className="linkbtn" onClick={() => setShowEn((v) => !v)}>{showEn ? 'Hide English' : 'Show English'}</button> · translated by Sarvam
          {showEn && <span className="summary-en"><br />{s.english.summary} {s.english.highlights.join(' ')}</span>}
        </p>
      )}
      {!s?.local && lang !== 'en-IN' && <p className="small muted">Showing English: add SARVAM_API_KEY to .env to get this summary in your language.</p>}
    </section>
  );
}
