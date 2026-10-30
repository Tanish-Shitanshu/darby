# Darby: the pitch we will actually say (4:00)

This is the script. Words in **bold** are the ones to lean on. `[brackets]` are things to do, not say. Total spoken: about 540 words, so we must speak at a normal pace and **not read**: know the beats, say them in your own voice.

**Cast:** Tanish opens and closes. Mohit drives the laptop. Ghana talks while it runs. Pragunie handles competitors. Everyone stands; Mohit sits at the laptop, the others stand half-turned toward the judges.

---

## Why this shape (the thinking, in six lines)

1. **Start with the audience's own pain, not our product.** A show of hands about double-checking AI is instant, free, and every hand goes up. That's the YC move: name the workaround people already suffer through.
2. **Be honest about the wrong turn.** "We nearly built the wrong thing" is rarer and more credible than "we saw a gap." It also answers "how did you think of this?" before they ask.
3. **Let the judge drive.** A judge naming the five products makes it impossible to say it's rehearsed. Then **NOT FOUND** becomes the proof we don't cheat.
4. **One magic trick:** change one byte, the receipt goes red. People remember a trick, not a diagram.
5. **Handle "is it a wrapper?" while the run is working**, tied to what's on screen. Never a defensive speech.
6. **End with a callback:** "you can put your hands down now." Same gesture, new meaning.

---

## The run of show

| Time | Speaker | Screen | Goal of the beat |
|---|---|---|---|
| 0:00–0:20 | Tanish | Website home | Make them feel the pain |
| 0:20–0:45 | Tanish | Website home | "Why this problem" story |
| 0:45–1:05 | Mohit | Website: goal box | A judge picks the task; press Run |
| 1:05–1:55 | Ghana | Website: live run | Not a wrapper; USP walk-through while it works |
| 1:55–2:25 | Mohit (+Ghana) | Result (live or pre-loaded tab) | NOT FOUND, evidence, Hindi voice, tamper trick |
| 2:25–2:50 | Pragunie | Slide 1 | Where we sit vs Comet, Atlas, Dia |
| 2:50–3:20 | Ghana | Slide 2 | Technical depth and why each part exists |
| 3:20–3:40 | Mohit | Slide 3 | AdaL and stack |
| 3:40–4:00 | Tanish | Back to website | Close and the callback |

---

## 0:00 · Tanish · website home page behind him

*[Step forward, look at the judges, not the screen.]*

"Quick show of hands. Who here has asked an AI to do something… **and then checked it yourself?**"

*[Hands go up. Wait one second. Smile.]*

"Everyone. That double-check is a job you're doing **for free, every single day.** We're Team Target 9X, and we're building **Darby**: the thing that does the checking, **so you don't have to.**"

## 0:20 · Tanish

"When we first read this problem statement, an AI browser with an autonomous companion… honestly? **We didn't get it.** A browser with a chatbot in it? Everyone will build that.

Then we stared at one word. **Autonomous.** Autonomous means *nobody's watching.* And if nobody's watching… **who checks?**

That question stopped being a hackathon problem. It became **our company**."

## 0:45 · Mohit · turns to the laptop

"So instead of us picking the task, **you** pick. Tell us **five AI tools** you've used, anything, and Darby will find what they cost and put it in Excel."

*[A judge answers. Type exactly what they say.]*

"Perfect. I'm typing it **exactly as you said it.**"

*[Type: "Research the monthly pricing of {their five} and put it in an Excel sheet." Press Plan & run. Hands off the keyboard.]*

**If nobody answers in 3 seconds:** "I'll start us off: ElevenLabs, Runway, Notion, Figma, Perplexity." *(These are the ones tested to return real USD prices; see the risk note at the bottom.)*
**If they ask for something Darby shouldn't do (book, pay, email):** "Great choice, and that's the one Darby would **stop and ask you about**, by design. Let's give it something it can finish end to end: five products and their prices."

## 1:05 · Ghana · while the plan appears and runs

*[Stand beside the laptop, point at the screen as you speak. Calm voice.]*

"While it works, the question every team gets: **is this just ChatGPT with a nice face?**

Look at the plan. A model wrote it, and that model has **never seen a web page.** Under each step: the **Proof line**. That's what counts as done, decided **before** it acts.

Now the timeline. Every action goes through a rule **written in code, not a prompt.** A prompt is a request. **A rule is a wall.**

*[Point at the page screenshots appearing.]* Those pages are read by a second model that has **no hands**: it can only fill in a form. Anything it reads is marked untrusted, so it can **never** become a link, a recipient or a command.

And when it says 'proven', that isn't the agent's word. **A different system re-opens the page and finds the quote.** Swap the model, even take it away, and **that part still works.**"

*(Say only as much of this as the run gives you time for; the first three paragraphs are enough if it finishes early.)*

## 1:55 · Mohit · the result

**If the live run has finished:** "It's finished."
**If not:** *[Switch to the second tab, already on the result.]* "Here's the same job we ran this morning, so you can see where it ends. **Ours is still checking. It doesn't say done until it can prove it.**"

"**Done, with gaps listed.** Prices with the **exact quote** they came from, and some rows say **NOT FOUND.** Darby would rather give you an honest blank than a confident lie."

*[Click `evidence` on one step. Two seconds. Esc.]* "Here's the quote, the screenshot, the hash."

"And it answers in **your** language." *[Click Listen on the Hindi summary. Let it speak for 4–5 seconds. Click Stop.]*

"Now the part we love. This receipt is **signed.** Watch closely." *[Click Tamper test.]* "I change **one byte.** **Valid. Invalid.**"

*[Pause for a full second. Don't talk over it.]*

## 2:25 · Pragunie · Slide 1 (the 2×2)

"So where do we sit? Comet, Atlas, Dia: great browsers, all racing to **do more.** Researchers have already shown that pages can hijack agentic browsers. We're on the **other axis: prove it.**

Our answer isn't a cleverer prompt. It's **architecture**: the reader has no hands, the checker never sees the agent's claim. And as far as we've seen, **nobody else hands you a signed receipt.**"

## 2:50 · Ghana · Slide 2 (architecture, with the "why")

"Quickly, **why each part exists.**
The **planner** never sees pages, so pages can't rewrite the plan.
The **compiler** is plain code: it sets the risk and the proof.
The **policy engine** gates anything that touches the outside world.
The **reader** has no tools and a locked output format.
The **verifier** re-opens the real thing and never sees the claim.
The **ledger** is hash-chained and **Ed25519-signed.**

And the model is **swappable.** We run Gemini, Groq and Sarvam: one falls, the next takes over."

## 3:20 · Mohit · Slide 3 (AdaL + stack)

"We built it **with AdaL**: **Browser Use** tested our live UI every milestone, **headless AdaL** red-teamed ten hostile pages, the **Review Agent** checked every diff. TypeScript end to end, real Chrome through Playwright, and **Sarvam for ten Indian languages**: because trust shouldn't need English."

## 3:40 · Tanish · back on the website, receipt on screen

*[If the live run finished meanwhile:]* "Remember the run we started? It's done, and it's signed."

"Everyone is building agents that do **more.** We're building the one you can **trust.**

*[Beat.]* **You can put your hands down now.**

Can we really prove what they did? **With Darby, yes.** We're Team Target 9X. Thank you."

---

## The three slides (build only these)

**Slide 1: Where we sit.** A 2×2. X axis: *does the work for you →*. Y axis: *proves it ↑*. Bottom-left: chat assistants. Bottom-right: AI browsers (Comet, Atlas, Dia…), labelled "do more". **Top-right: Darby**, "does the work **and** proves it". Footnote, small: *"as far as we've seen."* No logos, no claims about their internals.

**Slide 2: Why each part exists.** The architecture diagram, one short "why" under each box: planner (never sees pages), compiler (risk + proof in code), policy (rules, not prompts), reader (no hands), verifier (never sees the claim), ledger + receipt (tamper-evident). A small strip: *Gemini → Groq → Sarvam*.

**Slide 3: Built with AdaL.** Three rows: UI testing → Browser Use; red-team → headless `adal -q`; code review → Review Agent. One real screenshot from the AdaL session. Small strip: TypeScript · Playwright · SQLite · Ed25519 · Sarvam. Bottom line: *"Next: a marketplace of verified Playbooks."*

Do **not** put on any slide: a desktop installer or Electron, Azure OpenAI, Supabase, live Excel/Drive integration, market figures we haven't verified.

---

## Where the USPs are shown on the website (so the demo carries them)

| What you say | What they see |
|---|---|
| "Proof decided **before** it acts" | The **Proof:** line under each plan step |
| "Rules in code, not a prompt" | Rule ids in the timeline (READ-002) |
| "Real pages" | Page screenshots in the timeline |
| "The checker isn't the agent" | "proven" chips + the evidence panel |
| "An honest blank" | NOT FOUND rows, "Done, with gaps listed" |
| "Your language" | The Hindi summary speaking; the Stop button |
| "A receipt you can hand someone" | The signed receipt, "chain valid ✓" |
| "Tamper-evident" | **Tamper test → INVALID** |

---

## Setup (do this 10 minutes before, in this order)

1. `npm run doctor` (Groq/Sarvam green is enough; Gemini may be out of quota).
2. Stack up: `DARBY_HEADLESS=1 npm run dev` (headless research so Chrome windows don't pop over the slides). Open `http://localhost:5173`.
3. **Run the same *kind* of job once beforehand** (five products → Excel). Open that finished run in a **second browser tab**, on **Result & receipt**. That is the fallback.
4. Slides open in their own window. Practise the switch: one keystroke each way.
5. Test the mic only if you'll use voice. **Typing the judge's prompt is the plan.** If you want the Hindi to be live, set the language selector to **Hindi** before pressing Run: the judge's English goal is typed, and the findings come back **spoken in Hindi** (I tested this path today; see below).
6. Browser at 100%, full screen, notifications off, phone on silent.
7. Clear the goal box and close any drawers.

**Test result:** I ran an English goal with the language set to Hindi. It started fine and the goal was re-worded slightly by the translator (it came back as "Notion, Slack, Zoom, Figma and Canva's monthly pricing research and put it in an Excel sheet"). The meaning survived. If you'd rather have the cleanest wording on screen, leave the language on Auto, and use the pre-loaded tab for the Hindi playback.

---

## If time runs long: what to cut (in this order)

1. Slide 3's stack line (keep the three AdaL rows: AdaL is mandatory).
2. Ghana's last paragraph during the run.
3. Slide 1 shrinks to one sentence.
4. Never cut: **the judge's prompt, NOT FOUND, the tamper trick, the callback.**

At 3:30 and still on Slide 2? Skip Slide 3's talk to one sentence and go straight to the close.

---

## Quick lines for the questions that will follow

- **Wrapper?** "The model writes and reads text. What decides what's allowed and whether it's proven is code that isn't a model. Swap the model and the product doesn't change."
- **Why not guardrails in the prompt?** "A prompt is a request. A rule in code is a wall."
- **Comet / Atlas?** "Great at doing. We're the layer that proves it was done. We'd happily sit under any of them."
- **What's simulated?** "Sharing and pull requests, unless credentials are set. Labelled in the receipt."
- **Business?** "Free core, Teams with shared receipts and second-person approvals, a Hub of verified Playbooks. Starting with founders and analysts who have to answer for numbers."
- **Biggest weakness?** "Reading is tuned for prices today; live results depend on what pages publish. That's why NOT FOUND exists."

---

## KNOWN DEMO RISK (read this; it affects what a judge may pick)

I ran a real test today: *Notion, Slack, Zoom, Figma, Canva*, finished in **78 seconds**. Result: **Notion $10 and Figma $3 found; Slack, Zoom and Canva came back NOT FOUND.** The pages were read fine. The reason: **from India those sites show prices in rupees (₹545, ₹1,240, ₹1,590…) and Darby's reader and verifier currently accept dollar prices only.** So it flags instead of converting or guessing. That is honest, but the note on the sheet ("Price not shown on the page") is not exact, because the price *is* on the page, in rupees.

**What to do about it, in order of preference:**
1. **Nudge the judge to "AI tools"** (already in the script). AI startups' pricing pages are mostly dollar pages: in our recorded run ElevenLabs ($6) and Runway ($15) were found.
2. **If a judge picks Slack/Zoom/Canva-type products and gets NOT FOUND, say this, truthfully:** *"Those pages show rupees here, and today Darby reads dollars only. It would rather flag a gap than convert or guess. Rupee support is next on our list."* That turns it into the product's honesty, not a bug.
3. **Don't say "the price isn't on the page"** for those rows. It is on the page.
4. The Figma row's evidence quote is just "$3". It is real (the verifier found it), but thin. Don't point judges at that row; point at **Notion's** quote ("Plus* $10 per seat / month").

**If you want me to fix it before the demo:** teach the reader and verifier to accept rupee prices (and show the currency in the sheet), and correct the NOT FOUND note. It touches the extraction, verification and sheet code, so it needs a restart and a full re-test (about 40 minutes). Say the word if you want it; otherwise the script above is built to be safe without it.
