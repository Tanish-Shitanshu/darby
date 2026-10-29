# M1 review (AdaL search sub-agent, security + correctness pass)

Scope: apps/server/src — executor (engine, context, tools), policy, verifier, reader, ledger (chain, receipt), db/repo, api, llm, server.
Rules checked: verdict only from the independent verifier · page text reaches only the quarantined reader · policy is code · append-only hash chain + signed receipt · no secrets / stack traces to the client · cancel stops actions.

## Findings and what was done
| # | severity | finding | resolution |
|---|---|---|---|
| 1 | medium | `sheet.write` interpolated `step.args.name` into a file path without validation (traversal outside the run folder) | **Fixed** in `executor/tools.ts`: name must match `^[\w][\w \-]{0,39}$`, resolved path re-checked with `path.relative`; fails closed before any write. (The plan compiler already stripped bad characters; this is defence in depth.) |
| 2 | medium | Browser navigation and the verifier's fetch follow redirects, so an allowlisted URL could land on another origin | **Fixed**: after navigation the *final* origin must be allowlisted or the page content is discarded (`tools.ts`); the verifier errors (-> NEEDS_YOU) if its fetch ended on a different origin (`verifier.ts`). |
| 3 | low | The page `<title>` (page-controlled text) was put into a UI event outside the reader boundary | **Fixed**: events now use the trusted catalog name / slug, never page text. |

## Checked and found sound (reviewer's list)
- Failures, gaps and verifier errors cannot become VERIFIED (`engine.ts` folding + `computeVerdict`).
- Reader prompt is fixed and goal-free; strict schema plus URL/email/command rejection.
- Policy blocks unregistered tools and forbidden args, checks taint in sensitive positions, requires approval for external effects.
- Hash chain and Ed25519 receipt verification recompute everything; screenshot route is confined to the run's shots folder; unexpected API errors are generic.
- Ledger inserts are transactional with canonical payloads.

## Also found by Browser Use during the UI walkthrough (not by the reviewer)
- `GET /api/runs/:id/shots/:file` returned HTTP 500 for every screenshot: Express `send` refuses paths that contain a dot-directory (`.darby`). Fixed with `root` + `dotfiles: 'allow'` on a basename-only path; traversal attempt (`..%2F..%2Fdarby.db`) still returns 404. See ADAL_EVIDENCE entry 3.

Note: AdaL's interactive Review Agent command is not callable from inside this autonomous session, so the review was run through AdaL's `agentic_search` sub-agent with an explicit security checklist. Re-run `/review` in the AdaL desktop/CLI on `git diff m0-scaffold..m1-core-loop` if a second pass is wanted.
