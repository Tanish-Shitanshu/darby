# Darby — the AI-native browser where "done" means proven

HackBriven Build Arena · PS1 · Team Target 9x

Darby gives you an autonomous companion inside a real browser. You state a goal; Darby plans it with a proof for every step, does the work in real tabs and real documents, checks the result independently, and hands you a signed receipt with an honest verdict.

> Status: **M1 core loop done** — goal → typed plan with a proof per step → real Chromium tabs → quarantined reader → independent verifier → signed receipt. See docs/PROGRESS.md for what is built and what is next, docs/HANDOFF.md to take over, docs/MILESTONES.md for the build order. Built with AdaL.

## Setup
```bash
node -v                # 20+
cp .env.example .env   # add your own free Gemini key (https://aistudio.google.com/apikey); or set LLM_PROVIDER=replay to run on the recorded responses with no key
npm install
npx playwright install chromium   # needed from M1 (the executor drives real Chromium)
npm run dev            # server :4000, companion :5173, fixtures :4010
```
The companion is meant to run on :5173, but if that port is busy Vite falls back to the next free one (often **:5174**) and prints the URL; the dev proxy to the server works on any port. Check the `[companion]` line in the `npm run dev` output for the real address.

## Checks
```bash
npm run check             # typecheck (all workspaces) + unit tests (vitest)
npm run fixtures:check    # boots the fixture web on a spare port (4019), verifies it against ground truth, shuts it down
npm run test:acceptance   # runs the implemented demo cases on recorded LLM responses (REPLAY); add `-- --live` to use your Gemini key
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
docs/SPEC.md (architecture) · docs/MILESTONES.md · docs/HUMAN_TASKS.md · docs/ADAL_PROMPTS.md · docs/ADAL_EVIDENCE.md
