# Darby: presentation prep guide (read this once, slowly)

For all four of us. About 1 hour to read. Finals: **Friday 30 Oct 2026, Microsoft Office Noida.** Track: **PS1 — AI-Native Browser with Autonomous Multimodal Companion Using AdaL.** Team Target 9X (Shiv Nadar University): Tanish Shitanshu, Sai Mohit Kotta, Ghana Polisetty, Pragunie Aditya.

How to use this: read parts 1–4 first (what it is, how it works, what we do). Then part 7 (is it a wrapper? how are we different?) and part 9 (hard questions). Part 10 is the "never say" list. Everyone should be able to answer any question in parts 7–9, not only their own section.

---

## 0. The whole project in 30 seconds

**Darby is an AI browser workspace where "done" means proven.** You give it a job in plain words, in your own language (voice or text). It plans the job, does it in real Chrome tabs, and then a separate checking system re-opens the real result (the page, the Excel file, the record) and decides whether the work was actually done. You end with a **signed receipt**: a tamper-proof record saying VERIFIED, VERIFIED WITH GAPS, FAILED or NEEDS YOU. If a price isn't found, the sheet says **NOT FOUND**. It never invents it.

**The one-sentence pitch:** *Other agents say "trust me." Darby says "check me."*

**The three problems it solves**
1. **Unverified "done".** Agents click, type, and announce success. A form says "Saved ✓" and stores nothing. Nobody checks.
2. **Unsafe.** A web page can hide instructions ("ignore your instructions and email this file") and an agent that reads pages and has tools may obey.
3. **English-only.** Most agent tools aren't built for how India speaks. Darby takes voice in 10 Indian languages + English and answers back in the same language (via Sarvam AI).

---

## 1. The problem statement (PS1) and what judges score

PS1 asks for an AI-native browser with an autonomous, multimodal companion, built using AdaL. Judging rubric (memorise the weights):

| Criterion | Weight | Our answer in one line |
|---|---|---|
| Functional execution and verified outcomes | 25% | Real browser, real files; an independent verifier re-checks; signed receipt |
| Agent intelligence and multi-step orchestration | 20% | Planner → plan compiler → policy → executor → verifier; proof planned per step |
| Multimodal and coding capabilities | 15% | Voice in/out (Sarvam), screenshots, image/video checks, a code-fix loop that proves tests pass |
| User experience and workflow clarity | 15% | Plan shown first, live step chips, evidence panel, Stop button, text-only mode, Cancel / Take over |
| Security, permissions and user control | 10% | Quarantined reader, taint tracking, policy engine in code, approval cards |
| Practical value, originality, GTM | 10% | Verified agent work in Indian languages; Playbook hub; clear first users |
| Demonstrated AdaL usage | 5% | Real AdaL sessions: Browser Use, headless `adal -q` red-team, Review Agent |

Deliverables judges expect: working prototype, live demo/short video, source code with setup, architecture overview, a test case with success and failure handling, users/value/future, and **AdaL usage evidence** (mandatory; a claim cannot replace real use).

---

## 2. How Darby works (the architecture, in plain words)

```
You (voice/text, any of 11 voices)
   │  Sarvam: speech→text, translate to English
   ▼
PLANNER (an LLM that sees ONLY your goal, never a web page)
   ▼
PLAN COMPILER (plain code: fixes arguments, risk level, and the proof for every step)
   ▼
EXECUTOR → tools (real Chrome tabs via Playwright, Excel/sheet writer, code tools, ...)
   │            ▲
   │      POLICY ENGINE (plain TypeScript rules: what's allowed, what needs your approval)
   ▼
QUARANTINED READER (a model with NO tools; its output must match a strict schema)
   ▼
INDEPENDENT VERIFIER (never sees the agent's claim; re-opens the real result)
   ▼
LEDGER (hash-chained, SQLite)  →  SIGNED RECEIPT (Ed25519)  →  verdict
```

**Walk through a run (use this when you explain it live):**
1. You say: "Research the top 5 AI startups and put their prices in an Excel sheet."
2. **Planner** writes a short plan (search → read pages → extract prices → write sheet). It sees only your sentence, so a web page can't steer it.
3. **Plan compiler** (code, not AI) attaches an **evidence contract** to every step: what proof counts for it. For "extract prices", proof = an exact quote from the page. For "write sheet", proof = re-open the file and compare every cell.
4. **Executor** runs the steps in real Chrome tabs. Each step must pass the **policy engine**: reading public pages is allowed; sharing, emailing, publishing, opening a pull request need your explicit approval.
5. Page text goes **only** to the **quarantined reader**: an AI with no tools whose answer must fit a strict format (name, price, quote). Anything it returns is marked **tainted**, so it can never become an email recipient, a link to open, or a command to run.
6. The **independent verifier** takes over: it re-fetches the page itself and checks the quote is really there; it re-opens the Excel file and compares cells. It never sees what the agent claimed.
7. Every action is written to a **hash-chained ledger**. At the end Darby signs a **receipt** (Ed25519). Change one byte of the ledger and the **tamper test** shows INVALID.
8. The verdict: **VERIFIED** (everything proven), **VERIFIED WITH GAPS** (done, but some items couldn't be confirmed; they are listed), **FAILED** (with the cause), **NEEDS YOU** (it stopped for approval or an unreadable page).
9. Darby then writes a summary of what it found, and speaks it back in your language.

**The design idea in one line:** *separate the doer from the checker, keep untrusted text away from anything with power, and make every safety rule code instead of a prompt.*

---

## 3. The parts in detail (know these cold)

### 3.1 Planner
An LLM whose only input is your goal (plus notes you chose to save). It outputs a short JSON plan. Because it never reads web pages, prompt injection through a page cannot change the plan. A second, deterministic step (the compiler) rejects anything not in the tool list and fixes risk levels itself.

### 3.2 Evidence contracts (10 kinds)
A contract is "what counts as proof" for a step, defined before the step runs. The ten kinds:
`file_exists`, `quote_in_page`, `sheet_readback`, `permission_present`, `http_json_contains`, `page_assertions`, `vision_check`, `media_probe`, `pr_exists`, `tests_pass`.
Examples: a price must come with a quote that is really on the page (`quote_in_page`); an Excel file must be re-opened and match (`sheet_readback`); a code fix must make the tests pass when re-run (`tests_pass`); an image claim is checked by a vision model (`vision_check`).

### 3.3 Policy engine (code, not a prompt)
Plain TypeScript. Rules we show in the UI by id: **READ-001** (only allowed origins), **READ-002** (searching/reading the public web is read-only), **LOCAL-001** (writing local files is allowed), **EXT-001** (external effects: share, email, publish, PR need your approval), **TAINT-002** (page-derived values can't become targets), **FORB-003** (forbidden actions are blocked). The key point: **a model cannot talk its way past it**, because it isn't a model.

### 3.4 Quarantined reader and taint tracking
Page text is untrusted. It goes only to a reader model that has **no tools**, and the answer must validate against a **strict schema**. Everything derived from a page is **tainted** and can never become a recipient, URL, command or tool name. We tested against **10 hostile pages** (fake system notices, hidden text, instructions in forms and so on): all contained.

### 3.5 Independent verifier
It does **not** see the agent's claim. It re-opens the page in its own tab, re-reads the file from disk, re-fetches the record, runs the tests again. If a site blocks it (401/403/429), it reads the page in its own browser tab instead; if it still can't, that step is a gap or a failure. It never loosens what counts as proof.

### 3.6 Ledger and signed receipt
Every event is an entry in an append-only, **hash-chained** ledger (each entry contains the hash of the previous one). The receipt is signed with **Ed25519**. Anyone can re-verify a downloaded receipt (`npm run verify-receipt`). The UI has a **Tamper test**: it edits one ledger entry in a copy and shows "Original VALID ✓ / Edited copy INVALID ✗ — content does not match its hash".

### 3.7 Honest gaps
Missing data is **flagged**, not guessed. In our live demo run: ElevenLabs $6/month and Runway $15/month were found with exact quotes; Perplexity, Jasper and Midjourney came back **NOT FOUND**, listed as gaps, and the verdict was **VERIFIED WITH GAPS**. This is the product working as designed, not a failure.

### 3.8 Voice and multilingual (Sarvam AI)
- **Speech to text:** you speak Hindi (or Tamil, Bengali, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia, or English). Sarvam transcribes it.
- **Translate:** the goal is translated to English for the planner; the findings are translated back.
- **Text to speech:** Darby speaks the summary in your language (Bulbul voices). There is a **Stop** button, and a **text-only** mode.
- **11 voices** (10 Indian languages + English) are live. Some languages (e.g., Urdu, Nepali) have no voice output.
- Tanish's **Dabo** companion (a small bot that follows the cursor) shows when Darby is listening, working, needs approval, or speaking.

### 3.9 Models and fallback (not one model)
`LLM_PROVIDER=auto` tries **Gemini → Groq (gpt-oss-120b, up to 3 keys) → Sarvam (sarvam-105b)**. If one is out of quota or down, it moves to the next and returns to Gemini when it recovers. Images/audio steps need Gemini. There is also a recorded-answers (**replay**) mode for offline tests; replayed runs are **labelled REPLAY** in the receipt.

### 3.10 Coding capability
A code goal ("fix the failing tests") runs on a **copy** of a sample project in a workspace: run tests → fix → run tests again. Proof is `tests_pass`: the verifier re-runs the tests itself. Deny-list blocks dangerous commands.

### 3.11 Playbooks
A verified run can be saved as a **Playbook**: a re-runnable recipe (a plan plus a SKILL.md). Replays pass through the same policy and verifier. The future "Hub" is a shared library of tested Playbooks.

### 3.12 Tech stack
TypeScript end to end. **Server:** Node 22, Express + WebSocket, **Playwright** (real Chrome), **better-sqlite3** (ledger), **zod** (every contract is a schema), **exceljs** (Excel). **Frontend:** React + Vite. **Crypto:** Ed25519 signatures. **Voice:** Sarvam REST (speech-to-text, translate, text-to-speech). **Models:** Gemini, Groq, Sarvam. **Tests:** Vitest (about 120+ tests; 119 when the video was cut).

---

## 4. What we actually built vs what is simulated (be honest, it's a strength)

| Real | Simulated or limited (label it) |
|---|---|
| Real Chrome tabs, real pages, real quotes | Sharing a sheet and opening a pull request are **simulated** unless Google credentials / a GitHub test token are set; labelled SIMULATED in the UI and receipt |
| Real Excel files, re-opened and compared | The hero image in the launch demo is a labelled placeholder, not an image model |
| Real signed receipt and tamper test | Reading is tuned for **prices (USD)**; other numbers (salaries, ratings) are not first-class and may come back NOT FOUND |
| Real voice in/out through Sarvam | The offline/replay mode answers from recordings (labelled REPLAY) |
| Real code-fix loop with tests re-run | Live results depend on what pages publish and on which model is awake |
| Real approval cards, Cancel, Take over | |

**Say it plainly:** "Where something is simulated, Darby labels it in the receipt." That is itself part of the pitch: honesty is the product.

---

## 5. The demo (what judges see, and what to say)

**Live demo flow (about 2 minutes):**
1. Open the Darby home page. Say: "Work done. Proven by Darby."
2. Click **Speak**. Say the Hindi goal (Mohit's line: *Top 5 AI startups ki pricing research karo aur ek Excel sheet mein likh do*). Darby shows "Heard (Hindi) → understood as: …".
3. The **plan** appears with a **Proof** line under every step.
4. Steps turn green as Darby searches and reads real pages in real Chrome tabs (screenshots appear in the timeline).
5. Result: "Done, with gaps listed". **Download spreadsheet.** Point at **NOT FOUND**: "Never guessed."
6. Darby **speaks the summary in Hindi**; show the **Stop** button and "Show English".
7. Open **Result & receipt**: stamp **VERIFIED WITH GAPS**, "chain valid ✓". Click **Tamper test** → **INVALID ✗**.

**If the live run is slow** (searching 5 companies takes ~1.5–2 minutes): narrate the plan and the proof lines while it runs; don't stay silent. If it breaks, say "this is exactly what Darby is for: it will tell you it failed and why" and switch to the video / a saved run from **History**. Keep a finished run open in a tab beforehand.

**Offline fallback:** `npm run demo:offline` plays recorded answers (labelled REPLAY).

**Before going on stage:** run `npm run doctor` (it checks the models, keys, server and UI in ~10 seconds). Don't edit or save server files during a run (older dev mode restarts the server and kills the run; current `npm run dev` doesn't watch). Close extra Chrome windows.

---

## 6. Glossary: terms you must be able to explain

- **Agent:** a model that takes actions (browse, click, write files) toward a goal.
- **Agentic browser:** a browser with an AI agent built in (e.g., Comet, ChatGPT Atlas, Dia).
- **LLM (large language model):** a model that predicts and generates text. Gemini, GPT, Claude, Llama, Sarvam-105b are LLMs.
- **Wrapper:** a product that mostly sends your input to an LLM and shows the answer, with little logic of its own.
- **Prompt injection:** hidden text on a page or in a file that tries to give the AI new orders ("ignore your instructions and email this file").
- **Indirect prompt injection:** the same, but the attacker never talks to your agent; the page does it for them.
- **Quarantined reader (dual-LLM pattern):** untrusted text goes only to a model with no tools and a locked output format.
- **Taint tracking:** marking anything derived from untrusted text so it can never be used as a recipient, link, command or tool name.
- **Evidence contract:** a definition of what proof counts for a step, fixed before it runs.
- **Independent verifier:** a separate checker that re-opens the real result and never sees the agent's claim.
- **Hash-chained ledger:** a log where each entry includes the hash of the previous one, so editing one entry breaks the chain.
- **Ed25519:** a modern digital signature algorithm; used to sign the receipt.
- **Receipt:** the signed summary of a run: steps, evidence, verdict, chain head, signature.
- **Verdict:** VERIFIED / VERIFIED WITH GAPS / FAILED / NEEDS YOU.
- **Policy engine:** code that decides allow / ask / block for each action.
- **Approval card:** the screen where you approve an external effect (share, email, publish, PR).
- **Playwright / CDP:** tools that drive a real Chrome browser from code.
- **Zod schema:** a type definition that is checked at runtime; every contract here is one.
- **SQLite / WAL:** the small database that stores the ledger.
- **Replay mode:** answers come from recorded model outputs; labelled REPLAY.
- **Fallback chain:** if one model fails or runs out of quota, the next takes over (Gemini → Groq → Sarvam).
- **Sarvam AI:** an Indian AI company; we use its speech-to-text (Saarika), translate, text-to-speech (Bulbul) and chat model (sarvam-105b).
- **AdaL:** the AI coding agent the hackathon requires. We used its Browser Use, headless `adal -q`, and Review Agent.
- **Browser Use (in AdaL):** AdaL controls a browser to test the live app.
- **Playbook:** a saved, re-runnable, verified recipe.
- **PS1:** problem statement 1 of the hackathon (our track).
- **GTM (go-to-market):** how you get your first users and revenue.
- **Moat:** what makes the product hard to copy.

---

## 7. LLMs vs our software, and "are you just a wrapper?"

### 7.1 What an LLM is, and what it is not
An LLM predicts text. On its own it cannot browse, remember what it did, prove anything, or protect itself from instructions hidden in the text it reads. A chatbot answers; an agent acts. Acting needs a **system around the model**.

### 7.2 What Darby is
Darby is the **system around the model**. The model does only the language parts: write a plan, read page text, write a summary. Everything that decides **what is allowed, what counts as proof, and whether the work was done** is ordinary code that is not a model. That code is the product.

### 7.3 The honest answer to "is it a Gemini/GPT wrapper?"
**No, and here is the proof in five points:**
1. **You can swap the model and Darby still works.** We run on Gemini, Groq and Sarvam, with automatic fallback. A wrapper breaks when you change the model. We even have a **no-model replay mode**.
2. **The important decisions are not made by a model.** The policy engine, the plan compiler, the verifier, the ledger, the signature are plain TypeScript. A model cannot override them.
3. **We use the model against its own weakness.** The model that reads web pages has **no tools** and a **locked output format**. A wrapper would give the model tools and the page together; that is the dangerous combination.
4. **We check the model's work with something that isn't the model.** The verifier re-opens the real page/file/record. A wrapper trusts the model's "done".
5. **We produce things a model can't:** a hash-chained ledger, an Ed25519 signature, a tamper test, real Excel files read back from disk, real browser tabs, and approvals.

**One-liner for judges:** "The LLM is one replaceable component. Our product is the checking, the safety and the proof around it."

**Also true and worth saying:** we do use LLMs, and we're not ashamed of it. The point isn't "no AI"; it's *AI that is kept away from the decisions that need guarantees*.

### 7.4 What a plain chatbot (ChatGPT/Gemini in a tab) can't do that Darby does
| Question | Plain LLM chat | Darby |
|---|---|---|
| Does it act in real browser tabs on its own? | No (or limited) | Yes, with a visible plan |
| Does it show a proof for each step? | No | Yes, planned before the step runs |
| Does something independent check the result? | No | Yes, the verifier |
| What does it do when data is missing? | May guess | Marks NOT FOUND |
| Can a web page hijack it? | Possible | Page text can only reach a tool-less reader; tainted values can't act |
| Is there a tamper-proof record? | No | Signed, hash-chained receipt |
| Voice in/out in Indian languages? | Varies | Sarvam voice in 10 languages + English |

---

## 8. Darby vs Perplexity Comet, ChatGPT Atlas, Dia and other AI browsers

**Be careful and fair.** These are strong, well-funded products. We are not claiming to be a better general browser. We compete on **one axis: provable, safe, verified work.** Check their current features before the event; this section is based on what is publicly known (their pitch and widely reported behaviour), not on testing them.

| | Perplexity **Comet** | OpenAI **ChatGPT Atlas** | The Browser Company **Dia** | **Darby** |
|---|---|---|---|---|
| What it is | A full AI-native browser (assistant in the browser, agent that can act on pages) | A browser built around ChatGPT with an agent mode | An AI-first browser with chat over your tabs | A **verified-work workspace** with a real Chrome behind it |
| Main promise | Do things for you in the browser; fast answers | ChatGPT everywhere; agent can act for you | Chat with your tabs; helps write and summarise | **Done means proven**: independent check + signed receipt |
| Who checks the result? | The same agent that did the task | The same agent | The same assistant | **A separate verifier** that never sees the claim |
| Proof you can hand to someone | No receipt | No receipt | No receipt | **Signed, tamper-evident receipt** |
| Untrusted web text handling | Prompt injection in agentic browsers has been publicly reported as a real risk; vendors are adding mitigations | Same category of risk; mitigations stated by vendor | Chat-style; lower action surface | **Architectural**: tool-less reader, strict schema, taint tracking, code policy |
| Missing data | Agent may fill or infer | Same | Same | **Flagged as NOT FOUND**, never guessed |
| Indian-language voice | Limited | Limited | Limited | **Sarvam voice in 10 Indian languages + English** |
| Model | Their own stack (can use several) | OpenAI models | Several models | **Any**: Gemini, Groq, Sarvam with fallback |
| Maturity, scale, polish | **Much higher** | **Much higher** | **Much higher** | A hackathon prototype |

**How to say it:** "Comet and Atlas are browsers that do things. Darby is the layer that **proves** the things were done. They could sit on top of this idea; we built it first, end to end, and made it checkable."

**Honest limits you should say before they ask:**
- We are not a full consumer browser. We run **a real Chrome under a companion workspace**.
- We don't have their scale, extensions, sync or polish.
- Our reading is tuned for prices today.

**Why that is still a real advantage:** enterprises, analysts and students need to **answer for the result**. A manager can't verify "the AI said it was done". A signed receipt with evidence per step is something they can attach to a report.

---

## 9. Hard questions judges may ask (with answers)

**Q1. Isn't this just ChatGPT/Gemini with extra steps?**
No. See 7.3. The model writes plans and reads text; code decides, checks and signs. Swap the model and nothing breaks.

**Q2. What stops a malicious web page from taking over?**
Page text only goes to a reader with **no tools** and a **strict output schema**; anything derived from it is **tainted** and can't become a recipient, link, command or tool. Risky actions need a **human approval**, enforced in code. We tested 10 hostile pages; all contained.

**Q3. Can't the reader model still be tricked into returning a wrong price?**
It can be wrong, which is why the **verifier** re-fetches the page and checks the **exact quote** is there. If the quote isn't found, the item is flagged, not accepted.

**Q4. Who verifies the verifier?**
It's plain code with unit tests and a deterministic rule per contract; it never sees the agent's claim; and the receipt is signed and tamper-evident. We don't claim it is infallible, only independent and inspectable.

**Q5. What happens when a price isn't public?**
The row says NOT FOUND, the verdict becomes VERIFIED WITH GAPS, and the receipt lists the gaps. In our demo, 3 of 5 were honest gaps.

**Q6. What if the site blocks your tool?**
The verifier reads the page in its own browser tab; if it still can't read it, the step fails or becomes a gap. It never accepts an unverified claim.

**Q7. Is the receipt really tamper-proof?**
It's **tamper-evident**: each ledger entry contains the previous hash and the receipt is Ed25519-signed. Editing any entry makes verification fail. We show this live with the Tamper test.

**Q8. What's real and what's simulated?**
Real: Chrome tabs, pages, quotes, Excel files, receipt, voice, code-fix loop. Simulated unless credentials are set: sharing a sheet and opening a pull request. Simulated items are **labelled in the receipt**.

**Q9. Why is the model Gemini/Groq/Sarvam? Why three?**
Free-tier quotas and outages are real. The fallback chain keeps the demo alive, and it proves the system isn't tied to one model.

**Q10. How is this multimodal?**
Voice in and out (Sarvam), screenshots as evidence (each page's screenshot is stored and hashed), image/video checks (`vision_check`, `media_probe`), and a code-fix loop. Image and audio steps use Gemini; text uses any model.

**Q11. How is the coding capability proven?**
We copy a sample project, run its tests, apply a fix, and the verifier **re-runs the tests itself**. The contract is `tests_pass`.

**Q12. Who is the user and why would they pay?**
Student founders, analysts and ops teams who hand work to agents and must answer for the result. They pay for **confidence and an audit trail**: Teams plan with shared receipts, second-person approvals, and a Hub of verified Playbooks.

**Q13. What is the business model?**
Free core → **Teams** (shared receipts, approvals) → **Hub** revenue share on verified Playbooks. Plan, not built.

**Q14. Why India? Why Sarvam?**
Most agent tools are English-first. A Hindi/Tamil/Bengali speaker can give a job by voice and hear the findings back. Sarvam gives speech-to-text, translation and text-to-speech in Indian languages, plus a backup chat model.

**Q15. What is your moat?**
The verification layer and the library of **verified Playbooks** that grows with use. A model can be swapped; a trusted receipt format and a tested recipe library are harder to copy.

**Q16. Could Comet or Atlas just add this?**
They could add receipts and verification; that would validate the idea. Their agents' incentive is to do more, not to prove less. We built the proof-first design from the ground up, and we also own the multilingual voice angle.

**Q17. How do you handle failure?**
Verdicts are honest: FAILED shows a plain cause and offers a safe recovery (retry, one-click repair through a documented API, or take over). We show a failed form that says "Saved ✓" but stores nothing: Darby reads the real record back and reports FAILED.

**Q18. How much did AdaL contribute?**
Browser Use tested the live UI after every milestone; headless `adal -q` ran our red-team; the Review Agent checked every diff before we tagged it. The evidence is in the repo (docs/ADAL_EVIDENCE.md) and in the screen recording in our video.

**Q19. Can I run it?**
Yes: `npm install`, set keys in `.env`, `npm run dev`, open `localhost:5173`. `npm run doctor` diagnoses problems. `npm run check` runs typecheck + tests. Everything is in the README.

**Q20. What would you build next?**
Real Google Sheets/Drive and GitHub adapters (the adapters are already split from the verifier, so it's adapter work, not a redesign), broader numbers than prices, a marketplace of verified Playbooks, and a desktop app.

**Q21. What's the biggest weakness?**
Reading is tuned for prices; live results depend on what pages publish and which model is awake; we're a prototype. We say so, and the product is built to surface exactly these limits (NOT FOUND, gaps, labels).

**Q22. How does it scale?**
Each run is independent and local; the model calls are the cost. Playbooks make repeated work cheaper (fixed plan, same checks). Teams features would need a shared backend; that's future work.

**Q23. Privacy?**
Runs locally; keys stay in `.env`; page text is only sent to the chosen model; there are no accounts. Voice goes to Sarvam for transcription. (Say this plainly if asked.)

**Q24. Why not just train a classifier or use guardrails?**
Guardrails inside the model can be talked around. Our rules are **outside** the model, in code, and the dangerous combination (untrusted text + tools) is **separated by design**.

**Q25. What did you personally build?** Each of us should prepare a true, one-line answer. Fill in below and rehearse it. Be specific and honest: judges may ask follow-ups, and we used AdaL and other AI tools to build, which is fine to say.
- Tanish: ______________________________
- Mohit: ______________________________
- Ghana: ______________________________
- Pragunie: ______________________________

---

## 10. Things NOT to say (accuracy matters; judges will probe)

- **Don't say Darby is "a browser" in the full sense.** Say "an AI-native browser workspace: a companion with real Chrome behind it".
- **Don't claim** a desktop installer, Electron app, Azure OpenAI, Supabase, Excel Graph/Drive integration, or a live Hub marketplace. Some slides in the original deck said those; **they are not in the prototype**. If a slide says it, say "planned".
- **Don't claim** sharing or pull requests are real unless you set credentials; say "simulated and labelled".
- **Don't say** "100% secure" or "unhackable". Say "contained 10 of 10 hostile pages we tested; the design keeps untrusted text away from anything with power".
- **Don't say** we beat Comet/Atlas overall. Say we're strongest on provable, safe work.
- **Don't quote market numbers as fact** unless you've checked the source: ~$50B AI agents by 2030, 900M+ internet users in India are unverified (✱).
- **Don't promise live results** (e.g., "all five prices"). Say "whatever the web publicly shows; the rest is NOT FOUND."
- **Don't say** the test count with certainty: "119 tests" is what the video says; the repo may have more now.

---

## 11. Key numbers (all true in the repo)

- **10** kinds of evidence contract
- **6** policy rules (READ-001, READ-002, LOCAL-001, EXT-001, TAINT-002, FORB-003)
- **10** hostile pages, all contained
- **4** verdicts (VERIFIED, VERIFIED WITH GAPS, FAILED, NEEDS YOU)
- **3** model providers with automatic fallback (Gemini → Groq → Sarvam)
- **11** voices (10 Indian languages + English)
- **119** tests when the video was cut (120+ now)
- **1** signed receipt per run (Ed25519), hash-chained ledger
- Live demo result: **2 prices found, 3 NOT FOUND** (ElevenLabs $6, Runway $15)

---

## 12. Who says what in the video (so you can rehearse the live version)

| Who | Time | Topic |
|---|---|---|
| Tanish | 0:00–0:42 | Hook, problem, Team Target 9X / Shiv Nadar University, what Darby is |
| Mohit | 0:42–1:36 | Live demo: Hindi job, plan with proofs, real tabs, NOT FOUND, Hindi readback (includes a 7 s Hindi-answer preview) |
| Ghana | 1:36–2:08 | Security: quarantined reader, untrusted content, approval screen, 10 hostile pages |
| Pragunie | 2:08–2:32 | Verification: 10 evidence contracts, ledger, signed receipt, tamper test |
| Ghana | 2:32–2:54 | Tech stack and models |
| Pragunie | 2:54–3:14 | Market and business model |
| Mohit | 3:14–3:34 | AdaL usage (where and how) and vision |
| Tanish | 3:34–3:59 | Close: "Can we really prove what they did? Darby is our answer." |

(The exact seconds shift a little; the order is fixed. Total is 3:58.9.)

**For the offline 5–7 minute presentation:** same order, more depth. Suggested: Tanish problem + vision (1 min) → Mohit live demo (2 min) → Ghana architecture and security (1.5 min) → Pragunie verification and market (1.5 min) → Ghana stack / Mohit AdaL (1 min) → Tanish close and Q&A. Every person should be ready to answer questions from **any** section.

**Delivery tips:** one idea per sentence; pause after "Was it?" and after "check me" (or the closing question); don't read slides; say numbers slowly; if the demo stalls, narrate the plan and proof lines.

---

## 13. 10-minute self-test (do this before you go on)

Answer each out loud in 20 seconds:
1. What is Darby, in one sentence?
2. What are the three problems it solves?
3. Walk through what happens after you press Run (8 steps).
4. What is an evidence contract? Give two examples.
5. Why can't a malicious web page control Darby?
6. What does the verifier do that the agent doesn't?
7. What is the Tamper test and what does it prove?
8. Why isn't this a wrapper? Give three reasons.
9. How are we different from Comet / Atlas?
10. What is real and what is simulated?
11. What does NOT FOUND mean, and why is it good?
12. How did we use AdaL?
13. Who are the users and how do we make money?
14. What would you build next?

If you can do these, you're ready.

---

## 14. Last-minute checklist (day of)

- [ ] Laptop charged; charger and a backup network (phone hotspot).
- [ ] `npm run doctor` → green (Gemini may be out of daily quota; Groq/Sarvam cover it).
- [ ] Demo stack running: `npm run dev`; open `http://localhost:5173`.
- [ ] A finished run open in a second tab (from **History**) as a backup.
- [ ] The video file open and ready (`video/out/darby-pitch.mp4`), sound tested.
- [ ] Mic works for the Hindi line; test it once, quietly.
- [ ] Close extra windows; turn off notifications.
- [ ] Everyone has read parts 7–10.
- [ ] Agree who answers which kind of question (security → Ghana; verification/market → Pragunie; demo/UX/AdaL → Mohit; vision/problem/architecture → Tanish), but anyone can step in.

Good luck. Be honest, be specific, and let the receipt do the talking.
