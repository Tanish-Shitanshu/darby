import { useEffect, useState, type ReactNode } from 'react';
import type { RunView } from './state';

/* ---------- icons (inline SVG, inherit colour) ---------- */
const I = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const Icon = {
  run: <I><path d="M5 3l14 9-14 9V3z" /></I>,
  history: <I><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>,
  memory: <I><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></I>,
  hub: <I><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>,
  sheet: <I><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></I>,
  shield: <I><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" /><path d="M8.5 12.2l2.4 2.4 4.6-4.9" /></I>,
  rocket: <I><path d="M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5M14 4c4 0 6 2 6 6-2.5 3.5-6 6-9 7l-4-4c1-3 3.5-6.5 7-9z" /><circle cx="15" cy="9" r="1.4" /></I>,
  form: <I><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></I>,
  globe: <I><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></I>,
  mic: <I size={17}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></I>,
  image: <I size={17}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></I>,
  link: <I size={17}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></I>,
  download: <I size={17}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></I>,
  check: <I size={16}><path d="M5 12.5l4.2 4.2L19 7" /></I>,
  x: <I size={16}><path d="M6 6l12 12M18 6L6 18" /></I>,
  clock: <I size={16}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.5 1.5" /></I>,
  lock: <I size={16}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></I>,
  arrow: <I size={16}><path d="M5 12h14M13 6l6 6-6 6" /></I>,
};

/* ---------- result summary: the first thing you read when a run ends ---------- */
const VERDICT_COPY: Record<string, { title: string; tone: string }> = {
  VERIFIED: { title: 'Done, and proven', tone: 'good' },
  VERIFIED_WITH_GAPS: { title: 'Done, with gaps listed', tone: 'teal' },
  FAILED: { title: 'This did not work', tone: 'bad' },
  NEEDS_YOU: { title: 'Needs you', tone: 'blue' },
};

export function ResultHero({ run }: { run: RunView }) {
  const r = run.receipt;
  if (!r) return null;
  const copy = VERDICT_COPY[r.verdict] ?? { title: r.verdict, tone: 'good' };
  const proven = r.steps.filter((s) => s.status === 'passed' || s.status === 'passed_with_gaps').length;
  const hasSheet = !!run.plan?.steps.some((s) => s.tool === 'sheet.write');
  const lines: Record<string, string> = {
    VERIFIED: 'Every step was checked independently and passed.',
    VERIFIED_WITH_GAPS: `${r.gaps.length} item${r.gaps.length === 1 ? '' : 's'} could not be confirmed. They are marked, never guessed.`,
    FAILED: r.cause ?? 'A check failed. Nothing was claimed without proof.',
    NEEDS_YOU: r.cause ?? 'A step is waiting for your decision.',
  };
  return (
    <section className={`result-hero tone-${copy.tone}`} aria-label="Result" data-testid="result-hero">
      <div className="result-main">
        <span className="result-icon" aria-hidden="true">{r.verdict === 'FAILED' ? Icon.x : r.verdict === 'NEEDS_YOU' ? Icon.clock : Icon.check}</span>
        <div>
          <h2>{copy.title}</h2>
          <p>{lines[r.verdict]}</p>
        </div>
      </div>
      <ul className="metrics" aria-label="Summary">
        <li><b>{proven}<small>/{r.steps.length}</small></b><span>steps proven</span></li>
        <li className={r.gaps.length ? 'warn' : ''}><b>{r.gaps.length}</b><span>gaps flagged</span></li>
        <li className={r.blocked.length ? 'good' : ''}><b>{r.blocked.length}</b><span>attacks contained</span></li>
        <li><b>{r.llm ? (r.llm.liveCalls > 0 ? 'Live' : 'Replay') : '—'}</b><span>model</span></li>
      </ul>
      <div className="result-actions">
        {hasSheet && <a className="btn primary" href={`/api/runs/${run.id}/sheet.xlsx`} download data-testid="download-sheet">{Icon.download} Download spreadsheet (.xlsx)</a>}
      </div>
    </section>
  );
}

/* ---------- the spreadsheet itself, in the app ---------- */
export function SheetPreview({ run }: { run: RunView }) {
  const [data, setData] = useState<{ name: string; rows: string[][] } | null>(null);
  const has = !!run.receipt && !!run.plan?.steps.some((s) => s.tool === 'sheet.write');
  useEffect(() => {
    setData(null);
    if (!has) return;
    fetch(`/api/runs/${run.id}/sheet`).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null));
  }, [run.id, has]);
  if (!has || !data || data.rows.length < 2) return null;
  const [head, ...rows] = data.rows;
  return (
    <section className="card sheet" aria-label="Spreadsheet" data-testid="sheet-preview">
      <div className="card-head">
        <h2>{Icon.sheet} {data.name}.xlsx <span className="muted small">read back from the file on disk</span></h2>
        <a className="btn ghost" href={`/api/runs/${run.id}/sheet.xlsx`} download>{Icon.download} Download</a>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{head!.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>{head!.map((_, ci) => {
                const v = row[ci] ?? '';
                const gap = /^not found$/i.test(v);
                const url = /^https?:\/\//.test(v);
                return <td key={ci} className={gap ? 'cell-gap' : ''}>{gap ? <span className="chip gap">NOT FOUND</span> : url ? <a href={v} target="_blank" rel="noreferrer">{v.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42)}</a> : v}</td>;
              })}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
