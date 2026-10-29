# AdaL usage evidence (PS1 mandatory requirement)

Fill one entry per AdaL session. Attach screenshot/recording paths from `docs/evidence/`.

| # | Time | Milestone | AdaL feature used (build / Browser Use / headless / Video Producer / image / skills / MCP) | Prompt (short) | Result | Evidence file |
|---|------|-----------|---|---|---|---|
| 1 | 2026-10-29 | M0 | build + Browser Use | Preflight, then scaffold monorepo: Express+ws server (`/health`, `/ws` echoing contract-validated `RunEvent`), Vite+React companion with connection status and goal box, root scripts, fixtures check. Browser Use opened the live companion at localhost:5174, read back the status values with `eval`, inspected the console. | `npm run check` green (4 server tests); `npm run fixtures:check` green (10 fixtures, 3 gaps). Browser Use found a real defect on first load: a WebSocket "closed before established" warning (React StrictMode double-mount) and a favicon 404; both fixed (`useConnection.ts` cleanup, inline favicon) and re-verified with 0 console errors. | docs/evidence/m0-companion.png |

## Required evidence by the end
- [ ] Build: commit log with `Built-with: AdaL` trailers and milestone tags m0..m8
- [ ] Browser Use: recording of AdaL testing the companion UI (Case 1) and the poisoned page (Case 2)
- [ ] Headless: `adal -q` red-team run log (`docs/evidence/redteam-*.jsonl`)
- [ ] Video Producer / image: the demo intro or teaser clip and hero image generated through AdaL
- [ ] Skills: a Darby Playbook (`SKILL.md`) run or installed in AdaL
- [ ] Debug story: one real bug AdaL found and fixed (screenshot + commit)
