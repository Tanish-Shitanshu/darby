# Progress log (kept current after every milestone / major step)

_Last updated: 2026-10-29_

## Current state
- **M2 (policy, approvals, control) done**, tag `m2-policy`. M1 done (`m1-core-loop`). Next: M3 (companion UI polish: approval card at the top, evidence drawer, history, memory, receipt tamper-test button, Save as Playbook placeholder, Hub placeholder).
- Step 0 (LLM provider) done: Gemini provider verified live (`gemini-3.5-flash`, JSON + image input), fallback chain `gemini-3-flash-preview`, `gemini-3.8-flash`; free-tier limiter (sliding-window RPM, concurrency 2, backoff on 429/503/timeouts); every response cached in the replay store.

## Milestones
| milestone | status | tag | notes |
|---|---|---|---|
| M0 scaffold | done | m0-scaffold | server + companion + fixtures wired |
| M1 core loop | done | m1-core-loop | |
| M2 policy/approvals/control | done | m2-policy | |
| M3 companion UI | todo | | |
| M5 failure + repair | todo | | |
| M6 GTM Studio | todo | | |
| M7 Playbooks + Hub | todo | | |
| M4 Google Sheets | skipped unless `secrets/google-oauth.json` exists | | SHEET_ADAPTER=local |
| M8 demo hardening | todo | | |

## Commands that pass
`npm run check` (83 tests) · `npm run redteam` · `npm run fixtures:check` · `npm run llm:ping` · `npm run test:acceptance -- case1` (replay) · `npm run test:acceptance -- case1 --live` · `npm run verify-receipt -- docs/evidence/m1-case1-receipt.json` · `npm run db:reset` · `npm run replay:curate`

## M2 notes
- Policy engine hardened after an independent headless-AdaL red team (48 bypasses found -> 0): see `docs/evidence/m2-review.md`.
- `npm run test:acceptance` (replay, offline) runs: case1 (4-step plan, approval for share.grant, SIMULATED label), case1-denied, case1-noshare, case2 (poisoned page contained, CONTAINED), case2b (compromised planner -> TAINT-002), case2c (hostile reader model), case2d (FORB-003), cancel, cancel-approval, takeover (pause + page re-read), tamper. `npm run redteam` runs the case2* group.
- Share is SIMULATED (local sidecar permission list) until M4 (Google) exists; labelled in the UI card, step proof, receipt labels.
- The attacker in case2 is simulated (labelled SIMULATED-ATTACK); containment is real code. The prompt injection on the Fathom page is also really read by the real Gemini reader, which ignored it.

## M1 notes
- Case 1 (without share) verified live on Gemini and from replay alone: VERIFIED_WITH_GAPS, gaps cobalt/echo/helio, 10/10 read back, prices equal fixtures/expected.json. 11 recordings committed in `replay/llm/`.
- Policy engine (all five rules + taint tracker) already exists in `apps/server/src/policy/engine.ts`; M2 adds its tests, the approval UI flow, `share.grant`, takeover re-read, red-team suite.
- Receipt bundle = `{format, receipt, ledger[]}`; receipt carries signed extras `labels` (REPLAY/SIMULATED), `cause`, `llm`.

## Known issues
- `gemini-3.8-flash` / `3.7` / `3.6` / `flash-latest` returned 503 "high demand" at test time; `gemini-3.5-flash` and `gemini-3-flash-preview` responded. The provider falls back automatically.
- `npm audit` findings (vitest tooling, zod advisory): intentionally not upgraded (contracts are pinned).
- Port 5173 may be taken on a dev machine; the companion falls back to 5174.

## Human steps
| step | status |
|---|---|
| LLM key (Gemini, free) | done on Tanish's machine; every new engineer creates his own (docs/HANDOFF.md) |
| GitHub repo `darby` + CipherEnigma invited | done (invite pending acceptance) |
| Invite mohit4learning@gmail.com, pghana365@gmail.com | pending (owner does it in GitHub Settings > Collaborators) |
| GitHub test repo `darby-launch-test` + `GITHUB_TOKEN` (M6 PR step) | pending |
| Google OAuth JSON (M4, optional) | pending / may be skipped |
| Demo video recording | pending |
