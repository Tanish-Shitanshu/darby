# Milestones (finish and verify each before the next)

Cut line if time runs short: **M0–M3 + M5 are the must-have demo**; M4 upgrades "real document" to Google; M6 is the multimodal showpiece; M7–M8 are polish. Never leave a milestone half-working.

## M0 — Scaffold (30 min)
Monorepo wired: `apps/server`, `apps/companion`, `packages/contracts`, fixtures. `npm run dev` starts server (4000), companion (5173) and fixtures (4010). Companion shows a connected status. `npm run check` passes. `npm run fixtures:check` passes. README with setup. **Accept:** screenshot of companion via Browser Use; tag `m0-scaffold`.

## M1 — Core loop on fixtures (75 min)
LLM provider layer (azure/openai/replay). Planner -> validated Plan. Executor opens real headed Chromium, reads the fixture startup pages (3 in parallel). Quarantined reader -> `ExtractedRecord`. Verifier `quote_in_page`. Local xlsx sheet adapter (exceljs) + `sheet_readback`. Ledger hash chain + signed receipt + `verify-receipt`. Events over WS; minimal UI shows plan, timeline, receipt. **Accept:** acceptance Case 1 (without share) returns VERIFIED_WITH_GAPS; gaps = cobalt, echo, helio; tag `m1-core-loop`.

## M2 — Policy, approvals, control (60 min)
Policy engine rules in §5, approval cards, `share.grant` (local = SIMULATED), cancel, takeover/resume. Red-team: Case 2 incl. the compromised-planner variant; `npm run redteam`. **Accept:** Case 2 passes (outbox empty, blocked attempt in receipt); cancel and takeover tests pass; tag `m2-policy`.

## M3 — Companion UI polish (60 min)
Everything in §11 except Playbooks/Hub. Evidence drawer with screenshots; receipt page; tamper test; history; memory. **Accept:** Browser Use walkthrough recording of Case 1 through the UI; tag `m3-ui`.

## M4 — Real Google Sheets + Drive (45 min, needs HUMAN task G1)
Google adapter (OAuth desktop flow), create sheet, write, read back via fresh client, open the sheet URL in a real tab; `share.grant` via Drive permissions with `permission_present` verification. **Accept:** Case 1 on a real Google Sheet, share verified; tag `m4-google`.

## M5 — Failure and repair (45 min)
Case 4: silent-failure detection, honest FAILED, cause, repair re-plan (max 2), `repairOf`. Vision check verifier on a screenshot. **Accept:** Case 4 passes; tag `m5-repair`.

## M6 — GTM Studio (90 min)
Chain per Case 3. Adapters with fallbacks: image (AdaL/model API else deterministic rendered card, labelled), voiceover (edge-tts or Azure Speech), video (ffmpeg compose image+voice+captions, ~15 s), landing page codegen, Playwright page test + vision check, `github.create_pr` to the test repo behind approval. **Accept:** Case 3 passes; assets visible in a Review panel in the UI; tag `m6-gtm`.

## M7 — Playbooks and Hub (45 min)
Save-as-Playbook, replay, Hub view, `playbook:check`. **Accept:** Case 1 replayed from its Playbook with different parameters and verified; tag `m7-playbooks`.

## M8 — Desktop shell, polish, demo hardening (60+ min)
Electron shell (optional) that hosts the companion and launches the browser; `npm run demo` one-command start; reset script; demo script with timings; README complete; evidence folder complete; replay provider recordings for an offline backup run. **Accept:** clean-machine rehearsal of all 4 cases; tag `m8-demo`.
