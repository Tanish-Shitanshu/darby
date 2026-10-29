import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface ShareGrant { email: string; role: string; simulated: true; at: string }
export interface ShareSidecar { file: string; adapter: 'local'; note: string; grants: ShareGrant[] }

export const sidecarPath = (docFile: string) => `${docFile}.shares.json`;

/**
 * Local adapter for share.grant. SIMULATED: nothing leaves this computer. The grant is recorded in a sidecar file next to the document,
 * and the verifier checks that sidecar (the Google adapter, M4, checks the real Drive permission list instead).
 */
export function grantLocalShare(docFile: string, email: string, role: string): ShareSidecar {
  const side = sidecarPath(docFile);
  const cur: ShareSidecar = existsSync(side)
    ? (JSON.parse(readFileSync(side, 'utf8')) as ShareSidecar)
    : { file: docFile.split('/').pop() ?? docFile, adapter: 'local', note: 'SIMULATED sharing: recorded locally, nothing was sent', grants: [] };
  if (!cur.grants.some((g) => g.email === email && g.role === role)) cur.grants.push({ email, role, simulated: true, at: new Date().toISOString() });
  writeFileSync(side, JSON.stringify(cur, null, 2));
  return cur;
}

export function readLocalShares(docFile: string): ShareSidecar | null {
  const side = sidecarPath(docFile);
  return existsSync(side) ? (JSON.parse(readFileSync(side, 'utf8')) as ShareSidecar) : null;
}
