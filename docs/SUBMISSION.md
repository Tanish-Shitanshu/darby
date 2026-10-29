# Submission map (PS1 section 9 deliverables)

| Deliverable | Where | How to see it |
|---|---|---|
| Working prototype | whole repo | `npm install`, `cp .env.example .env`, `npm run demo:offline` (no key needed) or `npm run demo` (live model) |
| Live demo / short video | `docs/DEMO_SCRIPT.md` (5-min and 3-min scripts) | The video itself is recorded by the owner |
| Source and setup | `README.md`, `.env.example` | Setup, env variables, test commands |
| Architecture overview | `docs/ARCHITECTURE.md` (Mermaid), `docs/SPEC.md` | Trust boundary: planner, quarantined reader, policy engine, executor, verifier, ledger |
| Success test case | `npm run test:acceptance -- case1` | VERIFIED WITH GAPS, exactly cobalt, echo, helio; UI evidence `docs/evidence/ui/1280x720/03-case1-receipt.png` |
| Failure test case and its handling | `npm run test:acceptance -- case4` | FAILED honestly, plain cause, one-click repair to VERIFIED; `06-case4-failed.png`, `07-case4-repaired.png` |
| Safety and control | `npm run redteam` (case2, 2b, 2c, 2d, 2e), `cancel`, `takeover`, `case1-denied`, `case3-denied` | 10 poisoned pages, hostile model answers, policy blocks, Cancel, Take over, Approve/Deny |
| Multimodal and coding | `npm run test:acceptance -- case3 case3-real` | Copy, hero image, 15 s voiced teaser, model-written landing page tested in a real tab, vision checks; `09-case3-review.png` |
| Playbooks and Hub | `npm run playbook:check`, `playbooks/startup-prices/` | Verified run saved as a skill; replay with other parameters; check badge; `05-hub.png` |
| Whole UI, all cases | `npm run ui:walkthrough` | Drives the real UI for all four cases, Hub, deny, cancel, history; screenshots in `docs/evidence/ui/` (1280x720 and 1920x1080); report `docs/evidence/ui/walkthrough.json` (offline). The same walkthrough also ran live with the real model in headed Chrome: `docs/evidence/ui-live/` (`UI_LIVE=1 UI_HEADED=1 BROWSER_CHANNEL=chrome npm run ui:walkthrough`) |
| Users, value, future | `docs/VALUE.md` | |
| Deck truth audit | `docs/DECK_AUDIT.md` | Every slide claim mapped to proof, with the ones that need rewording |
| AdaL usage evidence | `docs/ADAL_EVIDENCE.md`, `docs/evidence/adal-redteam/`, `docs/evidence/m*-review.md`, commit tags `Built-with: AdaL` | Honest split of AdaL work and other-assistant work; remaining sessions in `docs/ADAL_TODO_FOR_OWNER.md` |

## What is real, simulated or recorded
- **Real:** Chromium tabs (3 in parallel), page reads, hash-chained Ed25519 receipts, verifier re-reads, policy decisions, the local sheet file, the fixture form and its API, the landing page test in a fresh tab, ffmpeg media probing.
- **Simulated (labelled `SIMULATED` in the signed receipt):** sharing a sheet (local permission list), the GitHub pull request (local git repo) unless a test token is set, the attacker in red-team runs (`SIMULATED-ATTACK`; the containment is real).
- **Recorded (labelled `REPLAY`):** model answers in offline mode (`replay/llm/`). The recordings were made with the real model (Gemini free tier) by running the cases live.
- **Placeholders (labelled):** the hero image is a deterministic rendered card (`GENERATED-PLACEHOLDER:hero.png`).

## Commands for the demo
```
npm run demo:check      # preflight: which cases are recorded, which tools exist
npm run demo:offline    # no internet, no key
npm run demo            # live model from .env
npm run test:acceptance # all scenarios, offline
npm run redteam
npm run playbook:check
npm run ui:walkthrough
```
