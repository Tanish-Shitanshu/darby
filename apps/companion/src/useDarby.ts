import { useCallback, useEffect, useRef, useState } from 'react';
import { RunEvent } from '@darby/contracts';
import { applyEvent, foldEvents, type RunView } from './state';

export type Link = 'connecting' | 'up' | 'down';
export interface RunSummary { id: string; goal: string; status: string; verdict: string | null; labels: string[]; repairOf: string | null; createdAt: string; blocked: number }
export interface AppConfig { llm: { provider: string; model: string; replayOnly: boolean }; headless: boolean; teamEmail: string; signerFingerprint: string }
export interface MemoryItem { id: string; key: string; value: string; sourceRunId: string | null; createdAt: string }
export interface EvidenceRow { id: number; stepId: string | null; kind: string; path: string; sha256: string; bytes: number }
export interface RunDetail { evidence: EvidenceRow[]; steps: { stepId: string; result: Record<string, unknown> | null; args: Record<string, unknown> }[]; approvals: { stepId: string; status: string; contentHash: string; summary: string }[] }
export interface VerifyResult { valid: boolean; checks: { name: string; ok: boolean; detail: string }[]; signerFingerprint?: string }

const PING: RunEvent = { type: 'run.started', runId: 'm0-ping', goal: 'connection check' };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}

export function useDarby() {
  const [server, setServer] = useState<Link>('connecting');
  const [socket, setSocket] = useState<Link>('connecting');
  const [echo, setEcho] = useState<'pending' | 'ok' | 'failed'>('pending');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [runs, setRuns] = useState<Record<string, RunView>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const starting = useRef(false);
  const liveBuf = useRef<Record<string, RunEvent[]>>({}); // every live event since page load, per run (capped)
  const currentRef = useRef<string | null>(null);
  currentRef.current = currentId;

  const refreshHistory = useCallback(async () => {
    try { setHistory(await call<RunSummary[]>('/api/runs')); } catch { /* server down: shown in status */ }
  }, []);

  // health + config polling
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch('/health');
        const ok = ((await res.json()) as { ok?: boolean }).ok;
        if (!stop) setServer(ok ? 'up' : 'down');
        if (ok && !stop) setConfig((c) => c ?? null);
      } catch { if (!stop) setServer('down'); }
    };
    void poll();
    const t = setInterval(poll, 4000);
    return () => { stop = true; clearInterval(t); };
  }, []);
  useEffect(() => {
    if (server === 'up') { call<AppConfig>('/api/config').then(setConfig).catch(() => undefined); void refreshHistory(); }
  }, [server, refreshHistory]);

  // websocket: live RunEvents
  useEffect(() => {
    let stop = false;
    let ws: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.onopen = () => { setSocket('up'); setEcho('pending'); ws!.send(JSON.stringify(PING)); };
      ws.onmessage = (m) => {
        let json: unknown;
        try { json = JSON.parse(String(m.data)); } catch { return; }
        const ev = RunEvent.safeParse(json);
        if (!ev.success) return;
        if (ev.data.runId === PING.runId) { setEcho('ok'); return; }
        const e = json as RunEvent; // validated above; keep the original so signed extras on the receipt (labels, cause, llm) survive zod's key stripping
        (liveBuf.current[e.runId] ??= []).push(e);
        if (liveBuf.current[e.runId]!.length > 3000) liveBuf.current[e.runId]!.shift();
        setRuns((r) => ({ ...r, [e.runId]: applyEvent(r[e.runId], e) }));
        if (e.type === 'run.started' && starting.current && !currentRef.current) { setCurrentId(e.runId); starting.current = false; }
        if (e.type === 'receipt.sealed' || e.type === 'run.started') void refreshHistory();
      };
      ws.onclose = () => { setSocket('down'); setEcho('pending'); if (!stop) retry = setTimeout(connect, 1500); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      stop = true;
      clearTimeout(retry);
      if (!ws) return;
      ws.onmessage = ws.onclose = ws.onerror = null;
      if (ws.readyState === WebSocket.CONNECTING) { const s = ws; s.onopen = () => s.close(); } else ws.close();
    };
  }, [refreshHistory]);

  const start = useCallback(async (goal: string) => {
    setError(null);
    starting.current = true;
    setCurrentId(null);
    try {
      const { id } = await call<{ id: string }>('/api/runs', { method: 'POST', body: JSON.stringify({ goal }) });
      starting.current = false;
      setCurrentId(id);
      setRuns((r) => (r[id] ? r : { ...r, [id]: foldEvents(id, []) }));
    } catch (e) { starting.current = false; setError((e as Error).message); }
  }, []);

  const open = useCallback(async (id: string) => {
    setError(null);
    setCurrentId(id);
    try {
      const d = await call<{ events: RunEvent[] }>(`/api/runs/${id}`);
      // history snapshot + any live event that arrived while we were fetching and is not in the snapshot (compared by content)
      const have = new Set(d.events.map((e) => JSON.stringify(e)));
      const newer = (liveBuf.current[id] ?? []).filter((e) => !have.has(JSON.stringify(e)));
      setRuns((r) => ({ ...r, [id]: newer.reduce((v, e) => applyEvent(v, e), foldEvents(id, d.events)) }));
    } catch (e) { setError((e as Error).message); }
  }, []);

  const loadMemory = useCallback(async () => {
    try { setMemory(await call<MemoryItem[]>('/api/memory')); } catch { /* shown via status */ }
  }, []);
  useEffect(() => { if (server === 'up') void loadMemory(); }, [server, loadMemory]);

  const act = useCallback(async (path: string, body?: unknown) => {
    try { await call(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }); } catch (e) { setError((e as Error).message); }
  }, []);

  return {
    server, socket, echo, config, history, error, currentId,
    run: currentId ? runs[currentId] ?? null : null,
    memory, loadMemory,
    addMemory: async (key: string, value: string) => { try { await call('/api/memory', { method: 'POST', body: JSON.stringify({ key, value }) }); await loadMemory(); } catch (e) { setError((e as Error).message); } },
    deleteMemory: async (id: string) => { try { await call(`/api/memory/${id}`, { method: 'DELETE' }); await loadMemory(); } catch (e) { setError((e as Error).message); } },
    remember: async (id: string) => { try { await call(`/api/runs/${id}/remember`, { method: 'POST' }); await loadMemory(); } catch (e) { setError((e as Error).message); } },
    detail: (id: string) => call<RunDetail>(`/api/runs/${id}`),
    verify: (id: string) => call<VerifyResult>(`/api/runs/${id}/verify`),
    start, open, refreshHistory,
    newRun: () => { setCurrentId(null); setError(null); },
    cancel: (id: string) => act(`/api/runs/${id}/cancel`),
    takeover: (id: string) => act(`/api/runs/${id}/takeover`),
    resume: (id: string) => act(`/api/runs/${id}/resume`),
    approve: (id: string, stepId: string, approved: boolean) => act(`/api/runs/${id}/approvals/${stepId}`, { approved }),
    verifyReceipt: (id: string) => call<{ original: VerifyResult; tampered: VerifyResult; edit: { index: number; type: string; before: string; after: string } }>(`/api/runs/${id}/tamper-test`, { method: 'POST' }),
  };
}
