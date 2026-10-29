# Darby — the AI-native browser where "done" means proven

HackBriven Build Arena · PS1 · Team Target 9x

Darby gives you an autonomous companion inside a real browser. You state a goal; Darby plans it with a proof for every step, does the work in real tabs and real documents, checks the result independently, and hands you a signed receipt with an honest verdict.

> Status: **M0 scaffold done** (server + companion + fixtures wired, connection status shown). Planning and execution start at M1. See docs/MILESTONES.md for build order. Built with AdaL.

## Setup
```bash
node -v                # 20+
cp .env.example .env   # fill LLM_* (see docs/HUMAN_TASKS.md); not needed for M0
npm install
npx playwright install chromium   # needed from M1 (the executor drives real Chromium)
npm run dev            # server :4000, companion :5173, fixtures :4010
```
The companion is meant to run on :5173, but if that port is busy Vite falls back to the next free one (often **:5174**) and prints the URL; the dev proxy to the server works on any port. Check the `[companion]` line in the `npm run dev` output for the real address.

## Checks
```bash
npm run check             # typecheck (all workspaces) + unit tests (vitest)
npm run fixtures:check    # boots the fixture web on a spare port (4019), verifies it against ground truth, shuts it down
npm run test:acceptance   # lists the demo-case scenarios (placeholder until M1+ runners land)
```
`npm run fixtures:selfcheck` runs the raw fixture selfcheck against an already-running fixture server.

## Layout
`apps/server` (Express + ws, `/health`, `/ws` echoes validated `RunEvent`s) · `apps/companion` (Vite + React) · `packages/contracts` (zod, source of truth) · `fixtures` · `scripts` · `docs` · `tests/acceptance`

## Known issues
- `npm audit` reports 4 findings (1 moderate, 1 high, 2 critical): `@vitest/mocker` and `tinypool` are dev-only test tooling; `zod` (<4.6.6) is flagged high. We deliberately keep zod at `^3.25.76` because `packages/contracts` is the pinned source of truth; revisit only after the hackathon.

## Docs
docs/SPEC.md (architecture) · docs/MILESTONES.md · docs/HUMAN_TASKS.md · docs/ADAL_PROMPTS.md · docs/ADAL_EVIDENCE.md
