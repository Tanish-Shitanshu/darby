# Progress log (kept current after every milestone / major step)

_Last updated: 2026-10-29_

## Current state
- **M1 (core loop) done** and tagged `m1-core-loop`. Next: M2 (policy engine tests, approvals UI flow, share.grant SIMULATED, cancel/takeover, red-team).
- Step 0 (LLM provider) done: Gemini provider verified live (`gemini-3.5-flash`, JSON + image input), fallback chain `gemini-3-flash-preview`, `gemini-3.8-flash`; free-tier limiter (sliding-window RPM, concurrency 2, backoff on 429/503/timeouts); every response cached in the replay store.

## Milestones
| milestone | status | tag | notes |
|---|---|---|---|
| M0 scaffold | done | m0-scaffold | server + companion + fixtures wired |
| M1 core loop | done | m1-core-loop | |
| M2 policy/approvals/control | todo | | |
| M3 companion UI | todo | | |
| M5 failure + repair | todo | | |
| M6 GTM Studio | todo | | |
| M7 Playbooks + Hub | todo | | |
| M4 Google Sheets | skipped unless `secrets/google-oauth.json` exists | | SHEET_ADAPTER=local |
| M8 demo hardening | todo | | |

## Commands that pass
`npm run check` (62 tests) · `npm run fixtures:check` · `npm run llm:ping` · `npm run test:acceptance -- case1` (replay) · `npm run test:acceptance -- case1 --live` · `npm run verify-receipt -- docs/evidence/m1-case1-receipt.json` · `npm run db:reset` · `npm run replay:curate`

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
