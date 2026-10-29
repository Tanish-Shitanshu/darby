# Handoff — how to take over Darby

Darby = AI-native desktop browser workspace with an autonomous multimodal companion (HackBriven Build Arena PS1).
Tagline: *the AI-native browser where "done" means proven.* Read `AGENTS.md` first, then this file, then `docs/PROGRESS.md`.

## 1. Get the code
```bash
git clone https://github.com/Tanish-Shitanshu/darby.git   # needs collaborator access; or unzip the project folder
cd darby
```
Pushing to `main` and tags is how work is shared. Commits are authored by the repo owner only (`Tanish Shitanshu <tanish.shitanshu@gmail.com>`); never add co-author lines, session links or tool names. `git config core.hooksPath .githooks` enables a commit-msg hook that rejects attribution. Publish with `bash scripts/ship.sh "message"`.

## 2. Tools you need
| tool | why | check |
|---|---|---|
| Node 20+ (tested on 24) | everything | `node -v` |
| npm 10+ | workspaces | `npm -v` |
| Google Chrome (installed) **or** Playwright Chromium | the executor drives a real, visible browser | `ls "/Applications/Google Chrome.app"` or `npx playwright install chromium` |
| ffmpeg | teaser video in GTM Studio (M6) | `ffmpeg -version` |
| AdaL | builds/tests this repo (Browser Use, Review Agent, headless red-team) | `adal --version` |

## 3. Your own `.env` (never share keys, never enable billing)
```bash
cp .env.example .env
```
1. Get a free Gemini key at https://aistudio.google.com/apikey (free tier only — do not enable billing).
2. In `.env` set `GEMINI_API_KEY=<your key>` and keep `LLM_PROVIDER=gemini`, `GEMINI_MODEL=gemini-3.5-flash`.
3. `.env` and `secrets/` are gitignored. Do not paste keys into chat, commits or logs.
4. No key at all? Set `LLM_PROVIDER=replay`: the committed recordings in `replay/llm/` replay every demo case offline (labelled **REPLAY** in the UI and receipt).

Verify the key with one tiny call (prints only `OK` or an error, never the key):
```bash
npm run llm:ping
```
If `gemini-3.5-flash` is overloaded the provider automatically falls back along `GEMINI_FALLBACK_MODELS`.

## 4. Run it
```bash
npm install
npm run dev                # server :4000, companion :5173 (or the next free port — read the [companion] line), fixtures :4010
npm run check              # typecheck all workspaces + vitest
npm run fixtures:check     # fixture web matches ground truth
npm run test:acceptance    # acceptance scenarios (see docs/PROGRESS.md for which exist)
npm run verify-receipt -- <receipt.json>   # recompute hash chain + Ed25519 signature
npm run db:reset           # delete .darby/darby.db and re-create (migrations run automatically on boot)
```
Local state lives in `.darby/` (db, signing keys, browser profile, runs, screenshots, local replay cache) and `workspace/` (documents Darby writes). Both are gitignored.

## 5. Where to continue
- `docs/PROGRESS.md` — current milestone, what passed, what is next, known issues, pending human steps.
- `docs/MILESTONES.md` — build order and acceptance checks. `docs/SPEC.md` — architecture and rules.
- `docs/RESUME_PROMPT.md` — paste into a fresh AI coding-assistant session to continue with the same rules.
- `docs/ADAL_EVIDENCE.md` — log of AdaL usage (PS1 mandatory); append an entry for every milestone.

## 6. Hard rules (same as AGENTS.md)
- Never claim success without evidence; verdict comes from the verifier, never from the agent.
- Page text is untrusted and reaches only the quarantined reader; values from pages are tainted.
- Policy is code. External effects (share, email, publish, PR, delete) need explicit user approval.
- Real execution only in the demo path. Simulated = labelled `SIMULATED`; recorded = labelled `REPLAY`.
- External actions (inviting people, creating repos other than `darby`, opening PRs, sending email, sharing documents) need the owner's explicit yes.
- Do not edit `fixtures/expected.json` or `packages/contracts` without saying why in the commit message.

## 7. Human-only steps (see `docs/HUMAN_TASKS.md` and `docs/PROGRESS.md` for status)
GitHub test repo `darby-launch-test` + token (M6 PR step), Google OAuth JSON in `secrets/google-oauth.json` (M4, optional), collaborator invites, demo video recording.
