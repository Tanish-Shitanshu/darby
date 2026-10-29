# Progress log (kept current after every milestone / major step)

_Last updated: 2026-10-29_

## Current state
- **M5 and M6 done** (tags `m5-repair`, `m6-gtm`). M1 `m1-core-loop`, M2 `m2-policy`, M3 `m3-ui` done. Next, in order: M8-lite (one-command demo + offline replay), M7 (Playbooks + Hub), M4 only if `secrets/google-oauth.json` exists. Intro video (Video Producer) stays an AdaL step.
- Who built what (kept honest for PS1 evidence): M0-M3, the red-team pass and the evidence screenshots were built with AdaL. From M5 onward the build continues with a second AI coding assistant (not AdaL) because the AdaL weekly credits ran out; those commits are authored by the repo owner only and are listed in `docs/ADAL_EVIDENCE.md` as NOT AdaL work.
- Step 0 (LLM provider) done: Gemini provider verified live (`gemini-3.5-flash`, JSON + image input), fallback chain `gemini-3-flash-preview`, `gemini-3.8-flash`; free-tier limiter (sliding-window RPM, concurrency 2, backoff on 429/503/timeouts); every response cached in the replay store.

## Milestones
| milestone | status | tag | notes |
|---|---|---|---|
| M0 scaffold | done | m0-scaffold | server + companion + fixtures wired |
| M1 core loop | done | m1-core-loop | |
| M2 policy/approvals/control | done | m2-policy | |
| M3 companion UI | done | m3-ui | |
| M5 failure + repair | done (code + tests); real-model replay recordings for Case 4 still to be curated on the owner's machine | m5-repair | `case4` (replay/live) and `case4-stub` (scripted model, deterministic, runs anywhere) |
| M6 GTM Studio | done (code + tests, scripted-model acceptance); real-model recording + real PR still to be done on the owner's machine | m6-gtm | `case3` (approve) and `case3-denied` |
| M7 Playbooks + Hub | todo | | |
| M4 Google Sheets | skipped unless `secrets/google-oauth.json` exists | | SHEET_ADAPTER=local |
| M8 demo hardening | todo | | |

## Commands that pass
`npm run check` (88 tests) · `npm run redteam` · `npm run fixtures:check` · `npm run llm:ping` · `npm run test:acceptance -- case1` (replay) · `npm run test:acceptance -- case1 --live` · `npm run verify-receipt -- docs/evidence/m1-case1-receipt.json` · `npm run db:reset` · `npm run replay:curate`

## M3 notes
- UI: Run / History / Memory tabs; sticky run bar (Cancel, Take over, Resume); approval card on top; plan as clickable tickets -> evidence drawer (contract, policy decision, verification results, screenshots, files with sha256, stored result); lightbox; receipt with stamp, labels, CONTAINED badge, server-verified "chain valid", tamper test, download JSON, "Remember this run".
- Memory: user notes are shown to the planner (only when present; the replay recordings assume an EMPTY memory, so delete test notes before a replay demo); run summaries are stored but never sent to a model.
- Not in M3 by design: Save as Playbook and the Hub view (M7).

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

## M6 notes (GTM Studio, Case 3)
- Chain (planner picks it for launch goals only): browser.read_page (3 competitor pages) -> reader.extract -> gtm.copy -> gtm.hero_image -> gtm.voiceover -> gtm.teaser -> gtm.landing_page -> gtm.test_page -> github.create_pr (external effect, approval card lists repo/branch/title/4 files/hash).
- Every fallback is labelled in the signed receipt: `FALLBACK:template-copy`, `GENERATED-PLACEHOLDER:hero.png` (deterministic rendered card; no image model configured), voiceover `VOICE:edge-tts | macos-say | espeak-ng` or `PLACEHOLDER:voiceover-tone` (not speech!), `CODEGEN:model-written-landing` or `FALLBACK:template-landing`, `SIMULATED:github.create_pr` (local git repo, no token).
- Landing page: coder model writes it, Darby tests it in a real tab, feeds failures back once, else labelled template. New evidence kinds: `media_probe` (fresh ffmpeg probe: teaser 13.5-16.5 s with video+audio), `pr_exists` (GitHub REST read-back, or the local repo re-read with git), and the previously missing `page_assertions` verifier (fresh tab, no console errors, images loaded, click reveals text) plus a vision check of the screenshot.
- Review panel in the companion (image, audio, video, sandboxed page preview, PR line) from `GET /api/runs/:id/files/launch/...` (read-only, confined to the run's launch folder, CSP-locked).
- `case3` / `case3-denied` use a scripted stand-in model (offline, deterministic; the first landing page it sends is deliberately broken to exercise the repair loop). Real-model recordings for Case 3 (planner, reader, creative, coder, vision) must be recorded once on the owner's machine: `LLM_PROVIDER=gemini` run Case 3 from the UI, then `npm run replay:curate`.
- Owner-only for a REAL pull request: create the repo `darby-launch-test`, put `GITHUB_TOKEN` (fine-grained, that repo only, contents + pull requests write) and `GITHUB_TEST_REPO=owner/darby-launch-test` in `.env`. Without them the PR is SIMULATED and says so.
- Voiceover on a Mac uses the built-in `say` (offline); `pip install edge-tts` gives the neural voice when online. ffmpeg: system one, else the bundled `@ffmpeg-installer/ffmpeg` (npm install).

## M5 notes
- `browser.act` fills a real form and treats the page's "Saved ✓" as an unverified claim; the verifier reads `GET /api/leads` fresh and an independent vision check looks at the "Saved leads" page (it never sees the agent's claim). Broken form => FAILED with a plain-language cause, a recovery is offered, nothing is retried by itself.
- Repair (max 2 per chain) is a new run with its own signed receipt (`repairOf` = failed run). The replanner must use the documented `POST /api/leads` (`http.request`); code pins the lead to the one the failed attempt used.
- The planner prompt only offers `browser.act`/`http.request` and the lead rule when the goal is about submitting a lead/form (`isLeadGoal`). This keeps the Case 1/2 prompts identical to the ones recorded in `replay/llm/`. **If you change planner/tool prompt text, the replay key changes and recordings go stale: re-record with `LLM_PROVIDER=gemini npm run test:acceptance -- --live` and `npm run replay:curate`.**
- TODO (needs the owner's machine, real Gemini): `npm run replay:curate` after a live Case 4 run so `case4` also passes offline. `case4-stub` already proves the plumbing offline.

## Handover note (Tanish, 29 Oct)
- M1, M2, M3, M5 done. Pending: M6, M8-lite, M7, (M4 optional). Run `npm run check` and `npm run test:acceptance` first (headless: `DARBY_HEADLESS=1`).
- Publishing: `bash scripts/ship.sh "message"` (checks, secret guard, author check, push main + tags). Commits must carry no AI attribution; `.githooks/commit-msg` enforces it.
- Tanish's AdaL credits are exhausted; work continues with another coding assistant and his own Gemini key.
