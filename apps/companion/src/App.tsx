import { useState } from 'react';
import { useConnection, type Link } from './useConnection';

const LABEL: Record<Link, string> = { connecting: 'Connecting…', up: 'Connected', down: 'Offline' };

function Status({ name, link, detail }: { name: string; link: Link; detail?: string }) {
  return (
    <li className={`status status-${link}`} data-testid={`status-${name}`}>
      <span className="dot" aria-hidden="true" />
      <span className="status-name">{name}</span>
      <span className="status-value">{detail ?? LABEL[link]}</span>
    </li>
  );
}

export function App() {
  const conn = useConnection();
  const [goal, setGoal] = useState('');
  const echoLink: Link = conn.echo === 'ok' ? 'up' : conn.echo === 'failed' ? 'down' : 'connecting';
  const allUp = conn.server === 'up' && conn.socket === 'up' && conn.echo === 'ok';

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Darby</h1>
          <p className="tagline">The AI-native browser where “done” means proven.</p>
        </div>
        <div className={`badge ${allUp ? 'badge-ok' : 'badge-wait'}`} data-testid="overall">
          {allUp ? '● Connected to Darby server' : '○ Waiting for server…'}
        </div>
      </header>

      <main className="panel">
        <section aria-labelledby="goal-h">
          <h2 id="goal-h">What should Darby get done?</h2>
          <textarea
            data-testid="goal-box"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={5}
            placeholder="Describe your goal in plain language, e.g. “Research the 10 AI startups on the fixture site and put their prices in a new sheet.”"
          />
          <div className="actions">
            <button type="button" disabled data-testid="run-btn">Plan &amp; run</button>
            <span className="hint">Planning and execution arrive in M1. Every step will carry a proof, and the run ends in a signed receipt.</span>
          </div>
        </section>

        <section aria-labelledby="conn-h">
          <h2 id="conn-h">Connection</h2>
          <ul className="statuses">
            <Status name="Server (HTTP :4000)" link={conn.server} detail={conn.server === 'up' ? `OK · v${conn.version ?? '?'}` : undefined} />
            <Status name="Live channel (WebSocket)" link={conn.socket} />
            <Status name="Event round-trip" link={echoLink} detail={conn.echo === 'ok' ? 'RunEvent echoed & validated' : conn.echo === 'failed' ? 'Echo mismatch' : 'Checking…'} />
          </ul>
        </section>
      </main>
    </div>
  );
}
