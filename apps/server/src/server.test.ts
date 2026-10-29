import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import { buildServer, SERVICE, type DarbyServer } from './server';

let srv: DarbyServer;
let port: number;

beforeAll(async () => {
  srv = buildServer();
  await new Promise<void>((r) => srv.http.listen(0, r));
  port = (srv.http.address() as AddressInfo).port;
});
afterAll(async () => {
  await srv.close();
});

function exchange(payload: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    ws.on('open', () => ws.send(payload));
    ws.on('message', (d) => {
      ws.close();
      resolve(JSON.parse(d.toString()));
    });
    ws.on('error', reject);
  });
}

describe('server', () => {
  it('GET /health reports ok', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe(SERVICE);
  });

  it('echoes a valid RunEvent', async () => {
    const event = { type: 'run.started', runId: 'r1', goal: 'hello' };
    expect(await exchange(JSON.stringify(event))).toEqual(event);
  });

  it('rejects a message that is not a RunEvent', async () => {
    const reply = (await exchange(JSON.stringify({ type: 'run.started', runId: 5 }))) as { type: string };
    expect(reply.type).toBe('error');
  });

  it('rejects invalid JSON', async () => {
    const reply = (await exchange('{not json')) as { type: string };
    expect(reply.type).toBe('error');
  });
});
