# Darby — project instructions for AdaL

Darby is an AI-native desktop browser workspace with an autonomous multimodal companion, built for HackBriven Build Arena **PS1** (docs/PS1.md). The submitted deck (docs/DECK.md) is our public commitment: the prototype must make every slide true. Tagline: *the AI-native browser where "done" means proven.*

## What Darby does (one paragraph)
The user gives a goal in plain language. Darby compiles a typed plan where every step carries an **evidence contract** (what proof counts). It executes in a **real Chromium** (Playwright/CDP) and real apps/APIs. Untrusted page text goes only through a **quarantined reader** (tool-less model, schema-only output). A **policy engine** (plain code) gates risky steps behind user approval. An **independent verifier** checks the real result and never sees the agent's claim. Every run ends in a **tamper-evident signed receipt** with one verdict: VERIFIED, VERIFIED_WITH_GAPS, FAILED or NEEDS_YOU.

## Read first
1. docs/SPEC.md (architecture, tools, policy, verifier, receipts, the 4 demo cases)
2. docs/MILESTONES.md (build order with acceptance checks)
3. packages/contracts/src/index.ts (shared zod contracts — the source of truth)
4. fixtures/ (local fixture web + ground truth) and tests/acceptance/scenarios.json

## Non-negotiable rules
- **Never claim success without evidence.** A step is "passed" only when its contract is verified by code that did not come from the agent's own claim.
- **Page text is untrusted.** It may reach only the quarantined reader. Reader output must validate against `ExtractedRecord` (strict). Values derived from pages are tainted and can never become a recipient, URL, command or tool name.
- **Policy is code, not a prompt.** Risk tiers and approvals are enforced in TypeScript. External effects (share, email, publish, PR, delete) always need explicit user approval, shown with full details.
- **Real execution only** for the demo path: real browser tabs, real files/Sheets/GitHub test repo. Anything simulated must be labelled `SIMULATED` in the UI and the receipt.
- **Honest failure.** If verification fails or times out, the verdict is FAILED or NEEDS_YOU, never VERIFIED. Show the cause and offer a safe recovery.
- **Reliability over breadth.** Fewer working features beat many flaky ones. Prefer boring libraries. No infrastructure we don't need.
- Secrets only from `.env` / `secrets/` (both gitignored). Never log keys. Browser Use / AdaL test runs use test accounts only.
- Do not edit `fixtures/expected.json` or `packages/contracts` without saying why in the commit message.

## Stack (decided)
Node 20+, TypeScript everywhere. `apps/server`: Express + ws, Playwright, better-sqlite3, zod, exceljs, googleapis. `apps/companion`: Vite + React + TS. `packages/contracts`: zod types. LLM layer is pluggable (Azure OpenAI via Microsoft Foundry first, OpenAI-compatible fallback, `replay` provider for deterministic tests). Optional last: Electron shell in `apps/desktop`.

## How to work
- Work milestone by milestone (docs/MILESTONES.md). Finish and verify one before starting the next.
- After each milestone: run the checks listed for it, then use **Browser Use** to open the running companion UI and capture a screenshot into `docs/evidence/`, then append an entry to `docs/ADAL_EVIDENCE.md`.
- Small commits. When AdaL did the work, end the commit message with the trailer `Built-with: AdaL`; never add any other tool or assistant attribution (the `.githooks/commit-msg` hook rejects it). Tag each finished milestone (`git tag m1-core-loop`). Commits are authored only by Tanish Shitanshu <tanish.shitanshu@gmail.com>; never add co-author lines. Repo `darby` is owned by him; collaborators (write access): CipherEnigma, mohit4learning@gmail.com, pghana365@gmail.com. Push main and tags after each milestone.
- When something fails, debug from evidence (logs, screenshots, failing test), fix the root cause, and note it in docs/ADAL_EVIDENCE.md.
- Keep README.md accurate: setup, env vars, how to run the demo, how to run tests.

## Human checkpoints (IMPORTANT — you must ask, not guess)
Some steps only the human (Tiger) can do. When you reach one, STOP, tell him in plain words exactly what you need, give numbered click-by-click steps, say where to put the result (`.env` or `secrets/`), and wait for his answer. Never invent keys, never hard-code secrets, never silently skip. If he says "skip", switch to the listed fallback and note it in the README and docs/ADAL_EVIDENCE.md.
| when | what you need from him | fallback |
|---|---|---|
| start of M0 (preflight) | `node -v` >= 20, `ffmpeg -version`, `git config user.name/email` set; confirm project folder is writable | install via brew / ask him to run the command |
| before M1 | LLM key: Azure OpenAI (Microsoft Foundry) endpoint + key + deployment name, or any OpenAI-compatible key | `replay` provider (tests only, no live planning) |
| M0 (GitHub) | Tiger logs in to `gh` (`gh auth login`) as the repo owner, approves repo creation and the collaborator list | give him web steps (Settings > Collaborators) |
| before M2 | none | |
| before M4 | Google Cloud project, Sheets + Drive APIs enabled, OAuth Desktop client JSON saved as `secrets/google-oauth.json`, a second Google address for `SHARE_TEST_EMAIL` | `SHEET_ADAPTER=local` (xlsx + SIMULATED share) |
| before M6 | `GITHUB_TOKEN` (fine-grained, test repo only) + empty test repo `darby-launch-test`; optional image-model key | PR step stays NEEDS_YOU with a saved patch; image = labelled placeholder |
| before any external effect | his explicit approval in the companion UI | none — never bypass |
Also ask him to confirm before you run anything that installs global software or changes system settings.

## Use AdaL's own features (we are judged on this — do it for real)
Browser Use to test the live UI after every milestone; headless `adal -q` for the red-team; Video Producer / image models for the demo intro; Review Agent on each milestone diff before tagging (save its findings to docs/evidence/); GitHub connector for the test-repo PR check; skills (`SKILL.md` Playbooks); `/init` output kept in sync with this file. Log each use in docs/ADAL_EVIDENCE.md.

## Commands (keep these working)
`npm run dev` (server + companion + fixtures) · `npm run check` (typecheck + unit tests) · `npm run test:acceptance` · `npm run fixtures:check` · `npm run verify-receipt -- <file>` · `npm run redteam`
