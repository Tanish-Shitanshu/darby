# Darby — the AI-native browser where "done" means proven

HackBriven Build Arena · PS1 · Team Target 9x

Darby gives you an autonomous companion inside a real browser. You state a goal; Darby plans it with a proof for every step, does the work in real tabs and real documents, checks the result independently, and hands you a signed receipt with an honest verdict.

> Status: M0–M3 (core loop, policy, UI) built with AdaL; M5 (failure + repair), M6 (GTM Studio) and M7 (Playbooks + Hub) built with a second AI assistant (see docs/ADAL_EVIDENCE.md · docs/SUBMISSION.md · docs/DECK_AUDIT.md · docs/VALUE.md · docs/ADAL_TODO_FOR_OWNER.md for who did what). Four demo cases: research to sheet, poisoned page contained, launch assets, broken form repaired. See docs/PROGRESS.md for what is built and what is next, docs/HANDOFF.md to take over, docs/ARCHITECTURE.md for the diagram, docs/DEMO_SCRIPT.md for the demo.

## Setup
```bash
node -v                # 20+
cp .env.example .env   # add your own free Gemini key (https://aistudio.google.com/apikey); or set LLM_PROVIDER=replay to run on the recorded responses with no key
npm install
npx playwright install chromium   # only if Google Chrome is not installed; then set BROWSER_CHANNEL=chromium in .env
npm run dev            # server :4000, companion :5173, fixtures :4010
```
**Demo in one command:** `npm run demo` (resets local state, starts everything, opens the companion; `-- --offline` answers from recordings with no internet, `npm run demo:check` is the preflight, `npm run demo:record` records the real-model runs for Cases 3 and 4 so they replay offline).
The companion is meant to run on :5173, but if that port is busy Vite falls back to the next free one (often **:5174**) and prints the URL; the dev proxy to the server works on any port. Check the `[companion]` line in the `npm run dev` output for the real address.

**Windows:** works on Node 20 to 24 with no Visual Studio (the SQLite binary is downloaded prebuilt). Git is told to keep LF line endings (.gitattributes); if a Playbook badge shows stale after a fresh clone, run git add --renormalize ..
**Voice and screenshots:** the goal box has a Speak button (Chrome speech recognition, needs internet) and a Screenshot button (the vision model describes the image into the goal box for you to edit; needs a model key, not available offline).
**Not simulated vs simulated:** see docs/SUBMISSION.md (what is real, simulated or recorded).

## Checks
```bash
npm run check             # typecheck (all workspaces) + unit tests (vitest)
npm run fixtures:check    # boots the fixture web on a spare port (4019), verifies it against ground truth, shuts it down
npm run test:acceptance   # runs the implemented demo cases on recorded LLM responses (REPLAY); add `-- --live` to use your Gemini key
npm run redteam           # poisoned page, compromised planner, hostile reader model, 10 poisoned pages, forbidden actions (all must be contained)
npm run ui:walkthrough    # drives the real UI through all four cases, Hub, deny and cancel; screenshots in docs/evidence/ui (add UI_HEADED=1 to watch)
npm run llm:ping          # one tiny model call; prints only OK or the error, never the key
npm run verify-receipt -- docs/evidence/m1-case1-receipt.json   # recompute the hash chain + Ed25519 signature
npm run db:reset          # recreate .darby/darby.db (versioned migrations run automatically at boot)
npm run replay:curate     # copy new recordings from .darby/replay to the committed replay/llm
```
`npm run fixtures:selfcheck` runs the raw fixture selfcheck against an already-running fixture server.

## Layout
`apps/server` (Express + ws: REST `/api/runs`, WebSocket `RunEvent` stream; planner, policy, executor, reader, verifier, ledger, llm, adapters) · `apps/companion` (Vite + React) · `packages/contracts` (zod, source of truth) · `fixtures` · `replay` (recorded LLM responses) · `scripts` · `docs` · `tests/acceptance`

## Known issues
- `npm audit` reports 4 findings (1 moderate, 1 high, 2 critical): `@vitest/mocker` and `tinypool` are dev-only test tooling; `zod` (<4.6.6) is flagged high. We deliberately keep zod at `^3.25.76` because `packages/contracts` is the pinned source of truth; revisit only after the hackathon.

## Docs
docs/ARCHITECTURE.md (diagram, trust boundaries) · docs/DEMO_SCRIPT.md · docs/SPEC.md · docs/MILESTONES.md · docs/HUMAN_TASKS.md · docs/ADAL_PROMPTS.md · docs/ADAL_EVIDENCE.md · docs/SUBMISSION.md · docs/DECK_AUDIT.md · docs/VALUE.md · docs/ADAL_TODO_FOR_OWNER.md
