# Target users, practical value and future potential (PS1 deliverable 6)

## Who uses Darby
| User | The job they hand over | What Darby gives back |
|---|---|---|
| Student founders and early startup teams | Competitor and pricing research, lead entry, launch assets | A sheet where every price has an exact quote re-checked from the page, with gaps listed instead of guesses |
| Analysts and ops teams | Repeated web-to-spreadsheet and web-form work | A signed receipt per run that a manager can verify without trusting the agent |
| Students and researchers | Collecting facts they must cite | Evidence quote and URL next to every value |
| Anyone who delegates to an agent but must answer for the result | Work that touches shared documents, email or code repositories | Risky steps stop at an approval card; the run ends in an honest verdict |

## What it replaces
- Re-checking an AI agent's work by hand. In Case 1 the verifier re-reads every quote independently, so the person reads a verdict and a gap list instead of ten pages.
- Trusting "Saved ✓". In Case 4 a form shows success and stores nothing; Darby reads the real record back, reports FAILED with a plain cause, and offers a one-click repair through the documented API.
- Pasting web content into an assistant that also has tools. Page text only reaches a tool-less reader with a strict output schema, and anything derived from a page is tainted and can never become a recipient, URL, command or tool name (Case 2).

## Why it is practical today
- Runs locally with one command (`npm run demo`); the only remote dependency is the model API, and it also runs fully offline from recorded answers (`npm run demo:offline`).
- Free-tier model for development; no paid service is required.
- Every claim is checkable: `npm run verify-receipt` re-verifies a downloaded receipt, and the UI tamper test shows an edited ledger failing.
- Honest labels: simulated sharing, simulated pull request, placeholder hero image and recorded replays are named inside the signed receipt, so a judge or a customer sees exactly what was real.

## Future potential
1. **Playbooks and Hub.** A verified run becomes a re-runnable Playbook (a `SKILL.md` plus a plan). Replays go through the same policy and verifier, and a check badge is bound to the exact version. A shared Hub of tested Playbooks is the compounding asset.
2. **Real integrations.** The adapters are already split from the verifier. Google Sheets and Drive (read-back of the real permission list), Excel through Microsoft Graph, and real GitHub pull requests are adapter work, not redesign.
3. **Team features.** Receipts are portable and verifiable, so audit trails, approvals by a second person, and a team Hub are natural next steps.
4. **Desktop shell.** The companion is a web panel beside a real Chromium today; an Electron shell is the packaging step.
5. **Business model (plan, not built).** Free core, a Teams plan for shared receipts and approvals, and Hub revenue share, starting with student founders and then startup ops teams.

## Limits stated plainly
Sheet sharing and the pull request are simulated unless Google credentials or a GitHub test token are configured. The hero image is a labelled generated placeholder, not a diffusion model. Voice quality depends on the machine (neural voice needs `edge-tts` and internet). The demo web is a controlled fixture site; live websites are supported (`DARBY_SOURCES=live`) but not what the test cases measure.
