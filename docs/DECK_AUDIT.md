# Deck truth audit

Every claim in the submitted deck (`docs/DECK.md`, PDF "Darby_Target9x_Shiv_Nadar_University") checked against the repo at the commit that adds this file.
Status: TRUE (works and is tested), PARTLY (works with a caveat), FALSE (the repo contradicts the slide), NOT YET (not built; a fix is listed).
Slides are never edited by the assistant. Rows marked **OWNER** need a wording decision from the team lead.

| # | Slide | Claim | Where it is true in the repo | Status | Action |
|---|---|---|---|---|---|
| 1 | 1 | Plan of 4 steps, proof per step, read back "10 of 10 match", share "you approved", VERIFIED WITH GAPS, 3 gaps flagged | `npm run test:acceptance -- case1` (gaps exactly cobalt, echo, helio); `fixtures/expected.json` | TRUE | Receipt id on the slide (`9f3a…c21e`) is a sample; deck already says "sample data" |
| 2 | 1 | 7/7 PS1 requirements covered | `docs/PS1.md`, rows below | PARTLY | Req. 7 "AdaL builds Darby" is true only for M0–M3 and the red team (see `docs/ADAL_EVIDENCE.md`); M5–M7 were built with another assistant. **OWNER**: do not say "all built with AdaL" |
| 3 | 1 | 4 live demo cases, one a failure | `fixtures/demo-goals.json`, acceptance case1/case2/case3/case4 | TRUE | Case 3 and 4 need recordings for offline mode (Phase 1) |
| 4 | 1 | 10 red-team poisoned pages | One poisoned fixture page (Fathom, page 6 of 10). Red-team coverage: 5 hostile-reader outputs (case2c), 3 policy bypass attempts (case2d), 48 independent attempts by AdaL (`docs/evidence/adal-redteam`), injection suite in `playbook:check` | TRUE | Ten poisoned fixture pages (/redteam/rt-1..
t-10, ten different hiding techniques) plus case2e (
pm run redteam): five payloads are stripped before the reader ever sees them, five are obeyed by a hostile model stub and rejected at the reader boundary; nothing reaches the sheet or the outbox |
| 5 | 1 | 0 risky actions without approval | Policy engine, case1-denied, case2*, cancel-approval, `npm run redteam` | TRUE | |
| 6 | 2 | Typical run: 3 guessed prices, 1 hidden instruction | Illustrative scenario of other agents | n/a | Presented as "a typical run", not Darby output |
| 7 | 2 | 30–61 % task completion; 45 %+ false success; Gartner "Block" | External citations (arXiv:2504.01382, arXiv:2604.06240, Gartner 7211030) | UNVERIFIED | **OWNER**: confirm the numbers against the sources before presenting; the assistant cannot verify them |
| 8 | 2 | Comet/Neon/Dia, browser-use/BrowserOS, Magentic-UI comparison | Public claims about third parties | UNVERIFIED | **OWNER**: be ready to defend each if a judge asks |
| 9 | 3 | "You ask: text, voice or a screenshot" | Text: yes. Voice: mic button in goal box (Chrome speech API). Screenshot: attach an image, vision model describes it into the goal box for you to review | TRUE | Voice needs Chrome + internet; screenshot needs a model key (live) |
| 10 | 3 | Typed steps, each with a proof contract | Plan compiler + 10 contract kinds in `packages/contracts` | TRUE | |
| 11a | 3 | "Research top AI startups and write an Excel sheet" on the open web | `web.search` + public-site reads (READ-002), quote verification by the verifier's own fresh read (static fetch, then its own rendered tab); `case5`, `case5b`; live run verified with gaps | TRUE (live, variable) | Real sites vary: some block automated readers (recorded as gaps). Not replayable offline |
| 11 | 3 | Real tabs and apps; risky steps wait for you | Playwright executor, approval cards | TRUE | "Apps": only the local fixture apps and a local sheet; no Sheets/Excel/Drive app is driven |
| 12 | 3 | Read-back, vision, independent verifier | `verifier/`, `vision_check`, `sheet_readback` | TRUE | |
| 13 | 3 | Step 2: write 10 rows to "Competitors!A2:F11", **Sheets API** read-back | Local xlsx adapter (`SHEET_ADAPTER=local`). Google adapter (M4) not configured; needs `secrets/google-oauth.json` | PARTLY | **OWNER**: reword to "sheet read-back" or accept that Google is not live; sharing is labelled SIMULATED |
| 14 | 3 | Quarantined reader, pages never reach the planner | `reader/`, planner sees goal + trusted sources only; tests in `planner.test.ts`, `reader.test.ts` | TRUE | |
| 15 | 3 | Tamper-evident receipt: hash-chained, signed, shareable | `ledger/`, `npm run verify-receipt`, UI tamper test, `/runs/:id/receipt` download | TRUE | "Shareable" = downloadable JSON verifiable by CLI |
| 16 | 4 | Companion panel / plan compiler / policy engine / executor / verifier / ledger boundaries | `docs/ARCHITECTURE.md`, code layout | TRUE | |
| 17 | 4 | **Frontend: Electron · React · TS** | React + Vite in a browser tab beside Chromium. No Electron | FALSE | **OWNER**: reword to "React · TS companion panel" (Electron is stretch M8, low priority) |
| 18 | 4 | Chromium via CDP, Playwright | `executor/browser.ts` | TRUE | |
| 19 | 4 | Integrations: Sheets · **Excel (Graph)** · GitHub | Local xlsx file + local sheet; GitHub PR simulated unless token set; no Graph | PARTLY | **OWNER**: say "Sheet (local xlsx), GitHub PR (simulated unless token)"; drop Excel Graph / Drive |
| 20 | 4 | **AI layer: Azure OpenAI via Microsoft Foundry, three model roles** | Default is Gemini (free tier), 5 roles: planner, reader, creative, coder, vision. An Azure provider exists (`llm/providers.ts`) but is not what the demo uses | FALSE | **OWNER**: reword to "pluggable model provider (Gemini in the demo, Azure OpenAI supported)"; say five roles |
| 21 | 4 | Vision · speech · image · video | Vision check yes; speech = Edge TTS/`say`/espeak or labelled placeholder tone; image = labelled GENERATED-PLACEHOLDER card; video = ffmpeg teaser | PARTLY | Labels are in the signed receipt. **OWNER**: do not call the hero image "AI-generated" |
| 22 | 4 | **Data: SQLite · Supabase sync** | SQLite yes. No Supabase | FALSE | **OWNER**: delete "Supabase sync" and "Supabase free tier" (slide 6) |
| 23 | 4 | Memory you control | `/memory` API + UI list/add/delete | TRUE | |
| 24 | 4 | AdaL: builds Darby, Browser Use tests it, red-teams it, SKILL.md Playbooks, Video Producer teasers | Builds M0–M3 and red-team: TRUE. Browser Use QA, Video Producer, Playbook run in AdaL: **not yet done** | NOT YET | **OWNER** must run the AdaL sessions in `docs/ADAL_TODO_FOR_OWNER.md` or soften the slide |
| 25 | 5 | Evidence contracts, "no proof, no tick" | Verifier gating; acceptance suite | TRUE | |
| 26 | 5 | Quarantine: sends, posts, payments wait for you | Policy `EXT-001`, approval cards; case1/case3 | TRUE | There is no payment tool; "payments" is a policy category only |
| 27 | 5 | Receipts, live timeline, cancel, take over | UI + `cancel`, `takeover` acceptance scenarios | TRUE | |
| 28 | 5 | GTM Studio: copy, image, teaser video, voice, landing page tested by Darby, publishing waits for you | Case 3 chain; `case3` passes; real-model run needs recording | TRUE (scripted) / pending (real model) | Re-check after Phase 1 recording |
| 29 | 5 | Playbooks and Hub: verified run becomes replayable Playbook; Hub lists **only tested ones** | `playbooks/`, `playbook:check`, Hub badge | PARTLY | Hub lists all saved Playbooks and shows a tested/stale badge; **OWNER** wording "Hub shows which are tested", or filter in code (tracked in PROGRESS) |
| 30 | 5 | "SKILL.md runs in AdaL" | `playbooks/startup-prices/SKILL.md` exists; never run in AdaL | NOT YET | AdaL session needed |
| 31 | 5 | "Shown in Demo 1" for Playbooks, Demo 2/3/4 mapping | `docs/DEMO_SCRIPT.md` | PARTLY | Playbook is shown after Case 1 in the script; keep that order |
| 32 | 5 | Four verdicts | `RunVerdict` in contracts; UI stamp | TRUE | |
| 33 | 6 | Runs on the user's own device; no servers needed | Everything local; model API is remote | TRUE | |
| 34 | 6 | **Installable desktop app** | `npm run demo` starts local servers and opens Chrome. No installer | FALSE | **OWNER**: reword to "runs locally with one command" |
| 35 | 6 | Pay-as-you-go model API | Demo uses Gemini free tier; billing never enabled | PARTLY | Wording is a future plan, fine if presented as such |
| 36 | 6 | Free core, Teams plan, Hub revenue share | Business plan, not code | n/a | |
| 37 | 6 | Built on Electron + React, **Azure OpenAI**, **Sheets + Excel** | See rows 17, 19, 20 | FALSE/PARTLY | **OWNER** |
| 38 | 7 | Slide mock: Google Sheet tab `docs.google.com/spreadsheets/Competitors`, "Email draft" tab, "startup-6.com" | Demo uses a local sheet and fixture site `localhost:4010`. Mock is labelled "Concept preview … sample data" | PARTLY | Say out loud that the sheet is local/simulated |
| 39 | 7 | Case 1 VERIFIED WITH GAPS 10/10 read back | case1 | TRUE | |
| 40 | 7 | Case 2 CONTAINED, no email sent | case2 (outbox empty, blocked attempt in receipt) | TRUE | |
| 41 | 7 | Case 3 NEEDS YOU, post awaits you | case3-denied → NEEDS_YOU; approved → VERIFIED | TRUE | PR is simulated unless a token is set |
| 42 | 7 | Case 4 FAILED reported, then fixed | case4 (live vision check), repair run `repairOf` | TRUE | Real-model recording pending |
| 43 | 7 | Page 6: injection blocked | Fathom is the 6th fixture page | TRUE | |
| 44 | 7 | "Built with AdaL: recordings, commit tags, test logs" | Commit tags `Built-with: AdaL` on M0–M3; test logs in `docs/evidence` | PARTLY | Session recordings must come from the owner |

## Summary for the owner

False or not-yet items that need a slide change or an AdaL session: rows 17, 20, 22, 34, 37 (Electron, Azure, Supabase, installable app), 19 and 13 (Excel/Drive/Sheets API), 24 and 30 (AdaL sessions), 7 and 8 (verify cited numbers).
Fixed in the repo since the first audit: row 4 (10 poisoned pages, case2e) and row 9 (voice button and screenshot attach in the goal box).
