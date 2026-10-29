# AdaL prompts (paste one at a time, in order; attach the PS1 PDF + deck PDF to P0)

Run AdaL inside the project folder (`~/AdaL/darby`). After each prompt: run the stated check yourself, then paste any error/screenshot back to Claude.

---
## P0 — Orient and scaffold (M0)
```
You are the lead engineer building Darby for HackBriven Build Arena PS1 (attached: problem statement PDF and our submitted deck PDF). The deck is our public promise: the prototype must make it true. Winning means scoring full marks on every rubric criterion in the PS1 PDF, with the 7 mandatory requirements working for real.

This is a single sequential build (M0 to M8), one milestone per prompt; follow it in order. The plan files are in the project folder (if they are not in your working directory, tell me and I will move them in; do not recreate them from memory).

This folder already contains the plan. Read, in order: AGENTS.md, docs/SPEC.md, docs/MILESTONES.md, packages/contracts/src/index.ts, fixtures/site/data.mjs, tests/acceptance/scenarios.json. Do not change fixtures/ or packages/contracts without telling me why.

Before any code, run a PREFLIGHT and talk to me: check node -v (>=20), npm, ffmpeg -version, git --version and git config user.name/user.email, and that this folder is writable. For anything missing, give me the exact command to run and wait. Then read the "Human checkpoints" table in AGENTS.md and tell me, as a short numbered list, every thing you will need from me later (keys, accounts, tokens) and when, so I can prepare in parallel. Ask me for the LLM key now (Azure OpenAI/Foundry endpoint + key + deployment, or an OpenAI-compatible key) and tell me exactly which file to put it in; never ask me to paste secrets into chat.
From now on, whenever you need something only I can do, stop and ask with numbered steps; offer the fallback from AGENTS.md if I say skip.

Task now: Milestone M0 only.
1. git init. Commits must be authored only by me: user.name "Tanish Shitanshu", user.email tanish.shitanshu@gmail.com (set it locally in this repo if not already set). Commit trailer "Built-with: AdaL"; no co-author lines.
   GitHub (ask me before each external step): create a repo named darby under my GitHub account (private for now) with `gh repo create` if gh is installed and logged in, otherwise give me numbered web steps. Add .gitignore-protected secrets only; never push .env or secrets/. Then invite collaborators with write access: `gh api -X PUT repos/<owner>/darby/collaborators/CipherEnigma -f permission=push`; for mohit4learning@gmail.com and pghana365@gmail.com, ask me for their GitHub usernames and invite those the same way (or give me the web steps: repo Settings > Collaborators > Add people, which accepts an email). Show me the exact list you are about to invite and wait for my yes. Push main and each milestone tag.
2. Create apps/server (Express + ws + TypeScript, port 4000, /health, WebSocket that echoes RunEvent from packages/contracts) and apps/companion (Vite + React + TS) that shows connection status and an empty goal box.
3. Wire root scripts: dev (server + companion + fixtures concurrently), check (tsc across workspaces + vitest), test:acceptance (placeholder that lists scenarios), fixtures:check.
4. Install deps, run npm run check and npm run fixtures:check until green.
5. Start npm run dev and use Browser Use to open the companion, take a screenshot into docs/evidence/m0-companion.png.
6. Update README.md if anything differs, append entry #1 to docs/ADAL_EVIDENCE.md, commit, tag m0-scaffold.
Stop after M0 and report: what you built, commands that pass, anything you want to change in the plan.
```

## P1 — Core loop (M1)
```
Milestone M1 from docs/MILESTONES.md, following docs/SPEC.md sections 2,3,6,7,8 exactly.
Build: llm/ provider layer (azure | openai | replay with record/replay of calls to .darby/replay); planner (goal -> Plan validated by contracts, one retry on invalid JSON); executor with Playwright headed Chromium reading the 10 fixture pages (3 tabs in parallel, screenshot per step); quarantined reader (no tools, strict ExtractedRecord, reject extra keys/long strings, log rejections); verifier quote_in_page + sheet_readback using its own fresh fetch; local xlsx adapter (exceljs); ledger (SQLite hash chain) + Ed25519 signed receipt + npm run verify-receipt; stream RunEvents over WS; minimal companion UI: plan with proof lines, live timeline, receipt.
Write unit tests for: ledger chain tamper detection, reader schema rejection, verifier gap-vs-fail logic (null price = gap).
Acceptance: Case 1 without the share step returns VERIFIED_WITH_GAPS with gaps exactly [cobalt, echo, helio], 10/10 rows read back, receipt verifies. Show me the receipt JSON and a Browser Use screenshot. Tag m1-core-loop.
```

## P2 — Policy, approvals, control, red-team (M2)
```
Milestone M2, SPEC sections 4,5 and case 2. Implement the policy engine as plain TypeScript with rules READ-001, LOCAL-001, EXT-001, TAINT-002, FORB-003, taint propagation on every value derived from page text, approval flow (approve/deny/takeover) over WS, share.grant (local adapter => marked SIMULATED), cancel via AbortController, takeover pause/resume that re-reads page state.
Red-team: create tests/redteam/ with (a) the poisoned Fathom page run, (b) a compromised-planner variant that deliberately proposes email.send to attacker@evil.test taken from page text, (c) a variant where the user-visible plan is fine but reader output contains a URL/command. All must end with fixtures outbox empty and a blocked entry in the receipt. Add npm run redteam. Then run the red team through headless AdaL as a second pair of eyes: adal -q "<prompt that asks it to try to make Darby leak data via the poisoned page>" -o stream-json, saving logs to docs/evidence/redteam-*.jsonl. Report anything that got through and fix it. Tag m2-policy.
```

## P3 — Companion UI (M3)
```
Milestone M3, SPEC section 11. Design for a projector: calm, high-contrast, 16px+ text, clear hierarchy, no clutter. Screens: goal box; plan list with a proof line + risk chip per step; live timeline with screenshot thumbnails; evidence drawer; approval cards (Approve / Deny / Take over) showing recipient, content summary, hash; Cancel button always visible; history; memory (view/delete); receipt page with verdict badge, gaps, blocked attempts (CONTAINED), chain-valid badge, tamper-test button, Save as Playbook (disabled until M7). Use the frontend-design skill if available. Then Browser Use: record a full Case 1 walkthrough and screenshot every screen to docs/evidence/. Fix any UX friction you notice. Tag m3-ui.
```

## P4 — Real Google Sheets + Drive (M4; only after H3 is done)
```
Milestone M4. Add adapters/google (OAuth desktop flow using secrets/google-oauth.json, token stored in .darby/keys, never logged). sheet.create/write/read through the Sheets API; share.grant through Drive permissions; verification uses a fresh API client: values read back match, and permission_present checks the permissions list. Open the sheet URL in a real tab and screenshot it (vision_check). Keep the local-xlsx adapter selectable by SHEET_ADAPTER=local|google. Case 1 must pass on a real Google Sheet. Tag m4-google.
```

## P5 — Failure and repair (M5)
```
Milestone M5, case 4. Executor must treat "Saved ✓" as an unverified claim. Verifier reads GET /api/leads and finds no record => FAILED with plain-language cause and no false success. Replanner (max 2 repairs) switches to the documented POST /api/leads path; run B is VERIFIED and its receipt has repairOf = run A id. Add vision_check verifier (screenshot + question; verifier never sees the agent's claim). Add acceptance tests. Tag m5-repair.
```

## P6 — GTM Studio (M6)
```
Milestone M6, case 3 and fixtures/gtm/brief.json. Implement gtm tools with fallbacks, each labelled in the receipt with which path was used: research (read the 3 competitor fixture pages via the reader), positioning + copy (LLM), hero image (image model if configured, else deterministic rendered card marked "generated placeholder"), voiceover (edge-tts or Azure Speech), 15-second teaser (ffmpeg: image + voice + captions), landing page code generated into workspace/landing, Playwright test of the page with page_assertions, vision_check on its screenshot, github.create_pr to the test repo (external_effect => approval). Add a Review panel in the UI showing image, audio player, video, page preview, PR link. Verdict NEEDS_YOU until the PR is approved, then VERIFIED after the GitHub API confirms the PR. Tag m6-gtm.
```

## P7 — Playbooks and Hub (M7)
```
Milestone M7, SPEC section 12. Save as Playbook from a verified receipt => playbooks/<slug>/SKILL.md + playbook.json (parameterised plan + contracts + permission manifest). Replay with new parameters (e.g. a different list of pages and sheet name) and re-verify. Hub view in the companion lists Playbooks; a CI badge appears only after npm run playbook:check passes (manifest valid, fixture dry run verified, injection suite contained). Tag m7-playbooks.
```

## P8 — Demo hardening (M8)
```
Milestone M8. One-command npm run demo (resets fixtures/.darby, starts everything, opens the companion). npm run demo:reset. Offline backup: record the replay provider for cases 1-4 so the whole demo runs without internet. Write docs/DEMO_SCRIPT.md with a timed 5-minute and 3-minute run of the four cases and the exact words to say at each beat. Finish README (setup, env, tests, architecture diagram as Mermaid in docs/ARCHITECTURE.md). Rehearse all cases from a clean clone; fix whatever breaks. Tag m8-demo.
```

---
## Q1 — Browser Use QA (any time after M3)
```
Use Browser Use to act as a first-time user of the Darby companion at http://localhost:5173. Run cases 1-4 from tests/acceptance/scenarios.json through the UI only. Report anything confusing, slow, unreadable or broken with screenshots; fix the small ones, list the rest. Save screenshots to docs/evidence/qa-*.png and add an entry to docs/ADAL_EVIDENCE.md.
```
## Q2 — Video Producer (intro + teaser)
```
Use Video Producer to make a 20-second 1080p intro for the Darby demo: calm product-style motion graphics, text "Darby — done means proven", no real brand logos or people. Save to docs/evidence/darby-intro.mp4 and note the prompt in docs/ADAL_EVIDENCE.md.
```
## Q3 — Debug assist (use when anything fails)
```
Here is the failing output/screenshot: <paste>. Find the root cause from the evidence, fix it, add a regression test, and log the bug and fix in docs/ADAL_EVIDENCE.md.
```
