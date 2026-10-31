# Darby: the 3-minute pitch (final)

**Four speakers, three laptops.** About 370 spoken words; the rest is the demo. Know the beats, don't read.

| Laptop | Shows | Who runs it |
|---|---|---|
| **L1: Product** | `http://localhost:5173` (live Darby), a second tab with a finished run, a third tab `http://localhost:5173/lab.html` | Mohit |
| **L2: Slides** | One slide: market, who it's for, AdaL (details at the bottom) | Pragunie |
| **L3: Competitor** | Perplexity's Comet site, plus the Brave disclosure article (links at the bottom) | Pragunie |

**Cast:** Tanish opens and closes · Mohit drives the demo · Ghana explains the architecture while it runs · Pragunie does the competitor, market and AdaL.

---

## The script

### 0:00 · Tanish · L1, home page
*(Face the judges. Don't look at the screen.)*

"Every AI agent says **'done.'** Nobody checks. We're Team Target 9X, and this is **Darby**: the AI browser where 'done' means **proven.** Real tabs do the work. A **separate system** checks it. And you get a **receipt.** Mohit, give it a job."

### 0:18 · Mohit · L1: click **Talk to Darby**, speak, press go
Say the Hindi line: *"Top 5 AI startups ki pricing research karo aur ek Excel sheet mein likh do."*

"That was Hindi. Eleven voices, ten Indian languages, through Sarvam. Darby shows the **plan first**, with the **proof it needs for every step**, and now it's opening real Chrome tabs."

*(The run takes about 80–120 s. Everything until 1:45 happens while it works.)*

### 0:38 · Ghana · L1, standing beside the screen, pointing
"While it works, here's why you can trust it. Three things.

**One.** The planner never sees a web page, so a page can't rewrite the plan.

**Two.** Page text goes only to a reader with **no tools** and a locked output format. It can't send, click or run anything.

**Three.** A **separate verifier** re-opens the page, finds the exact quote, and re-opens the Excel file. It never takes the agent's word. And where it can't prove a number, it says **NOT FOUND.**"

*(Point at, in order: the Proof lines, the rule ids in the timeline, a "proven" chip.)*

### 1:15 · Mohit · L1: the result (or switch to the finished-run tab)
"**Done, with gaps listed.** Prices with the **exact quote**, and NOT FOUND where it couldn't confirm. And it answers in **your language.**" *(Click Listen. 4 seconds of Hindi. Click Stop.)*

*If the live run isn't done:* "Here's the one we ran this morning. Ours doesn't say done until it can prove it."

### 1:40 · Pragunie · L3: Comet, then L1: the lab
*(Comet's site on screen.)* "Browsers like Comet are brilliant at **doing.** But Brave's researchers showed that **hidden page text** can hijack an agentic browser, and both Perplexity and OpenAI say prompt injection won't be fully solved. We don't try to out-prompt it. Watch."

*(Switch to L1 `/lab.html`. Tick "Show what the AI also reads". Click **Assume the model is fooled**.)*

"Same hidden order, same page. A normal agent **sends the email.** Darby's reader returns **only a price.** The order is **blocked.** The outbox stays empty."

### 2:10 · Pragunie · L2: the slide
"The market: AI agents are heading from about **$8 billion to over $50 billion by 2030**, and India has nearly **a billion** internet users. We start narrow: **research into a spreadsheet** for founders and analysts, in their own language. Then Teams, with shared receipts, and a Hub of **verified Playbooks.**

We built it **with AdaL**: **Browser Use** tested our live UI, **headless AdaL** red-teamed ten hostile pages, and the **Review Agent** checked every diff."

### 2:42 · Tanish · L1 (receipt on screen)
"Comet and ChatGPT will keep getting better at **doing.** Somebody has to get good at **proving.** **Can we really prove what they did? With Darby, yes.** We're Team Target 9X. Thank you."

---

## What each beat proves (so the room gets it)

| Beat | Rubric |
|---|---|
| Hindi voice → plan → real tabs | Functional execution, multimodal, UX |
| Ghana's three points | Agent intelligence, verification |
| NOT FOUND + evidence | Verified outcomes, honest failure |
| The lab: hidden order blocked | Security and user control |
| Market, users, wedge | Value, originality, GTM |
| AdaL line | AdaL usage |

## Numbers you can say (checked just now)
- **AI agents market:** about **$7.8B in 2025 to about $50–53B by 2030**, about 46% a year. MarketsandMarkets projects $7.84B → $52.62B; Grand View Research projects $50.31B by 2030. Say "about eight billion to over fifty billion."
- **India:** about **958 million** active internet users in 2025 (IAMAI–Kantar), so say "nearly a billion". I found no percentage for regional-language use, so **don't quote one.**

## Competitor facts you can say (public, with sources ready on L3)
- Brave reported **indirect prompt injection in Perplexity's Comet** (Aug 2025, follow-up Oct 2025); Perplexity conceded the problem is unsolved industry-wide.
- OpenAI said prompt injection is **"unlikely to ever be fully 'solved'"** for Atlas's agent (Dec 2025).
- **Don't say** Comet is insecure *today*, or that we tested it. Say "publicly reported" and "as far as we've seen, none ships a signed receipt or an independent check."

## Setup (10 minutes before)
1. `npm run doctor` (Groq/Sarvam green is enough).
2. L1: stack up; tab 1 Darby (clear the goal box), tab 2 a finished run on **Result & receipt**, tab 3 `/lab.html`.
3. L3: Comet's site and the Brave article open; screenshots saved on the desktop in case Wi-Fi fails.
4. L2: one slide (market, wedge, AdaL).
5. Test the mic once, quietly. If it fails, **type** the goal.
6. Agree who switches the projector input, and rehearse it twice.

## If time runs over 3:00, cut in this order
1. Listen/Hindi playback (4 s). 2. Pragunie's "Then Teams…" sentence. 3. One of Ghana's three points (keep the verifier). **Never cut:** the Hindi prompt, NOT FOUND, the lab, the closing question.

## If something breaks
- **Mic fails:** type the goal and say "voice works the same way".
- **Run is slow at 1:15:** switch to the finished-run tab.
- **Wi-Fi drops:** L3 screenshots; the lab and Darby keep working locally.
- **Slack/Zoom/Canva-type prompt from a judge:** "Those show rupees here and Darby reads dollars only today, so it flags instead of guessing."

## Sources
- [MarketsandMarkets, AI agents market](https://www.marketsandmarkets.com/Market-Reports/ai-agents-market-15761548.html) · [Grand View Research, $50.31B by 2030](https://www.prnewswire.co.uk/news-releases/ai-agents-market-size-to-hit-50-31-billion-by-2030-at-cagr-45-8---grand-view-research-inc-302447061.html)
- [IAMAI–Kantar, ~958M users (2025)](https://tele.net.in/indias-internet-user-base-crosses-950-million-in-2025-as-per-iamai-report/)
- [Brave on Comet (The Decoder)](https://the-decoder.com/brave-discovers-a-security-flaw-in-perplexitys-comet-browser/) · [Follow-up (PPC Land)](https://ppc.land/comet-browser-faces-multiple-security-vulnerabilities-from-prompt-injection/)
- [OpenAI on Atlas prompt injection (The Decoder)](https://the-decoder.com/openai-admits-prompt-injection-may-never-be-fully-solved-casting-doubt-on-the-agentic-ai-vision/) · [Fortune](https://fortune.com/2025/12/23/openai-ai-browser-prompt-injections-cybersecurity-hackers/)
