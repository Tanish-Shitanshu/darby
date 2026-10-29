import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as edSign, verify as edVerify, type KeyObject } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LedgerEntry, Receipt } from '@darby/contracts';
import { z } from 'zod';
import { canonicalJson, sha256 } from '../util/canonical';
import { verifyChain } from './chain';

/** A receipt as Darby signs it: the contract Receipt plus signed labels (REPLAY / SIMULATED) and run facts. */
export type SignedReceipt = Receipt & { labels: string[]; cause?: string; llm?: { provider: string; model: string; liveCalls: number; replayedCalls: number } };

export interface ReceiptBundle {
  format: 'darby-receipt-bundle/1';
  receipt: SignedReceipt;
  ledger: LedgerEntry[];
}

export interface Signer {
  publicKeyB64: string;
  fingerprint: string;
  sign(message: string): string;
}

/** Ed25519 key pair stored in .darby/keys (gitignored). Generated on first use. */
export function loadSigner(keysDir: string): Signer {
  const privPath = path.join(keysDir, 'ed25519-private.pem');
  let priv: KeyObject;
  if (existsSync(privPath)) {
    priv = createPrivateKey(readFileSync(privPath));
  } else {
    mkdirSync(keysDir, { recursive: true });
    const kp = generateKeyPairSync('ed25519');
    priv = kp.privateKey;
    writeFileSync(privPath, priv.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    try { chmodSync(privPath, 0o600); } catch { /* best effort on non-posix */ }
  }
  const pub = createPublicKey(priv);
  const publicKeyB64 = pub.export({ type: 'spki', format: 'der' }).toString('base64');
  return {
    publicKeyB64,
    fingerprint: sha256(Buffer.from(publicKeyB64, 'base64')).slice(0, 16),
    sign: (message) => edSign(null, Buffer.from(message), priv).toString('base64'),
  };
}

/** Everything in the receipt except the signature is signed. */
export function receiptSigningPayload(r: Record<string, unknown>): string {
  const { signature: _sig, ...rest } = r;
  return canonicalJson(rest);
}

export function sealReceipt(unsigned: Omit<SignedReceipt, 'signature' | 'publicKey'>, signer: Signer): SignedReceipt {
  const withKey = { ...unsigned, publicKey: signer.publicKeyB64 };
  return { ...withKey, signature: signer.sign(canonicalJson(withKey)) } as SignedReceipt;
}

export interface BundleCheck {
  name: string;
  ok: boolean;
  detail: string;
}
export interface BundleVerification {
  valid: boolean;
  checks: BundleCheck[];
  signerFingerprint?: string;
}

const BundleShape = z.object({ format: z.literal('darby-receipt-bundle/1'), receipt: z.record(z.unknown()), ledger: z.array(z.unknown()) });

/** Recompute the chain and the signature of a receipt bundle (a file produced by GET /api/runs/:id/receipt). */
export function verifyBundle(input: unknown): BundleVerification {
  const checks: BundleCheck[] = [];
  const fail = (name: string, detail: string): BundleVerification => ({ valid: false, checks: [...checks, { name, ok: false, detail }] });

  const shape = BundleShape.safeParse(input);
  if (!shape.success) return fail('format', 'not a darby-receipt-bundle/1 file');
  const raw = shape.data.receipt;
  const receipt = Receipt.safeParse(raw);
  if (!receipt.success) return fail('receipt schema', 'receipt does not match the Receipt contract');
  checks.push({ name: 'receipt schema', ok: true, detail: 'matches the Receipt contract' });

  const ledger: LedgerEntry[] = [];
  for (const e of shape.data.ledger) {
    const p = LedgerEntry.safeParse(e);
    if (!p.success) return fail('ledger schema', 'a ledger entry does not match the LedgerEntry contract');
    ledger.push(p.data);
  }
  const chain = verifyChain(ledger, receipt.data.runId);
  checks.push({ name: 'hash chain', ok: chain.valid, detail: chain.valid ? `${chain.entries} entries, every hash and link recomputed` : chain.reason ?? 'broken' });
  if (!chain.valid) return { valid: false, checks };

  const last = ledger[ledger.length - 1];
  const headOk = !!last && last.hash === receipt.data.chainHead && last.type === 'verdict' && last.payload.verdict === receipt.data.verdict;
  checks.push({ name: 'chain head', ok: headOk, detail: headOk ? 'receipt chainHead equals the last ledger hash and its verdict entry' : 'receipt does not match the end of the chain' });

  let sigOk = false;
  let fingerprint: string | undefined;
  try {
    const pub = createPublicKey({ key: Buffer.from(receipt.data.publicKey, 'base64'), format: 'der', type: 'spki' });
    fingerprint = sha256(Buffer.from(receipt.data.publicKey, 'base64')).slice(0, 16);
    sigOk = edVerify(null, Buffer.from(receiptSigningPayload(raw)), pub, Buffer.from(receipt.data.signature, 'base64'));
  } catch {
    sigOk = false;
  }
  checks.push({ name: 'signature', ok: sigOk, detail: sigOk ? `Ed25519 signature valid (key ${fingerprint})` : 'signature does not match the receipt content' });

  return { valid: checks.every((c) => c.ok), checks, signerFingerprint: fingerprint };
}
