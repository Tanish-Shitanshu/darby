# AdaL usage evidence (PS1 mandatory requirement)

Fill one entry per AdaL session. Attach screenshot/recording paths from `docs/evidence/`.

| # | Time | Milestone | AdaL feature used (build / Browser Use / headless / Video Producer / image / skills / MCP) | Prompt (short) | Result | Evidence file |
|---|------|-----------|---|---|---|---|
| 1 | 2026-10-29 | M0 | build + Browser Use | Preflight, then scaffold monorepo: Express+ws server (`/health`, `/ws` echoing contract-validated `RunEvent`), Vite+React companion with connection status and goal box, root scripts, fixtures check. Browser Use opened the live companion at localhost:5174, read back the status values with `eval`, inspected the console. | `npm run check` green (4 server tests); `npm run fixtures:check` green (10 fixtures, 3 gaps). Browser Use found a real defect on first load: a WebSocket "closed before established" warning (React StrictMode double-mount) and a favicon 404; both fixed (`useConnection.ts` cleanup, inline favicon) and re-verified with 0 console errors. | docs/evidence/m0-companion.png |
| 2 | 2026-10-29 | Step 0 / M1 | build + live model | LLM provider layer: confirm the current Gemini Flash model from the models-list endpoint, verify with a tiny call, build the throttled/cached provider | Listed models via the API; `gemini-3.8-flash` answered once, then returned 503 "high demand" and hung (no timeout in my first probe: lost 10 minutes, so every provider call now has a 40 s timeout). Chose `gemini-3.5-flash`, added a model fallback chain. `npm run llm:ping` prints only OK/error. | scripts/llm-ping.ts, docs/PROGRESS.md |
| 3 | 2026-10-29 | M1 | Browser Use + debugging | Run Case 1 through the live companion UI and read the console | Browser Use found a real bug: every screenshot request returned HTTP 500 (`GET /api/runs/:id/shots/*`; express `send` rejects dot-directories like `.darby`). Fixed (root + dotfiles allow, basename-only), traversal still 404. UI re-checked: plan with proof lines, REPLAY label, 3 gaps, chain valid ✓ | docs/evidence/m1-case1-ui.png |
| 4 | 2026-10-29 | M1 | Review (AdaL sub-agent) | Security/correctness review of the M1 backend | 3 findings (sheet name path traversal, redirects bypassing the origin allowlist, page title outside the reader boundary): all fixed | docs/evidence/m1-review.md |
| 5 | 2026-10-29 | M1 | headless acceptance + tamper | Case 1 live against Gemini (11 calls recorded), then from replay alone with no live calls; tampered receipt copies | PASS both ways: VERIFIED_WITH_GAPS, gaps cobalt/echo/helio, 10/10 read back, prices = expected.json, receipt valid; edited ledger entry and edited verdict both -> INVALID | docs/evidence/m1-case1-receipt.json, docs/evidence/m1-tamper-test.txt |

## Required evidence by the end
- [ ] Build: commit log with `Built-with: AdaL` trailers and milestone tags m0..m8
- [ ] Browser Use: recording of AdaL testing the companion UI (Case 1) and the poisoned page (Case 2)
- [ ] Headless: `adal -q` red-team run log (`docs/evidence/redteam-*.jsonl`)
- [ ] Video Producer / image: the demo intro or teaser clip and hero image generated through AdaL
- [ ] Skills: a Darby Playbook (`SKILL.md`) run or installed in AdaL
- [ ] Debug story: one real bug AdaL found and fixed (screenshot + commit)
