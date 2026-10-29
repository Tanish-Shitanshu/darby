import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { LedgerEntry } from '@darby/contracts';
import type { Deps } from './executor/context';
import { verifyBundle, type ReceiptBundle, type SignedReceipt } from './ledger/receipt';
import { redactSecrets } from './llm/providers';
import { RepairError, type RunManager } from './runs/manager';

const StartBody = z.object({ goal: z.string().trim().min(3).max(2000), mode: z.enum(['fixture', 'live']).default('fixture') });
const ApprovalBody = z.object({ approved: z.boolean() });
const MemoryBody = z.object({ key: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(300) });

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

export function receiptBundle(deps: Deps, runId: string): ReceiptBundle | null {
  const run = deps.repo.getRun(runId);
  if (!run?.receipt) return null;
  return { format: 'darby-receipt-bundle/1', receipt: run.receipt as SignedReceipt, ledger: deps.repo.getLedger(runId) };
}

export function createApi(manager: RunManager): Router {
  const { deps } = manager;
  const { repo, cfg } = deps;
  const r = express.Router();
  r.use(express.json({ limit: '256kb' }));

  r.get('/config', (_req, res) => {
    res.json({
      llm: { provider: deps.llm.providerName, model: deps.llm.model, replayOnly: deps.llm.replayOnly },
      headless: cfg.headless,
      allowedOrigins: cfg.allowedOrigins,
      teamEmail: cfg.teamEmail,
      teamEmailConfigured: cfg.teamEmailConfigured,
      signerFingerprint: deps.signer.fingerprint,
    });
  });

  r.post('/runs', wrap(async (req, res) => {
    const body = StartBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'bad_request', 'Send {"goal": "<at least 3 characters>"}');
    const id = await manager.start(body.data.goal, { mode: body.data.mode });
    res.status(202).json({ id });
  }));

  r.get('/runs', (_req, res) => {
    res.json(repo.listRuns(100).map((x) => ({ id: x.id, goal: x.goal, status: x.status, verdict: x.verdict, labels: x.labels, repairOf: x.repairOf, createdAt: x.createdAt, finishedAt: x.finishedAt, blocked: x.receipt?.blocked?.length ?? 0 })));
  });

  r.get('/runs/:id', wrap((req, res) => {
    const run = repo.getRun(String(req.params.id));
    if (!run) throw new HttpError(404, 'not_found', 'No such run');
    res.json({
      run: { ...run, receipt: run.receipt },
      steps: repo.listSteps(run.id),
      events: repo.listEvents(run.id).map((e) => e.payload),
      approvals: repo.listApprovals(run.id),
      evidence: repo.listEvidence(run.id),
      active: manager.isActive(run.id),
    });
  }));

  r.get('/runs/:id/receipt', wrap((req, res) => {
    const bundle = receiptBundle(deps, String(req.params.id));
    if (!bundle) throw new HttpError(404, 'not_found', 'This run has no receipt yet');
    res.setHeader('content-disposition', `attachment; filename="receipt-${String(req.params.id)}.json"`);
    res.json(bundle);
  }));

  /** Recompute the hash chain + Ed25519 signature of this run's receipt (what the green "chain valid" badge shows). */
  r.get('/runs/:id/verify', wrap((req, res) => {
    const bundle = receiptBundle(deps, String(req.params.id));
    if (!bundle) throw new HttpError(404, 'not_found', 'This run has no receipt yet');
    res.json(verifyBundle(bundle));
  }));

  /** The UI's "tamper test": edit one entry in a COPY of the bundle and show the verifier rejecting it. The original is untouched. */
  r.post('/runs/:id/tamper-test', wrap((req, res) => {
    const bundle = receiptBundle(deps, String(req.params.id));
    if (!bundle) throw new HttpError(404, 'not_found', 'This run has no receipt yet');
    const original = verifyBundle(bundle);
    const copy: ReceiptBundle = JSON.parse(JSON.stringify(bundle));
    const target = copy.ledger.find((e: LedgerEntry) => e.type === 'step.evidence') ?? copy.ledger[Math.floor(copy.ledger.length / 2)]!;
    const before = JSON.stringify(target.payload).slice(0, 60);
    target.payload = { ...target.payload, tampered: 'edited after the fact' };
    const tampered = verifyBundle(copy);
    res.json({ original, tampered, edit: { index: target.index, type: target.type, before, after: 'added field "tampered"' } });
  }));

  r.get('/runs/:id/shots/:file', wrap((req, res) => {
    const file = path.basename(String(req.params.file));
    const root = path.join(cfg.runsDir, path.basename(String(req.params.id)), 'shots');
    if (!/\.(png|jpe?g)$/i.test(file) || !existsSync(path.join(root, file))) throw new HttpError(404, 'not_found', 'No such screenshot');
    // .darby is a dot-directory: express/send refuses dotfile paths unless explicitly allowed; `root` + basename keeps this confined to the shots folder
    res.sendFile(file, { root, dotfiles: 'allow', headers: { 'cache-control': 'private, max-age=3600' } });
  }));

  /** Files a launch run produced (hero, voiceover, teaser, landing page, copy): read-only, confined to workspace/<run>/launch. */
  r.get('/runs/:id/files/*rel', wrap((req, res) => {
    const id = path.basename(String(req.params.id));
    const rel = ([] as string[]).concat((req.params as unknown as Record<string, string | string[]>).rel ?? []).join('/');
    const base = path.join(cfg.workspaceDir, id);
    const abs = path.resolve(base, rel);
    const inside = path.relative(path.join(base, 'launch'), abs);
    if (inside.startsWith('..') || path.isAbsolute(inside) || !/\.(png|jpe?g|mp3|mp4|html|css|js|md|json|txt)$/i.test(abs) || !existsSync(abs)) throw new HttpError(404, 'not_found', 'No such file');
    // generated pages are untrusted code: they run only inside a sandboxed iframe and may load nothing from the network
    res.set('content-security-policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; media-src 'self'");
    res.set('x-content-type-options', 'nosniff');
    res.sendFile(path.relative(base, abs), { root: base, dotfiles: 'allow', headers: { 'cache-control': 'private, max-age=60' } });
  }));

  r.post('/runs/:id/repair', wrap(async (req, res) => {
    try { res.status(202).json({ id: await manager.repair(String(req.params.id)) }); } catch (e) {
      if (e instanceof RepairError) throw new HttpError(409, e.code, e.message);
      throw e;
    }
  }));
  r.post('/runs/:id/cancel', wrap((req, res) => {
    if (!manager.cancel(String(req.params.id))) throw new HttpError(409, 'not_active', 'That run is not running');
    res.json({ ok: true });
  }));
  r.post('/runs/:id/takeover', wrap(async (req, res) => {
    if (!(await manager.takeover(String(req.params.id)))) throw new HttpError(409, 'not_active', 'That run cannot be paused right now');
    res.json({ ok: true });
  }));
  r.post('/runs/:id/resume', wrap((req, res) => {
    if (!manager.resume(String(req.params.id))) throw new HttpError(409, 'not_paused', 'That run is not paused');
    res.json({ ok: true });
  }));
  r.post('/runs/:id/approvals/:stepId', wrap((req, res) => {
    const body = ApprovalBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'bad_request', 'Send {"approved": true|false}');
    if (!manager.resolveApproval(String(req.params.id), String(req.params.stepId), body.data.approved)) throw new HttpError(409, 'no_pending_approval', 'Nothing is waiting for approval on that step');
    res.json({ ok: true });
  }));

  r.get('/memory', (_req, res) => { res.json(repo.listMemory()); });
  r.post('/memory', wrap((req, res) => {
    const body = MemoryBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'bad_request', 'Send {"key": "...", "value": "..."} (value up to 300 characters)');
    const id = `mem_${Math.random().toString(36).slice(2, 10)}`;
    repo.addMemory({ id, key: body.data.key, value: body.data.value });
    res.status(201).json({ id });
  }));
  /** "Remember this run": stores only trusted facts about the run (id, document path, counts), never page text. */
  r.post('/runs/:id/remember', wrap((req, res) => {
    const run = repo.getRun(String(req.params.id));
    if (!run?.receipt) throw new HttpError(404, 'not_found', 'This run has no receipt yet');
    const doc = repo.listEvidence(run.id).find((e) => e.kind === 'file' && e.path.endsWith('.xlsx'));
    const id = `mem_${Math.random().toString(36).slice(2, 10)}`;
    repo.addMemory({ id, key: `Run ${run.id.slice(4, 19)}`, value: `${run.receipt.verdict.replace(/_/g, ' ').toLowerCase()}; ${run.receipt.gaps.length} gaps${doc ? `; document ${doc.path}` : ''}`.slice(0, 300), sourceRunId: run.id });
    res.status(201).json({ id });
  }));
  r.delete('/memory/:id', wrap((req, res) => {
    if (!repo.deleteMemory(String(req.params.id))) throw new HttpError(404, 'not_found', 'No such memory');
    res.json({ ok: true });
  }));

  r.use((_req, _res, next) => next(new HttpError(404, 'not_found', 'Unknown API route')));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  r.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return void res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if ((err as any)?.type === 'entity.parse.failed') return void res.status(400).json({ error: { code: 'bad_json', message: 'The request body is not valid JSON' } });
    console.error('[api] internal error:', redactSecrets(String((err as Error)?.message ?? err)));
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on the server. Check the server log.' } }); // never a stack trace
  });
  return r;
}
