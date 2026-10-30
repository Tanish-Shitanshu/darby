# The last 30 minutes: three laptops, one story

**The idea in one line:** *Comet is the car. Darby is the black-box recorder and the co-pilot that tells you whether to believe it.*
We do **not** claim to be a better browser than Comet or ChatGPT. We claim one thing nobody shows: **which answers you can believe, and why.**

## What actually differs (say only these)

| | ChatGPT / Comet / Atlas | Darby |
|---|---|---|
| Who checked the answer? | The same model that wrote it | **A separate system** that re-opens the real page |
| Which answers are unconfirmed? | It gives all of them the same confident tone | **Says NOT FOUND** for the ones it couldn't confirm |
| Proof for each number | A link at best | **The exact quote, the screenshot, and a re-check** |
| Page text and tools | Same brain reads pages and acts | **The reader has no hands**; rules are code |
| Handing the result to someone | A chat transcript | **A receipt** (what was checked, what wasn't) |

(As far as we've seen; we have not stress-tested their products. Don't claim they are wrong. The point is: **you can't tell**, and with Darby you can.)

## The three questions (the whole comparison is just these)
Ask the room to put the same three questions to each tool:
1. **Which exact page and quote did each number come from?**
2. **Who checked it, other than the thing that wrote it?**
3. **Which ones couldn't it find?**
ChatGPT/Comet answer a prompt. Darby answers **all three**.

## Setup: do now (10 minutes)

**Laptop 3 (competitors) = Pragunie.** Tabs: ChatGPT and, if you have it, Comet or Atlas. **Run this exact prompt in each now** and leave the results open (and screenshot them):

> "Find the monthly price for Perplexity, Jasper, Midjourney, ElevenLabs and Runway, and give me an Excel sheet. Tell me which numbers you verified."

Write down: did it give all five? Did it say which it verified? Did it say "couldn't find"? **Whatever it says is what you show.** If it's good, say so ("a good answer") and move to the three questions. **Do not exaggerate or invent what it did.**

**Laptop 1 (Darby) = Mohit.** Run the **same prompt** in Darby now (about 80–120 seconds), keep that finished run open. Note which prices Darby found vs NOT FOUND, and any number that **differs** from ChatGPT's. A difference with a quote is your best moment.

**Laptop 2 (slides) = Ghana.** Architecture and AdaL slides only.

**Display:** if the projector can't take three inputs, run them in the order below and ask the organisers how to switch. Don't improvise this on stage.

## The flow (4:00, natural, each switch has a reason)

**0:00 · Tanish, no laptop**
"Show of hands: who has asked an AI to do a job and then checked it yourself? Everyone. That checking is the job we're building away. When we got this problem statement, we nearly built the wrong thing, a browser with a chatbot. Then one word: **autonomous**. Autonomous means nobody's watching. **So who checks?**"

**0:30 · Pragunie, Laptop 3: ChatGPT (and Comet/Atlas) result**
"This morning we gave ChatGPT [and Comet] this job: five AI tools, their prices, in a sheet. [show] A clean answer. Confident. And honestly, it may be right. **We can't tell. Neither can you.** So we ask three questions: which page did each number come from, who checked it besides the thing that wrote it, and which ones did it *not* find? [pause] That's not a criticism. It's the problem with autonomous."

**1:15 · Mohit, switch to Laptop 1: Darby**
"Same job, same five tools, on Darby." *(The run is finished, or finishing; say "it started while we were talking" if it was started at 0:30.)*
- "**Proof first:** before it acted, it wrote what would count as proof for each step." *(point at Proof lines)*
- "**Two prices are proven**, with the exact quote. Click evidence: the quote, the screenshot." *(Notion/ElevenLabs/Runway, whichever is solid)*
- "**Three say NOT FOUND.** ChatGPT answered all five with the same confidence. Darby told you which three it couldn't confirm. **That's the difference: not smarter, more honest.**"
- *(If a number differs from ChatGPT's:)* "Here ChatGPT says [X]. The page says [Y], and here's the quote."
- "And it tells you in your language." *(Hindi voice 4 s, Stop)*
- "Every check is in a signed receipt you can hand to someone." *(Tamper test, 6 seconds: "change one byte, invalid.")*

**2:50 · Ghana, switch to Laptop 2: slides**
"Why this isn't a wrapper: the planner never sees web pages; the reader has no tools; the verifier never sees the agent's claim; rules are code. Swap the model, even take it away, and that stays. We run Gemini, Groq and Sarvam. **Built with AdaL:** Browser Use tested the live UI, headless AdaL red-teamed ten hostile pages, the Review Agent checked every diff."

**3:30 · Tanish, back to Laptop 1 (receipt on screen)**
"Comet and ChatGPT will keep getting better at **doing**. Somebody has to get good at **proving**. We're not replacing your agent. **We're the part that tells you whether to believe it.** You can put your hands down now. Thank you."

## Lines for the judge who says "why not just use Comet?"
"Use it. Then ask how you know it's right. That's us. We'd sit under Comet or ChatGPT, not instead of them."
"A smarter model can't grade its own homework. It needs a second system."

## What makes the first minute land
- The three questions (not the technology).
- The line **"We can't tell. Neither can you."**
- Pointing at NOT FOUND while saying "ChatGPT answered all five with the same confidence."

## What **not** to say
- Not "ChatGPT/Comet is wrong" or "insecure". Say "you can't tell".
- Not "we're better than Comet". Say "we do the other half".
- Not "the receipt is our innovation". Say "the checking is; the receipt is how you hand it on."
- Not any desktop/Electron/Supabase claim from the old deck.
- If Slack/Zoom/Canva come up: "those pages show rupees here; Darby reads dollars only today, so it flags rather than guesses."

## Cut list if over 4:00
1. The tamper test shrinks to one sentence. 2. Hindi voice 4 seconds. 3. Slide talk to 20 seconds. **Never cut: the three questions, NOT FOUND, the closing line.**

## The 5-minute checklist (right before)
- [ ] ChatGPT/Comet result open and screenshotted on Laptop 3.
- [ ] Darby finished run open on Laptop 1, scrolled to the result; a second tab ready for a live run.
- [ ] `npm run doctor`.
- [ ] Slides on Laptop 2.
- [ ] Everyone knows their first sentence and who they hand to.
