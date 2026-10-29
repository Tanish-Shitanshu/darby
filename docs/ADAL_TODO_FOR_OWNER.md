# AdaL evidence still needed (only a person with AdaL credits can do these)

Worth 5 % of the score, and the deck says "Built with AdaL: recordings, commit tags, test logs". Do not claim AdaL work that was not done. Work after M3 (M5, M6, M7, M8-lite, the Windows fixes, the red-team page suite, the UI walkthrough) was NOT built with AdaL and is logged that way in `docs/ADAL_EVIDENCE.md`.

Start the app first so AdaL can use it: `npm run demo:offline` (companion at http://localhost:5173).

## 1. Browser Use QA (Q1)
Paste into AdaL:
```
Use Browser Use to act as a first-time user of the Darby companion at http://localhost:5173. Run the example goals (Case 1, Case 4, Case 3) through the UI only. Report anything confusing, slow, unreadable or broken with screenshots; fix the small ones, list the rest. Save screenshots to docs/evidence/qa-*.png and add an entry to docs/ADAL_EVIDENCE.md.
```
Evidence to keep: `docs/evidence/qa-*.png`, the AdaL session recording, an entry in `docs/ADAL_EVIDENCE.md`.

## 2. Video Producer intro (Q2)
```
Use Video Producer to make a 20-second 1080p intro for the Darby demo: calm product-style motion graphics, text "Darby — done means proven", no real brand logos or people. Save to docs/evidence/darby-intro.mp4 and note the prompt in docs/ADAL_EVIDENCE.md.
```
Evidence: `docs/evidence/darby-intro.mp4`, the session recording.

## 3. Playbook running in AdaL
The deck says "SKILL.md runs in AdaL". Install the committed skill and run it:
```
Install the skill at playbooks/startup-prices/SKILL.md from this repository and run it for the first 5 startup pages on the fixture site (http://localhost:4010). Then show me the permission manifest it declares and the receipt it produced.
```
Evidence: a screen recording or transcript saved to `docs/evidence/adal-playbook.*`, an entry in `docs/ADAL_EVIDENCE.md`. If AdaL cannot run it, say so honestly and soften the slide wording instead.

## 4. A debug story (Q3)
Use it on any real failure you hit (for example a failed run or test):
```
Here is the failing output/screenshot: <paste>. Find the root cause from the evidence, fix it, add a regression test, and log the bug and fix in docs/ADAL_EVIDENCE.md.
```
Evidence: the commit (it carries `Built-with: AdaL` only if AdaL actually made it), the log entry.

## 5. Optional, only if credits remain: AdaL review of the new red-team suite
```
Review fixtures/site/data.mjs (the redteam list), fixtures/site/server.mjs and the case2e scenario in tests/acceptance/run.ts. Try to find a hiding technique or hostile model answer that gets past the reader boundary or the policy engine. Run npm run redteam, report anything that passes through, and save your report to docs/evidence/adal-redteam-2/.
```

After each session: commit the evidence files as Tanish, no assistant names in the message.
