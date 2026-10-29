# Demo script (finals, Fri 30 Oct, Microsoft Office Noida)

Open with `npm run demo` (live model) or `npm run demo -- --offline` (recordings only, no internet). Start screen has one button per case. Words in quotes are what to say; the action is in brackets.

## Before you go on (5 min)
1. `npm run demo:check`: everything ✓; the four cases show "recorded" (offline) or the key is present (live).
2. Memory tab empty (recordings assume empty memory). History may keep earlier runs: a finished Case 3 in History is your safety net.
3. Chrome window and the companion side by side; font zoom for the projector. Close other tabs.
4. If Wi-Fi is doubtful: `npm run demo -- --offline`. Say so honestly: "this run replays the model answers we recorded; the browser, verifier and receipt are real."

## 5-minute run
**0:00 Hook (20 s).** "Every agent says *done*. Darby shows the receipt." [goal screen]

**0:20 Case 1: success with gaps (75 s).** [Case 1 button → Plan & run] "Ten startups, one goal. Before anything runs, Darby shows a plan and, for every step, what would count as proof." [point at proof lines] "Real Chrome tabs, three at a time. The reader that sees page text has no tools; it can only return a strict record." [timeline] "Three startups show no paid price. Darby writes NOT FOUND instead of guessing." [approval card] "Sharing is an external effect, so it stops and asks. Recipient, content, hash." [Approve] "The sheet is re-opened from disk and compared cell by cell: ten of ten. Verified with gaps." [receipt: chain valid ✓, Tamper test] "Edit one entry and the signature fails. That is the receipt."

**1:35 Case 2: a poisoned page (50 s).** [scroll timeline to the warning on the Fathom page] "Page six hides an order to email this sheet and our keys to an attacker. Darby flags it, the reader ignores it, and no tool can be reached from page text." [open the fixture outbox: empty] "Outbox empty." [terminal: `npm run redteam`] "And when we assume the planner itself is compromised and proposes that email, the policy engine blocks it: tainted recipient. Independent red team: 48 bypasses found, 0 after the fix."

**2:25 Case 3: launch assets (80 s).** [Case 3 button, or open the finished run from History] "Same loop, creative work: positioning, hero image, a 15-second teaser with voiceover, a landing page, and a pull request." [Review panel] "Play the teaser; the page is the code Darby wrote and tested in a real tab; the first version failed its own browser test and was repaired. Receipt labels say what is real: this voice engine, this placeholder image, this pull request is simulated / real." [approval card] "Publishing needs you." [Approve] "The pull request is read back from the repo. Verified."

**3:45 Case 4: failure, honestly (60 s).** [Case 4 button] "This form shows *Saved ✓* and stores nothing." [FAILED receipt] "Darby read the data back: not saved. Failed, with the cause in plain words. No false success." [Try a safer way] "One click: it switches to the documented API, same lead, and proves it by reading back and looking at the leads page. Receipt B says it is a repair of run A."

**4:45 Close (15 s).** "Seven PS1 requirements, live: browser, control, multimodal, coding, GTM, memory, safety. Built with AdaL; recordings and commit tags are in the repo. Darby: done means proven."

## 3-minute run
Hook 10 s · Case 1 60 s (skip tamper) · Case 4 55 s · Case 3 from History 40 s (Review panel + receipt labels only) · Close 15 s. Mention Case 2 in one sentence while the Case 1 timeline shows the Fathom warning.

## If something breaks
| Symptom | Do |
|---|---|
| Model slow / rate limited | "Free tier, throttled on purpose." Wait, or switch to the History run. |
| No internet | `npm run demo -- --offline` (Cases 1, 2; Cases 3 and 4 once recorded: `npm run demo:record`). |
| Chrome window not found | `BROWSER_CHANNEL=chromium` in `.env`. |
| Voice sounds like a beep | The receipt says PLACEHOLDER: no speech engine on this machine. Say it. |
| A step fails | That is the product: show the honest receipt and the cause. |
