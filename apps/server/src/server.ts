import { createServer, type Server } from 'node:http';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { Command, RunEvent } from '@darby/contracts';
import { createApi } from './api';
import type { RunManager } from './runs/manager';

export const SERVICE = 'darby-server';
export const VERSION = '0.2.0';

export interface DarbyServer {
  http: Server;
  wss: WebSocketServer;
  close(): Promise<void>;
}

const send = (ws: WebSocket, v: unknown) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(v)); };

/**
 * GET /health, REST under /api (when a RunManager is given), and a WebSocket at /ws:
 *  - server -> client: every RunEvent of every run, as JSON
 *  - client -> server: a Command (run.start / run.cancel / run.takeover / run.resume / approval.resolve),
 *    or a RunEvent, which is echoed back to the sender only (connection check)
 * Everything is validated against the shared contracts; invalid input gets {type:'error'}.
 */
export function buildServer(manager?: RunManager): DarbyServer {
  const app = express();
  app.disable('x-powered-by');

  // Hosted copy only (both off by default): DARBY_BASIC_AUTH="user:password" puts a login in front of everything,
  // DARBY_STATIC_DIR serves the built companion (apps/companion/dist) from this same server.
  const basicAuth = process.env.DARBY_BASIC_AUTH ? `Basic ${Buffer.from(process.env.DARBY_BASIC_AUTH).toString('base64')}` : null;
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: SERVICE, version: VERSION, uptimeSec: Math.round(process.uptime()) });
  });
  if (basicAuth) {
    app.use((req, res, next) => {
      if (req.headers.authorization === basicAuth) return next();
      res.set('WWW-Authenticate', 'Basic realm="Darby"').status(401).send('Login required');
    });
  }
  if (manager) app.use('/api', createApi(manager));
  // Hosted copy: viewers cannot reach the server's own localhost:4010, so the test pages shown in the lab are passed through at /fx.
  if (manager && process.env.DARBY_FIXTURE_PROXY === '1') {
    const base = manager.deps.cfg.fixtureBase.replace(/\/$/, '');
    app.get('/fx/*path', async (req, res) => {
      try {
        const r = await fetch(`${base}${req.url.slice('/fx'.length)}`, { redirect: 'manual' });
        res.status(r.status).type(r.headers.get('content-type') ?? 'text/html').send(Buffer.from(await r.arrayBuffer()));
      } catch { res.status(502).send('test page unavailable'); }
    });
  }
  const staticDir = process.env.DARBY_STATIC_DIR;
  if (staticDir) app.use(express.static(staticDir));

  const http = createServer(app);
  const wss = new WebSocketServer({
    server: http,
    path: '/ws',
    maxPayload: 1_000_000,
    verifyClient: basicAuth ? (info: { req: { headers: { authorization?: string } } }) => info.req.headers.authorization === basicAuth : undefined,
  });

  const unsubscribe = manager?.deps.bus.subscribe((ev) => {
    const msg = JSON.stringify(ev);
    for (const c of wss.clients) if (c.readyState === c.OPEN) c.send(msg);
  });

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      let json: unknown;
      try {
        json = JSON.parse(data.toString());
      } catch {
        return send(socket, { type: 'error', message: 'invalid JSON' });
      }
      const cmd = Command.safeParse(json);
      if (cmd.success) {
        if (!manager) return send(socket, { type: 'error', message: 'commands are not available on this server' });
        void handleCommand(manager, cmd.data).catch(() => send(socket, { type: 'error', message: 'command failed' }));
        return;
      }
      const ev = RunEvent.safeParse(json);
      if (ev.success) return send(socket, ev.data); // connection check: echo to the sender only
      send(socket, { type: 'error', message: 'not a valid Command or RunEvent', issues: ev.error.issues.length });
    });
  });

  return {
    http,
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        unsubscribe?.();
        for (const c of wss.clients) c.terminate();
        wss.close(() => http.close(() => resolve()));
      }),
  };
}

async function handleCommand(m: RunManager, c: Command): Promise<void> {
  switch (c.type) {
    case 'run.start': await m.start(c.goal, { mode: c.mode }); return;
    case 'run.cancel': m.cancel(c.runId); return;
    case 'run.takeover': await m.takeover(c.runId); return;
    case 'run.resume': m.resume(c.runId); return;
    case 'approval.resolve': m.resolveApproval(c.runId, c.stepId, c.approved); return;
  }
}
