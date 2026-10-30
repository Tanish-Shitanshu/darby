# PS1: what we cover, what's novel, and the two-laptop flow

Source: the organisers' PDF "Problem Statement-1: Build an AI-Native Browser with an Autonomous Multimodal Companion Using AdaL". Status words: **MET** (works and tested) · **PARTLY** (works with a stated limit) · **NOT BUILT** (say "planned") · **YOURS** (only the team can do it).

---

## PART 1: Coverage, exactly

### A. The seven core capabilities (PS section 3)

| # | PS asks for | Status | How we do it (and what to show) |
|---|---|---|---|
| 1 | **AI-native browsing**: understand intent, operate real tabs, websites, authorised web apps | **MET** | You state a goal in plain words (typed, spoken, or from a screenshot). Darby drives **real Chrome tabs** through Playwright, three in parallel. Show: the timeline with page screenshots. |
| 2 | **Autonomous task execution**: plan and run multi-step tasks with browser, APIs, tools | **MET** | A planner writes a typed plan; the compiler fixes risk and proof; the executor runs `web.search`, `browser.read_page`, `reader.extract`, `sheet.write`, `http.request` (documented API), `gtm.*`, `code.*`. Show: the plan with Proof lines. |
| 3 | **Multimodal**: image, audio, video | **PARTLY** | **Audio:** voice in and out in 10 Indian languages + English via Sarvam (speech-to-text, translate, text-to-speech). **Image:** screenshots as input and as evidence, vision checks, generated hero artwork (labelled). **Video:** a 15-second teaser composed with voiceover (ffmpeg) and probed. **Not built:** understanding of someone else's video. Show: the Hindi voice job and spoken summary. |
| 4 | **Coding and development** | **PARTLY** | A code goal copies a sample project, runs its tests, the coder model fixes the bug, and **the verifier re-runs the tests itself** (`tests_pass`). A model-written landing page is tested in a real tab and repaired once. **Not built:** analysing a user's own repository. AdaL's role in building: see section D below. |
| 5 | **GTM automation**: research, competitors, content, launch | **MET** | Case 3: competitor research, positioning and copy, hero image, voiceover, teaser, landing page, a test, and a pull request behind an approval. (Pull request is **simulated and labelled** unless a GitHub token is set.) |
| 6 | **Verification and transparency**: verify outcomes, show progress, report failures honestly | **MET** | The product's centre. Independent verifier (10 evidence kinds), live timeline, evidence drawer, hash-chained ledger, **signed receipt**, honest verdicts. Show: Proof lines, NOT FOUND, tamper test, "A form that lies". |
| 7 | **User control and security**: approvals, cancellation, manual takeover | **MET** | Approval cards for anything that touches the outside world (share, publish, PR), **Cancel**, **Take over and Resume**, policy rules in code, quarantined reader, taint tracking, 10 hostile pages. |

### B. The seven mandatory functional requirements (PS section 6)

| # | Requirement | Status | Where it's shown |
|---|---|---|---|
| 1 | Natural-language multi-step instruction → plan | **MET** | Goal box → plan with proof per step |
| 2 | At least one workflow on a **real** page/app/document (simulated doesn't count) | **MET** | Real Chrome pages, a real Excel file read back from disk, a real local web app. Simulated items are labelled and **are not what the verdict rests on** |
| 3 | Verify the change occurred **before** marking complete | **MET** | `sheet_readback`, `quote_in_page`, API read-back, page assertions, `tests_pass`. "A form that lies" proves a false "Saved ✓" is caught |
| 4 | Inspect progress, actions, results, errors | **MET** | Timeline, evidence drawer, receipt |
| 5 | Cancel, intervene, approve consequential actions | **MET** | Cancel, Take over, approval cards. There is no delete tool, so nothing to approve there |
| 6 | One end-to-end workflow combining multiple tools | **MET** | Case 3's chain (research → copy → image → voice → video → page → test → PR) and the research → Excel → spoken summary flow |
| 7 | Mandatory AdaL usage, explained **and demonstrated** | **PARTLY / YOURS** | See D. |

### C. Security and responsible execution (PS section 10)

| PS says | Status | How |
|---|---|---|
| Respect permissions, authentication boundaries, privacy | **MET** | Allow-listed origins; public-web reads only (rule READ-002); no tool types credentials; local data |
| External pages and documents are untrusted input | **MET** | Quarantined reader (no tools, strict schema), taint tracking, 10 hostile pages contained |
| Sensitive actions need approval | **MET** | EXT-001 approval cards with full details |
| Credentials handled securely | **MET** | Keys only in `.env`, redacted from logs, a secret guard on every push |
| Never claim success without evidence | **MET** | The verdict comes from the verifier, not from the agent |
| Fail honestly and offer a safe recovery | **MET** | FAILED with a plain cause; one-click repair run linked to the failed one |

### D. AdaL (PS section 4): **say this carefully**

**What is true and evidenced:** the first milestones (the scaffold, server and companion) and the independent red-team were done with AdaL (commit trailers `Built-with: AdaL`; `docs/evidence/adal-redteam`; `docs/ADAL_EVIDENCE.md`). **Browser Use** tested the live UI; the screen recording in our video shows real AdaL sessions.
**What to be straight about if asked:** later polish and features were built with other assistants as well. The PS says AdaL must be *actively used* in building, not that it must write every line, and it says the product need not depend on AdaL at runtime. So the honest framing is: **"AdaL was our coding agent for the core build, our UI tester and our red-teamer."** Don't say "AdaL built everything." Judges can ask to see the sessions.

### E. Deliverables (PS section 9)

| # | Deliverable | Status |
|---|---|---|
| 1 | Working prototype | **MET** |
| 2 | Live demo or short video | **MET** (our 3:58 video + the live demo) |
| 3 | Source code with setup and run instructions | **MET** (`README.md`; `npm run doctor`) |
| 4 | Architecture overview | **MET** (`docs/ARCHITECTURE.md`, slide, video) |
| 5 | Test case: success and appropriate failure handling | **MET** (research-with-gaps = success; "A form that lies" = failure then repair) |
| 6 | Users, value, future | **MET** (`docs/VALUE.md`) |
| 7 | AdaL usage evidence | **MET for what we recorded** (the screen recording in the video); more sessions help |

### F. What is **not** built (say "planned", never imply it exists)
- Understanding of third-party **video**.
- **Slack, Notion, Google Workspace** connectors; real Google Sheets/Drive sharing (local Excel is real; sharing is simulated unless credentials are set).
- **Electron installer** or a standalone desktop browser (we are a browser-integrated workspace, plus an app-style window via `npm run desktop`).
- Reading the **user's own live Chrome tabs** (we have a "Page context" field instead).
- **Rupee prices** in the research reader (it reads USD only today; see `PITCH_FINAL.md`).
- Some slides of the original deck claim things above (Electron, Azure OpenAI, Supabase, Excel Graph/Drive). **Do not show or say them.**

---

## PART 2: What is novel

### Beyond what the PS asks for
The PS asks for a browser that acts and verifies. We went further on **trust**:

1. **A signed, hash-chained receipt** with a built-in **tamper test**. The PS asks you to verify; it doesn't ask you to prove the verification itself wasn't altered.
2. **Separation of duties**: the checker **never sees the agent's claim** and re-opens the real result. Most agents self-report.
3. **Proof planned before the step runs** (evidence contracts): "what counts as proof" is decided up front, in code.
4. **Untrusted text is architecturally quarantined**: a tool-less reader with a locked schema, plus **taint tracking** so page-derived values can never become a recipient, link or command.
5. **Policy as code, not prompts**: rules with visible ids (READ-002, EXT-001, TAINT-002…). A model can't talk its way past them.
6. **NOT FOUND instead of guessing**: gaps are first-class, listed on the receipt, and change the verdict to "verified with gaps".
7. **Model-agnostic**: Gemini → Groq → Sarvam with automatic fallback; swap the model and the product is unchanged; a no-model replay mode exists.
8. **Honest labelling inside the signed receipt**: anything simulated or replayed is labelled.
9. **Repair runs**: after a failure, a one-click safer path, with the second receipt saying it repairs the first.
10. **Playbooks**: a verified run becomes a re-runnable recipe with a permission manifest, and replays are **verified again, not trusted**.
11. **Agentic voice in Indian languages**: speak the job in Hindi, Darby does it and **speaks the findings back**, with Stop and text-only. Not just a chatbot with a mic.
12. **A tested red-team**: 10 hostile pages contained; an independent attempt of 48 bypasses, 0 after the fix.

### Versus the AI browsers
**Careful and fair.** We have **not** tested Comet, Atlas or Dia ourselves. Say "as far as we've seen" and rely on what's publicly reported:

| Public, citable fact | Source (have the page ready) |
|---|---|
| Brave reported **indirect prompt injection in Perplexity's Comet** (August 2025), later follow-ups in October 2025; Perplexity itself said prompt injection remains an unsolved industry problem | [The Decoder](https://the-decoder.com/brave-discovers-a-security-flaw-in-perplexitys-comet-browser/) · [PPC Land](https://ppc.land/comet-browser-faces-multiple-security-vulnerabilities-from-prompt-injection/) · [Thurrott](https://www.thurrott.com/a-i/324823/brave-discovers-security-vulnerability-in-perplexity-comet) |
| **OpenAI said prompt injection is "unlikely to ever be fully solved"** for Atlas's agent (December 2025); it advised logged-out mode and reviewing confirmations | [The Decoder](https://the-decoder.com/openai-admits-prompt-injection-may-never-be-fully-solved-casting-doubt-on-the-agentic-ai-vision/) · [Fortune](https://fortune.com/2025/12/23/openai-ai-browser-prompt-injections-cybersecurity-hackers/) |
| Gartner reportedly advised companies to **block AI browsers** | reported in the same coverage; verify before quoting |

(I read these through a web search just now. **Check the originals before you quote exact details.** Our press-style claims must be verifiable.)

**Safe things to say:** *"They race to do more. We're on the other axis: prove it. Even their makers say injection won't be fully solved, so we don't try to out-prompt it; we keep untrusted text away from anything with power and check everything from outside."* And: *"As far as we've seen, none of them gives you a signed receipt."*

**Don't say:** that they are insecure today, that they don't verify anything internally, or that we're better overall.

---

## PART 3: The two-laptop flow (what you described)

### Setup
| | **Laptop A: the web laptop** | **Laptop B: the slides laptop** |
|---|---|---|
| Runs | Chrome with **tabs in this order**: 1) competitor site 2) Darby (live) 3) Darby (pre-loaded finished run) 4) the source article tabs | The PPT only (3 slides) |
| Prepared | Darby stack up and `npm run doctor` green; competitor page already loaded; **screenshots of the competitor page saved on the desktop** in case Wi-Fi fails | Slides open in presenter mode |
| Who | **Mohit** drives | **Pragunie** advances slides |

**Display:** ask the organisers on arrival how the projector takes **two inputs** (a switcher, or two HDMI ports). If it can't, use **one laptop** and Alt-Tab between a browser window and the slides window, and **practise the switch until it takes 2 seconds.** If you can't be sure, plan for one laptop; two is a bonus.

### Run of show (4:00; cut list at the bottom)
| Time | Laptop | Who | What happens |
|---|---|---|---|
| 0:00–0:25 | none | Tanish | Show of hands; the PS "autonomous… who checks?" story |
| 0:25–0:55 | **A: competitor site** | Pragunie | Open **one** competitor's real site. State the issues (see script). "They race to do more." |
| 0:55–1:30 | **B: slides** | Ghana | Slide 1: architecture and *why* (one slide). Slide 2: **AdaL, where and how**. |
| 1:30–3:30 | **A: Darby live** | Mohit + Ghana | **Show the issues in real time**: judge picks five AI tools → live run while Ghana explains "not a wrapper" → NOT FOUND, evidence quote, Hindi voice, **tamper test** → (if time) **"A form that lies"** card |
| 3:30–4:00 | A | Tanish | Close and the hands-down callback |

### What to say at the competitor site (0:25, 30 seconds)
*[Open the real homepage of one competitor, e.g. Comet's page. Don't click around.]*

"This is a real AI browser. It does tasks for you, and it's genuinely impressive. We respect that. But here are three things that worry us, **and they aren't ours, they're publicly reported.**

One: researchers showed that a web page can **hide instructions** and an agentic browser may obey them. Two: its makers say this problem is **unlikely to ever be fully solved.** Three: when it says 'done', **who checked?** The same agent that did the work.

We're not saying don't use it. We're asking: what would it take to **trust** it? That's what we built."

### Showing the issues **in real time** (1:30–3:30), issue by issue
You told the room three issues. Now **show Darby handling each**, in this order:

| Issue you named | What you do live | What the room sees |
|---|---|---|
| "Who checked?" (self-reported done) | The judge-picked run; click `evidence` on a step | The quote, the screenshot, the hash. A **separate** verifier found it |
| "It may make something up" | The sheet with **NOT FOUND** | An honest blank instead of a guess; "Done, with gaps" |
| "Pages can hijack it" | Point at the timeline rule ids (READ-002); say "page text only reaches a reader with no hands"; if time, open Case 1's **Fathom warning** (the poisoned page) and show **the outbox is empty** | Flagged, ignored, nothing sent |
| "Done" that isn't | Click the home-page card **"A form that lies"** (Case 4) | The page shows "Saved ✓"; Darby reads the data back: **FAILED**, plain cause, then **"Try a safer way"** repairs it |
| "Can I trust the proof itself?" | **Tamper test** | Valid → **INVALID** |

Order if short on time: judge's run → NOT FOUND → **tamper test** → (cut the rest).

### Cut list if over 4:00
1. "A form that lies" (30 s). 2. The Fathom page (15 s). 3. Slide 2 (AdaL) down to one sentence, **not removed**. 4. The competitor portion down to two issues.
**Never cut:** the judge's prompt, NOT FOUND, the tamper test, the AdaL line.

### Risks specific to this flow
- **Don't improvise claims about the competitor on stage.** Use only the three public facts above. If a judge asks "did you test Comet?": *"No, we didn't; we rely on what researchers and the vendors themselves have said."*
- **Rupee pages:** if a judge names Slack/Zoom/Canva, the sheet shows NOT FOUND for rupee pages. Use the line in `PITCH_FINAL.md`.
- **Two displays can fail.** One-laptop fallback rehearsed.
- **Time:** this flow is **very tight at 4:00**. If your slot allows 4:30–5:00, keep everything; otherwise use the cut list. Rehearse once with a stopwatch.
