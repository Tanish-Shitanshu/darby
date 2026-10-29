# Debugging Darby

Start here: `npm run doctor` (10 seconds). It checks the models, keys, server and UI, and says which one is broken.

## Where things live (one line each)

| Symptom | Look at |
|---|---|
| "Planning failed", model 503 / 429 | `apps/server/src/llm/llm.ts` (`auto` = Gemini, then Sarvam) and `llm/providers.ts` (Sarvam falls back across `sarvam-105b`, `sarvam-105b-conversations`) |
| Wrong kind of plan (e.g. fixture startups for a real question) | `apps/server/src/planner/planner.ts`: `scopeOf`, `isLeadGoal`, `isWebResearchGoal` pick the prompt; the planner test locks it |
| Search returns junk or nothing | `apps/server/src/executor/websearch.ts` (`searchOnce`) and the `web.search` tool in `executor/tools.ts` |
| Page read / prices missing | `executor/tools.ts` (`readPages`, `extract`), `reader/reader.ts`, `verifier/verifier.ts` |
| Step blocked | `apps/server/src/policy/engine.ts` (rule ids shown in the UI) |
| Run "stopped before it finished" | The server restarted while it ran. `tsx watch` restarts on every saved server file. Do not edit server files during a live run |
| UI looks wrong | `apps/companion/src/` (`App.tsx`, `parts.tsx`, `theme.css`) |
| Voice | `apps/server/src/voice/` |

## Every run explains itself

- Run page, "Evidence": each step with the exact check that passed or failed.
- `GET /api/runs/<id>` gives steps and events; `/receipt` the signed receipt; `/sheet` the sheet.
- Server log: the terminal running `npm run dev`.

## Before you push

Use Node 22 (the sqlite module is built for it): `npm run check` (typecheck + unit tests), `npm run ui:walkthrough` (UI), `npm run acceptance` (offline cases).

## Known limits

- Gemini free tier is 20 requests a day per model. When it is used up Darby runs on Sarvam; this is slower and reads long pages less well.
- The reading step is built around prices (USD per month). Other numbers (salaries, packages, ratings) are not yet first-class and often come back as NOT FOUND.
