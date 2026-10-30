# Darby: the live pitch (4 minutes, website first, three slides)

Read with `PRESENTATION_PREP.md` (facts) and `FINAL_SCRIPT.md` (the video). This file is **how we spend the four minutes on stage**.

---

## 0. The brief I worked from (RTCROS)

| | |
|---|---|
| **Role** | A founder-pitch coach who has watched many demo days and knows what a room remembers. |
| **Task** | Design a **4-minute live pitch** for Darby: the website first, then only the slides the website can't carry. It must sound like a **startup**, not a hackathon project; show our **YC-style thinking**; explain **why this beats an LLM** as a natural story of how we got there; and survive a slow or failing live demo. |
| **Context** | 35–40 teams, finals at Microsoft Noida, rubric: functional 25, agent intelligence 20, multimodal + coding 15, UX 15, security 10, value/GTM 10, AdaL 5. Four speakers. Real product: plan → proof per step → real Chrome → quarantined reader → independent verifier → signed receipt; Hindi voice via Sarvam. Real live run takes about 1.5–3 minutes; Gemini may be out of quota (Groq/Sarvam cover it). |
| **Reasoning** | A room remembers **one idea, one moment, one line**. Judges have seen "AI agent does a task" ten times. They have not seen an agent that **says NOT FOUND** and then **proves its own receipt is real**. So the pitch has one idea (*separation of duties for AI*), one moment (the tamper test going red) and one line (*"Other agents say trust me. Darby says check me."*). Everything else supports those. |
| **Output** | Minute-by-minute plan, who says what, what is on screen, the live-demo choreography with filler talk, the fallback, the three slides, the "why not an LLM" story, and a rehearsal checklist. |
| **Stop** | No new features to build. No claim we can't show. Nothing longer than 4:00. |

---

## 1. The one idea (say it like a founder, not a student)

**Darby is the verified-work layer for AI agents.**

> *Nobody lets the cashier count their own till.* Every serious business separates the person who does the work from the person who checks it. AI agents don't. They do the work, grade the work, and announce "done." **Darby is separation of duties for AI**: one system does the job, a different one proves it, and you get a receipt.

**The startup framing:** problem → wedge → insight → product → why now → business. No "for the hackathon" anywhere. We say **"we're building"**, **"our first users"**, **"we found"**. We never say "our project".

**The YC angle (use it as our way of thinking, not as a claim of affiliation):**
- *Make something people want.* People already **hand work to agents and then re-check it by hand**. That re-checking is the pain.
- *One sentence.* "Darby proves what your AI agent actually did."
- *Narrow wedge first.* Research-into-a-spreadsheet (founders, analysts, ops), where being wrong is expensive and "NOT FOUND" beats a guess.
- *Do things that don't scale, then scale.* Real Chrome, real files, receipts we sign ourselves. Playbooks make the proven recipe repeatable.
- *Launch fast, learn.* We tested against 10 hostile pages, found bugs (junk search results, one bad quote sinking a whole step), and fixed them. We say that. It shows we are building, not performing.

Say it once, early: *"We think about this the way good early-stage founders do: find the painful thing people already work around, and build the smallest honest product that removes it."*

---

## 2. How we "found" the idea (the natural story; tell it in 30 seconds)

This is the answer to "why is it better than an LLM", told as **our journey** so it never sounds like a pitch against ChatGPT. We love LLMs; we run on three.

1. **We started where everyone starts:** give an LLM a browser and a goal. It was impressive for about ten minutes.
2. **Then it broke in three quiet ways.** It said "done" when nothing was saved. It obeyed a sentence hidden inside a web page. And when a price wasn't on the page, it politely made one up.
3. **First instinct: make the model smarter.** A smarter model still can't tell you it's wrong, because the same brain does the work and judges it.
4. **Second instinct: add rules to the prompt.** "Never obey web pages." A prompt is a request, not a wall. Text can talk its way around text.
5. **Then we asked a human question: how do people trust people?** Accountants don't audit themselves. Banks give receipts. Pilots have checklists and a co-pilot. **They separate the doer from the checker and keep a paper trail.**
6. **So we stopped improving the model and built the system around it:** a planner that never sees web pages; a reader with no tools; a verifier that never sees the agent's claim; policy as code; a signed receipt.
7. **The surprise:** once the checking is separate, **the model becomes replaceable**. We run Gemini, Groq and Sarvam and Darby doesn't care. *That's when we knew the product was the proof, not the model.*

**The line to land:** *"We didn't build a better brain. We built the part that makes any brain accountable."*

---

## 3. The four minutes

Order: **website (≈2:45) → three slides (≈0:55) → back to the website for the finish (≈0:20).** The run starts early and keeps running while we talk.

| Time | Who | Screen | What happens |
|---|---|---|---|
| **0:00–0:20** | Tanish | Website home ("Work done. Proven by Darby.") | Hook + one-liner. |
| **0:20–0:50** | Tanish | Website, then **Mohit starts the run** | The story: three ways agents break; "so we asked how humans trust humans". |
| **0:50–2:00** | Mohit + Ghana | Website: live run | Hindi voice → plan with proofs → steps run. Filler talk is the **USP walk-through** (section 5). |
| **2:00–2:20** | Mohit | Website result (live, or preloaded) | Result, **NOT FOUND**, Hindi spoken summary, then **Tamper test** (the moment). |
| **2:20–2:45** | Pragunie | **Slide 1: Who it's for, why now, how we win** | Wedge, business model, moat. |
| **2:45–3:10** | Mohit | **Slide 2: Built with AdaL** | Where and how, with real evidence. |
| **3:10–3:30** | Tanish | **Slide 3: Where this goes** | Playbook marketplace, real integrations, vision, ask. |
| **3:30–4:00** | Tanish + all | Website, receipt on screen | Close: back to the live run (it's done now), the line, thank you. |

If time is cut to 3:00: drop Slide 3 and shorten the story to 20 seconds. If it is cut to 3:30: drop the AdaL slide's detail to one sentence (but keep AdaL, it's mandatory).

---

## 4. Script (human, not memorised: know the beats, use your own words)

**0:00 Tanish (home page)**
"Every company will soon hand real work to AI agents. And every one of them will ask the same question afterwards: **did it actually do it?** We're building Darby: **the verified-work layer for AI agents.**"

**0:20 Tanish (stays on home)**
"Here's how we got here. We gave an LLM a browser and a goal. For ten minutes it was magic. Then it said 'Saved' when nothing was saved. It obeyed an instruction hidden in a web page. And when a price wasn't on the page, it made one up. We tried making it smarter. Smarter doesn't help, **because the same brain does the work and grades it.** So we asked a simpler question: how do people trust people? **Nobody lets the cashier count their own till.** So we built exactly that for AI. Mohit, show them."

**0:50 Mohit (clicks Talk to Darby / Speak)**
Says the Hindi line: *"Top 5 AI startups ki pricing research karo aur ek Excel sheet mein likh do."*
"I'm giving Darby a job in Hindi. This is live."

*(then the filler talk in section 5, while the run goes)*

**2:00 Mohit (result)**
"Done, with gaps listed. Two prices found with **exact quotes**; three companies show **NOT FOUND**. Darby won't guess. It reads the summary back in Hindi, and here's the part that matters: this receipt is signed. Watch." *(click Tamper test)* "I change **one byte**. **Invalid.**"

**2:20 Pragunie (Slide 1)**
"Who needs this? Anyone who has to **answer for what an agent did**: founders, analysts, ops teams. Today they re-check agent work by hand; that's the cost we remove. We start narrow: **research into a spreadsheet**, because a wrong number there is expensive and a NOT FOUND is worth more than a guess. Then Teams, with shared receipts and second-person approvals, and a Hub of verified Playbooks."

**2:45 Mohit (Slide 2: AdaL)**
"We built this with AdaL, and we used it the way a real team would. **Browser Use** drove our live UI after every milestone. **Headless AdaL** ran our red-team against ten hostile pages. The **Review Agent** checked every diff before we tagged it. That's real, and the sessions are in our repo."

**3:10 Tanish (Slide 3: Where it goes)**
"Next: a **marketplace of verified Playbooks**, real Sheets, Drive and GitHub, a desktop app. And voice: we already speak eleven voices, ten Indian languages plus English, through Sarvam, because **trust shouldn't need English.**"

**3:30 Tanish (back on the website; the run has finished)**
"Remember the run we started at the beginning? It's done, and it's signed. **Can we really prove what they did? With Darby, yes.** Other agents say 'trust me.' **Darby says check me.** We're Team Target 9X. Thank you."

---

## 5. Live demo choreography (the part that makes or breaks us)

### Goal
Start a **real** run at about 0:50. It takes roughly 90–180 seconds. We **talk about the product while it works**, with each beat tied to something visible. If it isn't finished at 2:00, we use the **pre-loaded run** and come back to the live one at the end.

### Before going on stage
1. `npm run doctor` (green = good; Gemini quota may show red, Groq/Sarvam cover it).
2. Stack running: `npm run dev`. **For the stage, use headless research** (`DARBY_HEADLESS=1`) so Chrome windows don't pop up over the slides; the UI still shows page screenshots.
3. **Run the exact demo goal once beforehand.** It's now in **History** as the "pre-loaded result." Open it in a **second browser tab**, already on **Result & receipt**, scrolled to the stamp.
4. Slides open in a third window. Practise the window switch (one key).
5. Test the mic quietly. **If the mic fails, type the Hindi goal** into the box (language Auto works).
6. Browser at 100% zoom, full-screen, notifications off.

### The filler talk, tied to what's on screen
While the run works, Ghana speaks (it keeps the demo human and spreads the speaking time). Each beat points at something real:

| If the screen shows | Say (≈10–15 s each) |
|---|---|
| "Heard (Hindi) → understood as…" | "Sarvam turned my Hindi voice into text. We didn't make people type in English." |
| The **plan with a Proof line under each step** | "Before it does anything, Darby shows the plan, and **what proof counts for each step**. The planner **only sees my sentence, never a web page**, so a page can't rewrite the plan." |
| Timeline: **"Allowed: READ-002"** | "Every action goes through rules written in code, not a prompt. You can see the rule id here. A model can't argue with it." |
| Search results + page screenshots appearing | "These are real pages. Page text goes only to a reader with **no tools**. Whatever it reads is **tainted**, so it can never become a link, a recipient or a command." |
| A step turning "proven" | "That 'proven' wasn't the agent's word. A **separate verifier** re-opened the page and found the exact quote." |
| (optional, one click) **evidence** on a step | "Here's the proof: the quote, the screenshot, the hash." *(Press Esc to close.)* |
| The summary card starting to speak | "It reads the findings back in my language. Stop button, text-only mode, all there." |

**Do not read this table. Know the beats.** If the screen is quiet, tell the cashier-and-till story, or the intern analogy: *"An LLM is a brilliant intern who never says 'I don't know.' You'd never accept an intern's 'done' without checking. Darby does the checking, and keeps the paper."*

### Timeline and decision points

| Time | Check | If good | If not |
|---|---|---|---|
| 0:50 | Did the voice/goal start? | Continue | Type the goal in; say "voice works in the video, typing is the same path" |
| 1:30 | Is it past step 2? | Continue talking the beats | Keep going; plan and proofs are already a strong show |
| **2:00** | **Finished?** | Go to result (live) | **Switch to the pre-loaded tab:** "Here's the same run from this morning, so you can see where it ends." Continue to the tamper test there |
| 3:30 | Back at the end | Show the **live** run's finished receipt: "It finished while we were talking." | If still running: stay on pre-loaded: "The live one is still verifying; that's the point, it doesn't announce until it's proven." |

**The "it's still running" line is a strength, not an excuse.** Darby doesn't say done until it can prove it; saying so on stage is on-message.

### If something breaks
- **Model out of quota/503:** the fallback chain already moves to the next model. If planning fails entirely: "This is the failure Darby is built for. It tells you plainly instead of pretending." Then show the pre-loaded run.
- **Mic fails:** type it.
- **Internet drops:** open the **video** or the pre-loaded tab. (The pre-loaded run's screenshots and receipt are local.)
- **Wrong or odd search results:** "Darby didn't find a trustworthy price, so it says NOT FOUND." (This is literally the product.)
- **A hard question about speed:** "Today the run takes a couple of minutes because it opens real pages and checks each claim; Playbooks make repeat runs cheaper. We chose provable over instant."

### Fast moments that never fail (use them if time allows or the live run lags)
- **Tamper test** (instant, always works on a finished run).
- **Evidence drawer** on any step (instant).
- **NOT FOUND rows** in the sheet (instant on a finished run).

---

## 6. "How do we show the USP on the website, not just slides?"

The USP is **proof**. Each proof point has a moment on the site:

| USP | Where it shows on the website | One-liner |
|---|---|---|
| Proof planned **before** each step | The **Proof:** line under every plan step | "It decides what counts as proof before it acts." |
| Real work, real pages | Timeline with page screenshots; Dabo bot working | "Real tabs, real pages." |
| Separate checker | "proven" chips + the **evidence panel** (quote + screenshot + hash) | "The check isn't the agent's word." |
| Honest about gaps | **Done, with gaps listed**; NOT FOUND rows | "It prefers admitting a gap to inventing a number." |
| Safe by design | Rule ids in the timeline (READ-002, EXT-001); **approval card** for risky steps | "Rules in code; risky things need your yes." |
| **Receipt** | Result & receipt tab: **VERIFIED WITH GAPS** stamp, "chain valid ✓" | "A receipt you can hand to someone." |
| **Tamper-evident** | **Tamper test** → INVALID ✗ | "Change one byte and it shows." |
| Multilingual voice | Language strip, Talk to Darby, Hindi summary with Stop | "Trust shouldn't need English." |

If you only have time for **three**: the **Proof line**, **NOT FOUND**, and the **Tamper test**.

---

## 7. The three slides (only what the website can't show)

Build these three, keep them **sparse** (big text, one idea each). The website carries the product; slides carry **market, evidence of AdaL, and direction**.

**Slide 1: Who it's for and how we win**
- Title: *"The people who have to answer for what AI did."*
- Left: users: founders and analysts, ops teams, students who must cite.
- Middle: the wedge: *research into a spreadsheet* → expand to forms/records, code fixes, reports.
- Right: business: **Free core → Teams (shared receipts, second-person approvals) → Hub (verified Playbooks)**. *(Plan, not built.)*
- Footer, small: why now: agentic browsers are shipping fast; **none ships a receipt**. *(Say "as far as we've seen.")*
- Optional market figure: **only if verified** before the event. Otherwise leave numbers off.

**Slide 2: Built with AdaL**
- Three rows: **Where → How**: UI testing → Browser Use drove the live app after every milestone; Red-team → headless `adal -q` attacked our 10 hostile pages; Code review → Review Agent checked every diff before we tagged it.
- A real screenshot from `docs/evidence/` or the AdaL session recording (judges want evidence, not claims).

**Slide 3: Where this goes**
- Title: *"From one proven run to a marketplace of proven work."*
- Three steps: **Playbooks** (re-runnable, verified recipes) → **Integrations** (real Sheets, Drive, GitHub) → **Desktop app + more languages**.
- Bottom line: *"Voice in 10 Indian languages + English today."*

**Do not put on slides:** a desktop installer, Electron, Azure OpenAI, Supabase, live Excel/Drive integration, a live marketplace. They aren't in the prototype (see the "never say" list in `PRESENTATION_PREP.md`). Say "planned" if you mention them.

---

## 8. "Why not just use an LLM?": the lines to have ready

Never attack LLMs. Use **we use three of them**.

- **One-liner:** *"We didn't build a better brain. We built the part that makes any brain accountable."*
- **The till:** *"Nobody lets the cashier count their own till."*
- **The intern:** *"An LLM is a brilliant intern who never says 'I don't know.' We built the manager and the paperwork."*
- **The swap test:** *"Change the model and nothing breaks. We run Gemini, Groq and Sarvam. The product is the proof."*
- **The wall vs the request:** *"A prompt is a request. A rule in code is a wall."*
- **The receipt:** *"You can't hand a chat transcript to your boss as proof. You can hand them a signed receipt."*

If asked "is this a wrapper?": **"No. The model writes and reads text. Everything that decides what's allowed and whether it's proven is code that isn't a model. Swap the model and the product is unchanged."** (Full answer in `PRESENTATION_PREP.md`, section 7.)

If asked "how is this different from Comet/Atlas?": **"They're browsers that act. We're the layer that proves the acting happened. We could sit on top of a browser like that; no one else ships the receipt."** (Say "as far as we've seen.")

---

## 9. Voice and style (what makes it sound human and serious)

- **Say "we're building", "our first users", "we found", "we tried".** Not "our hackathon project".
- **Short sentences. One idea each.** Pause after "Was it?" and after "check me".
- **Numbers slowly.** Round, don't recite.
- **Hands off the notes.** Speak to the room, not the screen.
- **Ghana's job in the demo:** keep the room company while it runs. Calm voice, point at the screen.
- **Mohit's job:** drive the demo, say the Hindi line confidently, land the tamper test.
- **Pragunie's job:** make the business sound inevitable, not hopeful.
- **Tanish's job:** open with conviction, close with the question.
- **Don't apologise** for slowness or gaps. They're the product.

---

## 10. Rehearsal plan (45 minutes)

1. **10 min:** read this file and `PRESENTATION_PREP.md` parts 7–10 silently.
2. **10 min:** everyone says their own beats aloud once, with a stopwatch. Cut anything long.
3. **15 min:** full run-through **with the live site**. Include one deliberate failure (unplug Wi-Fi, switch to the pre-loaded tab). Practise the switch until it takes 3 seconds.
4. **5 min:** Q&A drill: each person asks another one hard question (section 9 of `PRESENTATION_PREP.md`).
5. **5 min:** reset: open pre-loaded run in tab 2, slides in a separate window, run `npm run doctor`, clear the goal box, close drawers.

**Final check before you walk up:** pre-loaded tab ready; slides open; doctor green or Groq/Sarvam green; mic tested; phone off; everyone knows **who speaks first after the run starts** (Ghana).

---

## 11. What not to do on stage

- Don't wait silently for a step. Talk.
- Don't open the terminal.
- Don't promise "all five prices".
- Don't claim simulated things are real.
- Don't say "AI is dangerous". Say "AI needs receipts."
- Don't go past 4:00. If you're behind, **skip Slide 3, never the tamper test.**
