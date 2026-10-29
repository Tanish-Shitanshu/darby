import { createServer, type Server } from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { RunEvent } from '@darby/contracts';

export const SERVICE = 'darby-server';
export const VERSION = '0.1.0';

export interface DarbyServer {
  http: Server;
  wss: WebSocketServer;
  close(): Promise<void>;
}

/**
 * M0 server: GET /health and a WebSocket at /ws.
 * The socket validates every incoming message against the shared RunEvent contract and echoes valid ones back.
 * Invalid input is answered with {type:'error'}; it is never echoed, so nothing unvalidated crosses back to the UI.
 */
export function buildServer(): DarbyServer {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: SERVICE, version: VERSION, uptimeSec: Math.round(process.uptime()) });
  });

  const http = createServer(app);
  const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 1_000_000 });

  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      let json: unknown;
      try {
        json = JSON.parse(data.toString());
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'invalid JSON' }));
        return;
      }
      const parsed = RunEvent.safeParse(json);
      if (!parsed.success) {
        socket.send(JSON.stringify({ type: 'error', message: 'not a valid RunEvent', issues: parsed.error.issues.length }));
        return;
      }
      socket.send(JSON.stringify(parsed.data));
    });
  });

  return {
    http,
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        for (const c of wss.clients) c.terminate();
        wss.close(() => http.close(() => resolve()));
      }),
  };
}
