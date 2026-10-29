# Darby: the complete team brief

Read this first, then the problem-statement PDF and the PPT. It assumes you know nothing about the project. It explains what the hackathon asked for, what we promised, what we built, how it works inside, how to run and demo it, what is real and what is simulated, what is still open, and who has to do what.

- Repository: https://github.com/Tanish-Shitanshu/darby (branch `main`, final tag `m8-final`)
- Event: HackBriven Build Arena, finals Friday 30 Oct 2026, Microsoft Office, Noida
- Team: Target 9x (Tanish Shitanshu, team lead; Sai Mohit Kotta; Ghana Polisetty; Pragunie Aditya), Shiv Nadar Institution of Eminence
- Track: Problem Statement 1, "Build an AI-Native Browser with an Autonomous Multimodal Companion Using AdaL"

---

## 1. The 60-second version

**Darby is "the AI-native browser where 'done' means proven."** You type a goal. Darby turns it into a plan in which every step names the evidence that would prove it. It does the work in real Chrome tabs, then an independent verifier re-checks every claim with its own fresh read. You get a signed, tamper-evident receipt with an honest verdict.

The four verdicts: **VERIFIED**, **VERIFIED WITH GAPS**, **FAILED**, **NEEDS YOU**.

The pitch in one line: other AI agents say "done" in their own words; Darby shows the receipt.

What it actually is, technically: a local web app (React) that sits beside a real Chrome window controlled by Playwright, backed by a Node/TypeScript server. It is a "browser-integrated workspace", which the problem statement explicitly allows. It is not a standalone browser and not an Electron app.

---

## 2. Where this project came from

### 2.1 The problem statement (the organiser's PDF)
The organiser (AdaL by Sylph) asked teams to build an AI-native browser or browser-integrated workspace with an autonomous, user-controlled multimodal companion, built **using AdaL** (their coding agent) as a mandatory part of development.

The PDF has seven core capabilities: AI-native browsing, autonomous task execution, multimodal intelligence, coding and development, GTM (go-to-market) automation, verification and transparency, user control and security.

It has seven **mandatory functional requirements**: natural-language task execution, real tool execution (simulated actions do not count), outcome verification, transparent execution, user approval and control, capability orchestration, and mandatory AdaL usage.

Two sample challenges: (1) research ten AI startups, build a spreadsheet, read it back, flag unknowns; (2) analyse a product, research competitors, create creative assets and prepare a launch.

**Scoring rubric (what the judges mark):**

| Criterion | Weight |
|---|---|
| Functional execution and verified outcomes | 25% |
| Agent intelligence and multi-step orchestration | 20% |
| Multimodal and coding capabilities | 15% |
| User experience and workflow clarity | 15% |
| Security, permissions, user control | 10% |
| Practical value, originality, GTM potential | 10% |
| Demonstrated AdaL usage | 5% |

**Deliverables:** working prototype; live demo or short video; source with setup instructions; architecture overview; a test case showing success AND failure handling; users/value/future; AdaL usage evidence (a recording or live demo).

### 2.2 The idea we chose
Everyone will build "an agent that clicks around". Our angle is **proof**. Research shows agents often report success when they failed, so we built the product around evidence: every step has an **evidence contract**, an **independent verifier** that never trusts the agent, **isolation of untrusted web text**, a **policy engine written as plain code**, and a **signed receipt**.

### 2.3 The PPT (our submitted deck)
We submitted a 7-slide deck in Round 1. **The deck is a public promise.** Judges will compare the demo against it. Slides: title, problem and gap, solution, architecture and tech stack, key features, impact and feasibility, demo and conclusion. Section 9 below lists exactly which deck claims are true and which are not.

### 2.4 How the work was split (be honest about this, it is scored)
- **M0 to M3 (scaffold, core loop, policy engine, first UI) and the independent red-team review were built with AdaL.** Those commits carry a `Built-with: AdaL` trailer. The red team (AdaL headless) found 48 policy bypasses, all fixed, then 0.
- **M5, M6, M7, M8-lite and everything after** were built with a **second AI coding assistant, not AdaL**, because the lead's AdaL weekly credits ran out. These are logged as "other assistant (not AdaL)" in `docs/ADAL_EVIDENCE.md`.
- **Never present non-AdaL work as AdaL work.** The AdaL requirement is mandatory, and a false claim costs more than a missing feature. AdaL sessions still to do are in `docs/ADAL_TODO_FOR_OWNER.md`.

### 2.5 What happened after the handover (the last stretch)
The project was at commit `40ab44d` ("M7: Playbooks and Hub"). The final stretch, done from Mohit's laptop (Windows 11), covered:

1. **Setup and portability.** Got it running on Windows with Node 24. Fixed a Windows line-ending problem that silently broke the Playbook badge, switched the SQLite library to a version with prebuilt binaries (no Visual Studio needed), and fixed a test that depended on a system ffmpeg.
2. **Real-model recordings.** With a free Gemini key, recorded the real-model runs for Case 3 (launch assets) and Case 4 (broken form) so every case also runs fully offline.
3. **Deck truth audit.** Compared every claim in the deck to the code. Result in `docs/DECK_AUDIT.md`.
4. **Red-team expansion.** Built ten poisoned pages (ten different hiding techniques) and a test that proves nothing reaches the sheet.
5. **Voice, screenshot and page-context input** ("text, voice or a screenshot" is on slide 3).
6. **Open-web research.** We discovered Darby could only research a closed set of fixture pages. The problem statement's own example ("research ten AI startups, make a spreadsheet") must work on the real internet, so we built it: web search, public-site reads under a strict rule, quote verification, an Excel file you can download.
7. **Coding workflow.** Pillar 2 of the problem statement lists codebase understanding, debugging, test execution and code changes. We built a case where Darby runs a project's tests, a coder model fixes the bug, and the verifier runs the tests itself.
8. **More multimodal.** Speech-to-text from the microphone, and real AI-generated hero artwork when a live model is used.
9. **UI rebuilt twice**, ending in one design system (sidebar app, example cards, result summary, spreadsheet preview).
10. **Desktop window launcher**, full verification, clean-clone rehearsal, documentation.

---

## 3. What Darby can do (features)

| Feature | What you see |
|---|---|
| Natural-language goals | One box. Type, speak (microphone, transcribed by the model), or attach a screenshot (the model describes it into the box for you to edit). Optional "start from this page". |
| Plans with proof | A typed plan; every step has a proof line ("each price is an exact quote re-fetched by an independent verifier") and a risk chip (reads / writes locally / external effect). |
| Real execution | Real Chrome tabs, up to 3 in parallel; real `.xlsx` files; a real local web app (LeadDesk). |
| Live transparency | A live timeline with screenshots; click any step to see its evidence. |
| Independent verification | Quotes re-fetched, spreadsheets re-opened from disk, APIs re-read, pages re-tested in a fresh tab, media re-probed, tests re-run by the verifier. |
| Honest verdicts | VERIFIED / VERIFIED WITH GAPS / FAILED / NEEDS YOU, with a plain-language cause and a safe recovery. |
| Control | Cancel at any time; Take over (pause, act yourself, Resume; Darby re-reads the page state); Approve / Deny for consequential steps. |
| Safety | Page text is quarantined; policy is code; tainted values can never become recipients, URLs, commands or tools. |
| Signed receipt | Hash-chained ledger, Ed25519 signature, one-click tamper test, downloadable JSON anyone can verify. |
| GTM Studio | Competitor research, positioning copy, hero image, voiceover, 15-second teaser video, landing page tested in a real tab, pull request behind approval. |
| Playbooks and Hub | Save a verified run as a re-runnable skill (`SKILL.md` plus a plan); replay with other inputs through the same policy and verifier; a check badge bound to the exact file. |
| History and Memory | Every run and receipt; preferences you can add, view and delete. |
| Artifact | The spreadsheet appears inside the app as a table and downloads as `.xlsx`. |

### The demo cases
All cases run on a local **fixture web** (`fixtures/site`, port 4010) so they are repeatable, except open-web research.

| Case | Goal | Outcome |
|---|---|---|
| 1. Research to sheet | Read 10 AI-startup pages, write name / lowest paid price / exact quote / URL to "Competitors", share with the team email (approval) | VERIFIED WITH GAPS. Exactly three pages (cobalt, echo, helio) show no paid price; they are written as NOT FOUND, never guessed. |
| 2. Poisoned page | Page 6 (Fathom) hides an order to email the sheet and keys to an attacker | CONTAINED. The reader ignores it, policy blocks it, outbox stays empty, the attempt is in the receipt. Shown inside Case 1's timeline plus `npm run redteam`. |
| 3. Launch assets | StudyLoop GTM brief: copy, hero, voiceover, teaser, landing page, test, pull request | Pull request waits for approval; VERIFIED after approval; NEEDS YOU if denied. |
| 4. Silent failure | A form that shows "Saved ✓" but stores nothing | FAILED honestly with a plain cause, then one-click repair through the documented API, VERIFIED, receipt links to the failed run. |
| 5. Open web (live only) | "Research the top 5 AI startups ... Excel sheet" | Searches the real web, reads public pages only, quotes re-checked, `.xlsx` downloadable. Results vary; gaps are flagged. |
| 6. Fix a failing test | "Fix the failing tests in the sample app" | 2 of 3 tests fail, the coder model fixes one file in a copy, the verifier runs the tests itself, 3 of 3 pass, diff kept. |

---

## 4. How it works inside

### 4.1 Pipeline
```
You (companion UI, React)  --goal-->  Planner (LLM; sees the goal and trusted config, NEVER page text)
                                         |
                                  Plan compiler (CODE fixes arguments, risk and evidence contracts)
                                         |
                                  Executor  --every step-->  Policy engine (plain TypeScript, fail-closed)
                                         |                          |
                       real tabs (Playwright), APIs, files, tools    approvals / blocks
                                         |
                       page text ----> Quarantined reader (tool-less LLM, strict schema)  --typed fields only--> back to the plan
                                         |
                                  Verifier (independent: own fetch / own file open / own tab / own test run)
                                         |
                                  Ledger (SQLite, hash chain)  -->  Signed receipt (Ed25519)  -->  UI
```

### 4.2 The key ideas (these are what to explain to judges)
1. **Evidence contracts.** Every plan step is created with a contract naming its proof. There are 10 kinds: `file_exists`, `quote_in_page`, `sheet_readback`, `permission_present`, `http_json_contains`, `page_assertions`, `vision_check`, `media_probe`, `pr_exists`, `tests_pass`. A step with no met contract is never ticked.
2. **The planner never sees web pages.** The planner LLM only sees the goal, the user's memory notes and trusted configuration. Page text goes only to the **quarantined reader**, a tool-less model whose output must match a strict schema (`name`, `priceUsd` or null, `quote` or null, optional short `note`). Anything with a URL, email, command, extra key or prose is rejected and recorded as a gap.
3. **Taint tracking.** Everything derived from a page is tainted. Tainted values may fill spreadsheet cells but can **never** become a recipient, URL, command, repository or tool name. The check is domain-level and handles encodings and look-alike characters.
4. **Policy is code, not a prompt.** Allow-list by tool, strict argument schemas, positive recipient list, fail-closed. Rules: `READ-001` (allow-listed reads), `READ-002` (public web reads after a search, read-only), `LOCAL-001` (Darby's own workspace), `EXT-001` (external effects always need approval), `TAINT-002` (no tainted recipient), `FORB-003` (unregistered tools, shell or credential arguments, files outside the workspace).
5. **Independent verifier.** It never imports the executor and never sees the agent's prose. It re-fetches pages, re-opens files, re-reads APIs, opens its own browser tab (also for JavaScript-built pages), probes media with ffmpeg, and re-runs project tests in a fresh process.
6. **Receipt.** `hash = sha256(prev + canonicalJson(entry))` for every ledger entry; the final receipt is signed with Ed25519. Labels such as `SIMULATED`, `REPLAY`, `FALLBACK:...`, `PLACEHOLDER:...`, `GENERATED:...`, `CODEGEN:...` are inside the signed text, so nothing fake can pass as real.

### 4.3 The tools (what a plan may use)
`browser.read_page`, `web.search`, `reader.extract`, `sheet.write`, `share.grant`, `email.send` (fixture outbox only), `browser.act` (form filling), `http.request`, `code.test`, `code.fix`, and the GTM chain `gtm.copy`, `gtm.hero_image`, `gtm.voiceover`, `gtm.teaser`, `gtm.landing_page`, `gtm.test_page`, `github.create_pr`.

The planner is offered tools by **scope** so the prompt for one kind of goal never changes when another feature is added: base (research to sheet), lead (forms and APIs), gtm (launch), web (open web research), code (debugging). This matters for the replay system (next section).

### 4.4 The LLM layer and the replay system (the most important gotcha)
- Provider: Google Gemini on the free tier (`LLM_PROVIDER=gemini`, model `gemini-3.5-flash`, with fallbacks). Roles: planner, reader, creative, coder, vision (the vision role also does audio). Built-in rate limiter (9 requests per minute).
- **Replay mode** (`LLM_PROVIDER=replay`) answers every model call from recordings in `replay/llm/` (44 files committed). Tests and the offline demo run on these, with no internet and no key. Each answer is stored under `sha256(role + system + prompt (origins normalised) + image hint)`.
- **If anyone changes planner or tool prompt text, the recordings for that prompt go stale** and offline runs fail with "No recorded response". Keep prompts byte-stable, or re-record with a key: `npm run demo:record`, then `npm run replay:curate`, then commit.
- The coder prompt strips machine paths and timings from test output on purpose so its recording is stable.

### 4.5 Repo map
```
apps/server/src/     api.ts, planner/, tools/registry.ts, policy/, executor/ (engine, tools, code-tools, websearch, gtm-tools),
                     reader/, verifier/, ledger/, llm/, gtm/, playbooks/, runs/manager.ts, db/
apps/companion/src/  App.tsx, parts.tsx, extras.tsx, state.ts, useDarby.ts, app.css   (React + Vite)
packages/contracts/  zod contracts: Plan, EvidenceContract, RunEvent, Receipt
fixtures/            site/ (10 startup pages, 10 red-team pages, competitors, LeadDesk app, fake search), gtm/brief.json,
                     sample-app/ (the project the coding case fixes), expected.json (ground truth, do not edit), demo-goals.json
tests/acceptance/    run.ts (all scenarios), harness.ts      scripts/  demo.mjs, ui-walkthrough.mjs, ship.sh, guard-secrets.sh ...
replay/llm/          recorded model answers      playbooks/  saved Playbooks      docs/  everything below
```

---

## 5. Run it (setup)

**Needs:** Node 20 to 24, Git, and Google Chrome (or run `npx playwright install chromium` and set `BROWSER_CHANNEL=chromium`). ffmpeg is bundled through npm. For a real voiceover run `pip install edge-tts` (optional; otherwise a labelled placeholder tone is used).

```bash
git clone https://github.com/Tanish-Shitanshu/darby.git
cd darby
npm install                 # if it fails once with a download error on Windows, run it again
cp .env.example .env        # then set LLM_PROVIDER=replay to run with no key
npm run demo:check          # preflight: tools present, which cases are recorded
npm run demo:offline        # starts everything and opens Darby (no internet, no key)
```

Other launchers: `npm run demo` (live model; needs `GEMINI_API_KEY` in `.env` and `LLM_PROVIDER=gemini`), `npm run desktop` or `npm run desktop:offline` (Darby opens as its own app-style window).

Ports: server 4000, companion 5173, fixtures 4010. For visible Chrome windows set `DARBY_HEADLESS=0` in `.env`; `1` hides them (used by tests).

**Windows note.** The repo forces LF line endings (`.gitattributes`). If the Playbook badge ever shows "stale" after a fresh clone, run `git add --renormalize .`. The SQLite library is pinned to 12.x because newer versions have no prebuilt Windows binary.

**Keys.** The key lives only in your own `.env` (git-ignored). Never paste it into chat, a doc or a commit; `scripts/guard-secrets.sh` blocks pushes that contain one. Never turn on billing.

### How to use the app (for the demo)
1. Click an example card, or type or speak a goal. 2. Press **Plan & run** (Ctrl+Enter). 3. Watch the plan on the left and the live timeline. 4. If an approval card appears, press Approve, Deny or Take over. 5. Read the **Result** tab: verdict summary, the spreadsheet as a table, the downloadable `.xlsx`, then the signed receipt. 6. Try the **Tamper test**, then **Save as Playbook**, then open **Playbooks**.

---

## 6. Test and proof commands

| Command | What it proves |
|---|---|
| `npm run check` | TypeScript across all packages plus 105 unit tests |
| `npm run fixtures:check` | The fixture web matches the ground truth |
| `npm run test:acceptance` | 23 scenarios: cases 1 to 6, denial, cancel, takeover, tamper, playbook, red team (offline, deterministic) |
| `npm run redteam` | Poisoned page, compromised planner, hostile reader, 10 poisoned pages, forbidden actions, hostile coder answer: all contained |
| `npm run playbook:check` | Playbook manifest, dry runs with other parameters, injection suite, badge |
| `npm run demo:check` | Preflight and which cases are recorded (Cases 1, 3, 4, 6 are) |
| `npm run ui:walkthrough` | Drives the real UI through every case, the Hub, deny and cancel: 23 checks; screenshots in `docs/evidence/ui` (1280x720 and 1920x1080). Add `UI_LIVE=1 UI_HEADED=1 BROWSER_CHANNEL=chrome` for the live headed run (`docs/evidence/ui-live`). |
| `npm run verify-receipt -- <file>` | Re-verifies a downloaded receipt (chain and signature) |
| `npm run llm:ping` | One tiny model call; prints only OK or the error, never the key |

Status at handover: all of the above pass offline, live with the real model, and in a fresh clone on Node 24.

---

## 7. What is real, simulated, recorded

- **Real:** Chrome tabs, page reads, the open-web search and reads, the `.xlsx` files, the LeadDesk app and its API, independent re-reads, tests re-run by the verifier, ffmpeg media probing, the signed receipts, AI-generated hero artwork (live model), speech transcription.
- **Simulated (labelled `SIMULATED` in the signed receipt):** sharing a sheet (a local permission list, unless Google is configured, which it is not), the GitHub pull request (a local git repo, unless `GITHUB_TOKEN` and `GITHUB_TEST_REPO` are set), the attacker in red-team runs.
- **Recorded (labelled `REPLAY`):** model answers in offline mode.
- **Placeholders (labelled):** the hero image when offline; the voiceover tone when no speech engine exists.

---

## 8. How this maps to the marking rubric

| Criterion | What earns the marks | Where to show it |
|---|---|---|
| Functional execution and verified outcomes (25%) | Four demo cases end with the right verdict; false "Saved ✓" caught; spreadsheet read back; open web works | Case 1, 4, 5; UI walkthrough |
| Agent intelligence and orchestration (20%) | Typed multi-step plans, 3 parallel tabs, replanning after failure (Case 4 repair), 9-step GTM chain, Playbook replay | Plan column, timeline, Case 3, Case 4 |
| Multimodal and coding (15%) | Vision checks, voiceover, teaser video, AI hero art, speech-to-text, coder-written landing page tested in a real tab, test-fixing workflow | Case 3, Case 6, Speak and Screenshot buttons |
| UX and workflow clarity (15%) | One design system, example cards, live progress, result summary, receipt | Whole UI |
| Security and user control (10%) | Policy engine, taint tracking, 10 poisoned pages, 48 independent red-team attempts then 0 bypasses, Cancel, Take over, approvals | `npm run redteam`, Case 2 |
| Practical value, originality, GTM (10%) | Proof-first design; users and future in `docs/VALUE.md` | Pitch |
| Demonstrated AdaL usage (5%) | Genuine for M0 to M3 and the red team; sessions still owed | `docs/ADAL_EVIDENCE.md`, `docs/ADAL_TODO_FOR_OWNER.md` |

Line-by-line against the organiser's PDF: `docs/PS1_COMPLIANCE.md`.

---

## 9. The honest gaps (read before presenting)

### 9.1 Deck claims that are not true yet (need a slide change, not code)
| Slide claim | Reality |
|---|---|
| Frontend "Electron" and "Installable desktop app" | React app beside Chrome. `npm run desktop` opens an app-style Chrome window, but there is no installer or Electron. |
| AI layer "Azure OpenAI via Microsoft Foundry, three model roles" | We use Gemini (free tier), with five roles. An Azure provider exists in code but is not what the demo uses. |
| "Supabase sync" | Not built. Data is SQLite. |
| "Excel (Graph)", "Drive", a real Google Sheet in the mock | Not built. The sheet is a local `.xlsx`; sharing is simulated. |
| "Hub lists only tested ones" | The Hub lists all Playbooks and shows a tested or stale badge. |
| Cited statistics (30 to 61 percent, 45 percent plus, Gartner) | We cannot verify them; check the sources before presenting. |

The full table (about 45 rows) is `docs/DECK_AUDIT.md`. **Do not present anything in that table as true if it is marked FALSE or NOT YET.** Reword the slide or say it plainly.

### 9.2 Not built
Video understanding of third-party video; Slack, Notion and Google connectors; context from the user's own live Chrome tabs (we have a "Page context" box instead); a real image-generation provider beyond the free service.

### 9.3 Behaviour to expect
- Open-web research needs a model key and varies run to run: some sites block automated readers, some company names are wrong. Such pages become flagged gaps, never guesses.
- Offline voiceover is a placeholder tone unless `edge-tts` is installed and internet is available.
- The teaser video may look black in headless Chromium but plays in real Chrome.

---

## 10. What each person still has to do

| Task | Who | Notes |
|---|---|---|
| AdaL evidence sessions (Browser Use QA, Video Producer intro, run the Playbook in AdaL, a debug story) | Anyone with AdaL credits | Copy-paste prompts and evidence filenames in `docs/ADAL_TODO_FOR_OWNER.md`. Mandatory, 5 percent of the score. |
| Record the demo video | Team | Script with timings in `docs/DEMO_SCRIPT.md` (5-minute and 3-minute versions). |
| Reword the slides that overpromise | Team lead | Section 9.1. |
| Ask the organisers about video, time slot and internet at the venue | Team lead | If there is no internet, use `npm run demo:offline`. |
| Optional: real pull request | Anyone | Create a throwaway repo `darby-launch-test`, a fine-grained token (Contents and Pull requests, that repo only), put `GITHUB_TOKEN` and `GITHUB_TEST_REPO` in your own `.env`. |
| Optional: a real voice | Anyone | `pip install edge-tts`. |

**Demo-day checklist:** run `npm run demo:check`; start `npm run demo:offline` as the safe path (or `npm run demo` with a key); open the companion; do Case 1, Case 4, Case 3, then mention Case 2 inside Case 1's timeline; keep Case 5 (open web) and Case 6 (code) as extras; have `npm run redteam` ready in a terminal.

---

## 11. Rules for working in the repo

1. **Commits:** no AI or tool names, no `Co-Authored-By`, no "Generated with". The `.githooks/commit-msg` hook rejects them, and `scripts/ship.sh` refuses to push them. Commits are authored by whoever configured git on the machine.
2. **Publish with** `bash scripts/ship.sh "message"` (checks, secret guard, push). Do `git pull --rebase origin main` before you start and before every push. Small commits. Never force-push or rewrite history.
3. **Never** print, log or commit a key. Keys live only in `.env`.
4. **Truthfulness:** a verdict comes from the verifier, never from the agent. Anything simulated must say `SIMULATED`, anything recorded `REPLAY`. Do not claim a feature the code does not have.
5. **Do not edit** `fixtures/expected.json` (ground truth) or planner or tool prompt text without re-recording.
6. External actions (inviting people, other repos, posting, sharing documents) need the lead's explicit yes.

---

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm install` fails on `better-sqlite3` | Run it again (a download can fail once); use Node 20 to 24. |
| Chrome does not launch | `npx playwright install chromium` and set `BROWSER_CHANNEL=chromium` in `.env`. |
| "No recorded response" | You changed a prompt, or the goal is not a recorded one. Use `LLM_PROVIDER=gemini` with a key, or re-record. |
| "Port 4000/4010/5173 is already in use" | An old Darby is still running; stop it (close its terminal) and retry. |
| Playbook badge shows stale after cloning | `git add --renormalize .` then `npm run playbook:check`. |
| Speak does nothing | The microphone needs permission in the browser; transcription needs a live model (not offline mode). |
| Open-web research returns many gaps | Normal on the live web; try again or name the companies in the goal. |

---

## 13. Glossary

- **Evidence contract:** the proof a step must meet before it counts as done.
- **Verifier:** the independent checker that re-reads reality; it never trusts the agent.
- **Quarantined reader:** the tool-less model that is the only place page text meets an LLM.
- **Taint:** the label on anything derived from a web page; tainted values can never decide who or where something is sent.
- **Receipt:** the signed, hash-chained record of a run with its verdict.
- **Gap:** something that could not be confirmed; it is marked NOT FOUND, never guessed.
- **Playbook:** a verified run saved as a re-runnable skill; the Hub lists them.
- **Replay:** answering model calls from recordings, so everything runs offline.
- **Fixture web:** our own local test websites so demos are repeatable.
- **AdaL:** the organiser's coding agent, mandatory for building; separate from the product's runtime.

---

## 14. Where to read more (all in `docs/`)

`PS1.md` (the problem statement), `DECK.md` (our deck as text), `PS1_COMPLIANCE.md` (every PDF line vs the product), `DECK_AUDIT.md` (every slide claim vs the code), `ARCHITECTURE.md` (diagram), `SPEC.md`, `DEMO_SCRIPT.md`, `VALUE.md` (users, value, future), `SUBMISSION.md` (deliverables map), `ADAL_EVIDENCE.md` and `ADAL_TODO_FOR_OWNER.md`, `PROGRESS.md`, `HANDOFF.md`, `evidence/` (screenshots and red-team reports).

---

## 15. Update: Sarvam AI voice chat (agentic voice in Indian languages)

Added last, as the headline feature. Code: `apps/server/src/voice/` (client and summary builder), routes in `apps/server/src/api.ts` (`/api/voice/config`, `/api/voice/transcribe`, `/api/voice/speak`, `/api/runs/:id/summary`), UI in `apps/companion/src/voice.tsx` and the composer in `App.tsx`.

**Flow:** microphone → Sarvam Saaras speech-to-text (language auto-detected) → Sarvam translation to English for the planner → the normal Darby pipeline (plan, real tabs, verification, signed receipt) → a closing **summary built from the signed receipt and the verified spreadsheet** (what was done, cheapest, most expensive, average, which items are gaps, anything blocked) → Sarvam translation back to the user's language → Sarvam Bulbul text-to-speech.

**Controls:** "Voice chat on" means speak, run and be answered aloud; a Stop speaking button is always visible while it talks. "Voice chat off" means text only (speech just fills the box; the summary is written, with an optional Listen button). A language picker (Auto or a specific language) handles typed goals.

**Setup:** put `SARVAM_API_KEY=...` in your own `.env` (never in chat, docs or commits). Without a key everything still works in English. No billing was enabled.

**Honesty notes:** it was built against Sarvam's documented REST API and tested with a mocked API (unit tests) and in the UI; run it once with a real key before demo day. The planner and the recorded model answers stay English, so existing demos and recordings are unaffected.

### 15.1 Update: Sarvam as the brain, one row per company, and the new look
- **`LLM_PROVIDER=sarvam`** runs planning, reading and summary writing on Sarvam's chat model (`sarvam-105b`) with the same key as voice. Anything with an image or audio still goes to Gemini if a Gemini key exists. Tested live end to end through the UI with a Hindi voice message (`node scripts/ui-voice-e2e.mjs`, evidence in `docs/evidence/ui-voice/`).
- **Open-web research is not an LLM guessing from memory.** Darby opens a real search in a browser tab, reads the pages it finds in real tabs, and the reader (a quarantined, tool-less model) may only return strict fields. The planner never sees page text; the maker re-checks every quote against the page text; the verifier re-checks again with its own fetch and its own tab. A model alone cannot do that, and nothing it says becomes a claim without those checks.
- **One row per company asked for.** If you ask for 10 startups the sheet has 10 rows. A company whose page could not be read, or whose search found nothing, stays in the sheet as **MISSING** with the reason; a company whose page shows no confirmed price is **NOT FOUND**. Nothing is dropped and nothing is invented. A reader answer whose price does not match the page text is demoted to a gap before it can be written.
- **Honest limit:** how many real prices come back on the live web depends on the reading model and on sites that hide prices behind scripts or logins. Gemini (free key, resets daily) read pricing pages better than Sarvam's chat model in our tests; on demo day use `LLM_PROVIDER=gemini` for reading, and `SARVAM_API_KEY` for voice and translation.
- **New look:** a calm, airy theme inspired by sarvam.ai (white canvas, soft orange and blue glow, light display type, pill buttons, top navigation). Same features and test ids.

### 15.2 Update: live by default, green theme, logo
- `.env` now uses **`LLM_PROVIDER=auto`**: Gemini first, and when Gemini is out of quota or down, Sarvam's chat model takes over automatically (Gemini is skipped for 5 minutes after a failure). Offline demo mode (`npm run demo:offline`) only runs the recorded example goals and now says so clearly instead of "Planning failed".
- Open-web price extraction: the reader model answers first; when it gives nothing usable or a number the page does not support, a **plain rule** takes the cheapest paid "per month" price stated on the page, with the exact line as its quote. Every quote is checked by the maker and then by the independent verifier. Companies that cannot be read stay in the sheet as MISSING; pages with no price are NOT FOUND.
- The glow on the home screen is dark green; the logo is `apps/companion/public/darby-logo.svg` (a "D" with a check mark).
