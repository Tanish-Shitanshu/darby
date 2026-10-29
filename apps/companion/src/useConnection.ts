import { useEffect, useState } from 'react';
import { RunEvent } from '@darby/contracts';

export type Link = 'connecting' | 'up' | 'down';
export interface Connection {
  /** HTTP /health reachable */
  server: Link;
  /** WebSocket open */
  socket: Link;
  /** A RunEvent sent over the socket came back validated and unchanged */
  echo: 'pending' | 'ok' | 'failed';
  version?: string;
}

const PING: RunEvent = { type: 'run.started', runId: 'm0-ping', goal: 'connection check' };

/** Tracks server health (polled) and the live WebSocket channel (auto-reconnect). M0 only: later milestones stream real RunEvents here. */
export function useConnection(): Connection {
  const [state, setState] = useState<Connection>({ server: 'connecting', socket: 'connecting', echo: 'pending' });

  // health polling
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch('/health');
        const body = (await res.json()) as { ok?: boolean; version?: string };
        if (!stop) setState((s) => ({ ...s, server: body.ok ? 'up' : 'down', version: body.version }));
      } catch {
        if (!stop) setState((s) => ({ ...s, server: 'down' }));
      }
    };
    void poll();
    const t = setInterval(poll, 4000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  // websocket with reconnect
  useEffect(() => {
    let stop = false;
    let ws: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        setState((s) => ({ ...s, socket: 'up', echo: 'pending' }));
        ws!.send(JSON.stringify(PING));
      };
      ws.onmessage = (m) => {
        const parsed = RunEvent.safeParse(safeJson(String(m.data)));
        const ok = parsed.success && parsed.data.type === 'run.started' && parsed.data.runId === PING.runId;
        setState((s) => ({ ...s, echo: ok ? 'ok' : 'failed' }));
      };
      ws.onclose = () => {
        setState((s) => ({ ...s, socket: 'down', echo: 'pending' }));
        if (!stop) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      stop = true;
      clearTimeout(retry);
      if (!ws) return;
      ws.onmessage = ws.onclose = ws.onerror = null;
      // Closing a socket that is still handshaking logs a browser warning (seen with StrictMode's dev double-mount); wait for it to open first.
      if (ws.readyState === WebSocket.CONNECTING) { const s = ws; s.onopen = () => s.close(); } else ws.close();
    };
  }, []);

  return state;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return undefined; }
}
