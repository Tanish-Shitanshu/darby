// Shared contracts for Darby. Everything that crosses a module or trust boundary is defined here with zod,
// so the planner, policy engine, executor, reader, verifier, ledger and UI cannot drift apart.
import { z } from 'zod';

/* ---------- Verdicts and statuses ---------- */
export const Verdict = z.enum(['VERIFIED', 'VERIFIED_WITH_GAPS', 'FAILED', 'NEEDS_YOU']);
export type Verdict = z.infer<typeof Verdict>;

export const StepStatus = z.enum(['pending', 'running', 'awaiting_approval', 'verifying', 'passed', 'passed_with_gaps', 'failed', 'blocked', 'cancelled']);
export type StepStatus = z.infer<typeof StepStatus>;

/** Risk tiers. The policy engine (plain code, not a model) assigns the final tier; the planner may only suggest one. */
export const Risk = z.enum(['read', 'write_local', 'external_effect', 'forbidden']);
export type Risk = z.infer<typeof Risk>;

/* ---------- Evidence contracts: what counts as proof for a step ---------- */
export const EvidenceContract = z.discriminatedUnion('kind', [
  // The document we wrote must read back exactly as intended (Google Sheet via API, or local .xlsx re-parsed from disk).
  z.object({ kind: z.literal('sheet_readback'), sheetRef: z.string(), range: z.string(), expected: z.array(z.array(z.string())) }),
  // Every extracted value must be provable by an exact quote that appears in the page text, fetched independently of the reader.
  z.object({ kind: z.literal('quote_in_page'), url: z.string().url(), items: z.array(z.object({ field: z.string(), value: z.string().nullable(), quote: z.string().nullable() })) }),
  // A sharing/permission change is real only if the permission list shows it.
  z.object({ kind: z.literal('permission_present'), fileRef: z.string(), email: z.string().email(), role: z.string() }),
  // A read-back over an HTTP JSON API (used by the fixture apps and GitHub).
  z.object({ kind: z.literal('http_json_contains'), url: z.string().url(), path: z.string(), expected: z.unknown() }),
  // A generated page must load and show what the brief promised.
  z.object({ kind: z.literal('page_assertions'), url: z.string(), assertions: z.array(z.object({ selector: z.string().optional(), text: z.string().optional(), clickThenExpectText: z.string().optional() })) }),
  z.object({ kind: z.literal('file_exists'), path: z.string(), minBytes: z.number().int().positive(), mime: z.string().optional() }),
  // For pages with no API: an independent model looks at a screenshot and answers a yes/no question. It never sees the agent's claim.
  z.object({ kind: z.literal('vision_check'), screenshotPath: z.string(), question: z.string() }),
  // A generated audio/video file must really be media of the promised length (probed by a fresh ffmpeg run, not trusted from the maker).
  z.object({ kind: z.literal('media_probe'), path: z.string(), media: z.enum(['audio', 'video']), minSeconds: z.number().positive(), maxSeconds: z.number().positive() }),
  // A pull request is real only if a fresh read of the repo shows it (GitHub REST API, or the local simulated repo).
  z.object({ kind: z.literal('pr_exists'), adapter: z.enum(['github', 'local']), repo: z.string(), number: z.number().int().positive(), title: z.string(), branch: z.string(), files: z.array(z.string()) }),
]);
export type EvidenceContract = z.infer<typeof EvidenceContract>;

/* ---------- Plan ---------- */
export const PlanStep = z.object({
  id: z.string(),
  title: z.string(),
  tool: z.string(),                         // key in the tool registry, e.g. 'browser.read_page', 'sheet.write', 'share.grant'
  args: z.record(z.unknown()),
  dependsOn: z.array(z.string()).default([]),
  suggestedRisk: Risk.default('read'),
  contract: EvidenceContract.nullable(),    // null only for pure-reasoning steps; the UI shows these as "no proof needed"
});
export type PlanStep = z.infer<typeof PlanStep>;

export const Plan = z.object({ id: z.string(), goal: z.string(), steps: z.array(PlanStep).min(1).max(12), createdAt: z.string() });
export type Plan = z.infer<typeof Plan>;

/* ---------- Quarantined reader: the ONLY thing allowed to look at untrusted page text ---------- */
// Tool-less model, schema-only output. Strict so that extra keys (e.g. smuggled instructions) are rejected.
export const ExtractedRecord = z.object({
  name: z.string().max(120),
  priceUsd: z.number().nonnegative().nullable(),   // null = not shown on the page; never guess
  quote: z.string().max(200).nullable(),            // exact text from the page that shows the price
  note: z.string().max(200).optional(),
}).strict();
export type ExtractedRecord = z.infer<typeof ExtractedRecord>;

/** Anything derived from page text is tainted. Tainted values may fill document cells but may never become a recipient, URL, command or tool name. */
export const Tainted = <T extends z.ZodTypeAny>(inner: T) => z.object({ value: inner, tainted: z.literal(true), sourceUrl: z.string() });

/* ---------- Policy ---------- */
export const PolicyDecision = z.object({
  action: z.enum(['allow', 'require_approval', 'block']),
  risk: Risk,
  ruleId: z.string(),                       // e.g. 'EXT-001-external-effect-needs-approval', 'TAINT-002-no-tainted-recipient'
  reason: z.string(),
});
export type PolicyDecision = z.infer<typeof PolicyDecision>;

/* ---------- Ledger and receipt ---------- */
export const LedgerEntry = z.object({
  index: z.number().int().nonnegative(),
  ts: z.string(),
  runId: z.string(),
  stepId: z.string().nullable(),
  type: z.string(),                         // 'plan', 'policy', 'action', 'evidence', 'verdict', 'approval', 'cancel', 'takeover', ...
  payload: z.record(z.unknown()),
  prevHash: z.string(),                     // hex sha256 of the previous entry ('0'.repeat(64) for the first)
  hash: z.string(),                         // sha256(prevHash + canonicalJson({index,ts,runId,stepId,type,payload}))
});
export type LedgerEntry = z.infer<typeof LedgerEntry>;

export const StepSummary = z.object({ stepId: z.string(), title: z.string(), status: StepStatus, evidenceSummary: z.string(), gaps: z.array(z.string()).default([]) });
export type StepSummary = z.infer<typeof StepSummary>;

export const Receipt = z.object({
  runId: z.string(), goal: z.string(), verdict: Verdict, createdAt: z.string(),
  steps: z.array(StepSummary), gaps: z.array(z.string()),
  blocked: z.array(z.object({ stepId: z.string(), ruleId: z.string(), summary: z.string() })).default([]),  // attempts the policy engine stopped (shown as CONTAINED)
  repairOf: z.string().optional(),          // runId of the failed run this run repaired
  chainHead: z.string(),                    // hash of the last ledger entry
  publicKey: z.string(),                    // Ed25519, base64
  signature: z.string(),                    // Ed25519 over canonicalJson(receipt minus signature), base64
});
export type Receipt = z.infer<typeof Receipt>;

/* ---------- Live events (server -> companion UI over WebSocket/SSE) ---------- */
export const RunEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('run.started'), runId: z.string(), goal: z.string() }),
  z.object({ type: z.literal('plan.created'), runId: z.string(), plan: Plan }),
  z.object({ type: z.literal('step.started'), runId: z.string(), stepId: z.string() }),
  z.object({ type: z.literal('step.action'), runId: z.string(), stepId: z.string(), description: z.string(), screenshotPath: z.string().optional() }),
  z.object({ type: z.literal('policy.decision'), runId: z.string(), stepId: z.string(), decision: PolicyDecision }),
  z.object({ type: z.literal('approval.requested'), runId: z.string(), stepId: z.string(), summary: z.string(), details: z.record(z.unknown()) }),
  z.object({ type: z.literal('approval.resolved'), runId: z.string(), stepId: z.string(), approved: z.boolean() }),
  z.object({ type: z.literal('step.evidence'), runId: z.string(), stepId: z.string(), contract: EvidenceContract.nullable(), passed: z.boolean(), detail: z.string() }),
  z.object({ type: z.literal('step.finished'), runId: z.string(), stepId: z.string(), status: StepStatus }),
  z.object({ type: z.literal('run.paused'), runId: z.string(), reason: z.enum(['takeover', 'approval', 'user']) }),
  z.object({ type: z.literal('run.resumed'), runId: z.string() }),
  z.object({ type: z.literal('run.cancelled'), runId: z.string() }),
  z.object({ type: z.literal('receipt.sealed'), runId: z.string(), receipt: Receipt }),
]);
export type RunEvent = z.infer<typeof RunEvent>;

/* ---------- Commands (companion UI -> server) ---------- */
export const Command = z.discriminatedUnion('type', [
  z.object({ type: z.literal('run.start'), goal: z.string().min(3), mode: z.enum(['fixture', 'live']).default('fixture') }),
  z.object({ type: z.literal('run.cancel'), runId: z.string() }),
  z.object({ type: z.literal('run.takeover'), runId: z.string() }),
  z.object({ type: z.literal('run.resume'), runId: z.string() }),
  z.object({ type: z.literal('approval.resolve'), runId: z.string(), stepId: z.string(), approved: z.boolean() }),
]);
export type Command = z.infer<typeof Command>;
