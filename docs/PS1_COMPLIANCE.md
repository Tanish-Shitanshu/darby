# PS1 compliance, line by line

Source: "Problem Statement-1: Build an AI-Native Browser with an Autonomous Multimodal Companion Using AdaL" (organiser PDF).
Status: MET (works, tested), PARTLY (works with a stated limit), NOT MET (not built), OWNER (only the team can do it).

## Section 3, core capabilities
| # | Requirement | Status | Evidence / limit |
|---|---|---|---|
| 1 | AI-native browsing: understand intent, operate actual tabs, websites, authorized web apps | MET | Playwright drives real Chrome tabs (3 in parallel); fixture sites and the LeadDesk web app; `case1`, `case4`, UI walkthrough |
| 2 | Autonomous task execution: multi-step plans using browser, APIs, other tools | MET | Planner builds typed plans; tools include `browser.read_page`, `browser.act`, `http.request` (documented API), `sheet.write`, `gtm.*` |
| 3 | Multimodal: image, audio, video understanding or generation | PARTLY | Image understanding (vision check on screenshots, screenshot-to-goal). Audio: voiceover generation (Edge TTS / macOS say / espeak). Video: 15 s teaser composed with ffmpeg and probed. Image generation is a labelled placeholder card: Gemini image models returned quota errors on the free tier (tested), and paid services are out of scope. Audio transcription and video understanding are not built |
| 4 | Coding and development: AdaL assists implementation, debugging, testing | PARTLY | A model writes the landing page and Darby tests it in a real tab with one repair loop (`case3`). AdaL's own contribution: M0-M3, red team (see `docs/ADAL_EVIDENCE.md`); the rest is logged as built with another assistant. Recording still needed: OWNER |
| 5 | GTM automation: research, competitor analysis, content, launch | MET | Case 3: competitor research, positioning and copy, hero, voiceover, teaser, landing page, test, PR behind approval |
| 6 | Verification and transparency: verify outcomes, show progress, report failures honestly | MET | Independent verifier, 10 evidence-contract kinds, live timeline, evidence drawer, signed receipt, `case4` FAILED then repaired |
| 7 | User control and security: approvals, cancellation, manual takeover | MET | Approval card (Approve / Deny / Take over), Cancel, Take over and Resume; `cancel`, `cancel-approval`, `takeover`, `case1-denied`, `case3-denied` |

## Section 4, mandatory AdaL requirement
| Requirement | Status | Note |
|---|---|---|
| AdaL actively used in development, not just documented | PARTLY | Genuine for M0-M3 and the independent red team (commit trailers `Built-with: AdaL`, `docs/evidence/adal-redteam`). Later milestones were built with another assistant and are logged that way |
| Brief explanation and demonstration of AdaL's role; genuine evidence (recording or live demo) | OWNER | `docs/ADAL_TODO_FOR_OWNER.md` lists the sessions and prompts to run and record |

## Section 5, Pillar 1 (potential capabilities)
| Capability | Status | Evidence / limit |
|---|---|---|
| Context-aware assistance using the active or user-selected tab | PARTLY | Optional "Page context" field in the goal box (user-selected page, restricted to allow-listed origins). Darby does not read the user's own live Chrome tabs |
| Multi-step browser automation and web research | MET | Case 1 (10 pages, 3 at a time), Case 3, and open-web research on the real internet: `web.search` then read the hits (policy READ-002; public sites only, no forms). Live run: top-5 AI startups to `Top AI Startups.xlsx`, two prices proven by exact quotes, the rest flagged NOT FOUND. Offline test: `case5`, `case5b` |
| Real editing of documents and spreadsheets | PARTLY | Real xlsx file written and read back from disk. Google Sheets (M4) is not configured |
| Structured extraction and report generation | MET | Quarantined reader with a strict schema; positioning and launch-post documents |
| Connected-app workflows via authorized APIs or browser automation | PARTLY | LeadDesk app via browser and its documented API (real, local). GitHub PR and sheet sharing are simulated and labelled unless tokens are set |
| Task history, progress tracking, user-controlled memory | MET | Recent runs, run progress bar and timeline, Memory tab (add, view, delete) |
| Independent verification and transparent failure reporting | MET | As above |
| Example: research ten AI startups, compare, create a spreadsheet, read back, flag unknowns, provide the artifact | MET | Case 1: 10 rows read back, gaps exactly cobalt, echo, helio flagged NOT FOUND, `Competitors.xlsx` provided |

## Section 5, Pillar 2 (potential capabilities)
| Capability | Status | Evidence / limit |
|---|---|---|
| Codebase understanding, debugging, test execution, code changes | PARTLY | The product writes and tests code (landing page). Codebase analysis of a user's repository is not built |
| Browser-based testing of locally running applications | MET | `gtm.test_page` opens the generated page in a fresh tab with assertions and a vision check; the walkthrough tests Darby's own UI |
| Image understanding and generation | PARTLY | Understanding yes; generation is a labelled placeholder |
| Audio transcription, voiceover, audio analysis | PARTLY | Voiceover and a duration probe yes; transcription no |
| Video understanding, generation, editing, compositing | PARTLY | Generation and compositing yes (hero + captions + voiceover); understanding no |
| Market and competitor research | MET | Case 3 |
| GTM content creation, messaging, campaign preparation | MET | Case 3 outputs, reviewable in the Review panel |
| Chaining multiple tools into one end-to-end workflow | MET | Nine-step chain in Case 3 |
| Example: audience analysis, competitors, concept, creative assets, launch campaign, reviewable outputs in a coherent workspace | MET | Case 3 and its Review panel |

## Section 6, mandatory functional requirements
| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Natural-language, multi-step instruction converted to a plan | MET | Goal box, plan with proof per step; text, voice (Chrome) or screenshot input |
| 2 | At least one workflow on a real page, local app, or document; simulated actions do not count | MET | Case 1 and Case 4 act on real pages and a real xlsx / the real LeadDesk app. Simulated items (share, PR) are labelled and are not what the verdict rests on |
| 3 | Verify the change occurred before marking complete | MET | `sheet_readback`, `quote_in_page`, API read-back, `page_assertions`, vision, `media_probe`, `pr_exists`; `case4` proves a false "Saved ✓" is caught |
| 4 | Inspect progress, actions, results, errors | MET | Timeline, evidence drawer, receipt |
| 5 | Cancel, intervene manually, approve consequential actions (send, publish, delete) | MET | Cancel, Take over, approval cards for share and PR. No delete tool exists, so there is nothing to approve there |
| 6 | At least one end-to-end workflow combining multiple tools | MET | Case 3 |
| 7 | Mandatory AdaL usage, explained and demonstrated | PARTLY / OWNER | See section 4 |

## Section 7, suggested architecture (illustrative, not required)
| Item | Darby |
|---|---|
| Desktop/browser: Electron, Chromium, or other | Chromium via Playwright plus a web companion (browser-integrated workspace). No Electron shell |
| Frontend React + TypeScript | Yes (Vite) |
| Agent runtime: planner, tool router, execution controller, policy engine, verifier | Yes, all five |
| AI layer | Gemini (free tier) with a pluggable provider; replay mode for offline |
| Browser automation | Playwright |
| Backend Node + TypeScript | Yes (Express + WebSocket) |
| Database | SQLite (append-only ledger); no Supabase |
| Integrations: Google Workspace, GitHub, Slack, Notion | GitHub (simulated unless token), local sheet; no Slack, Notion or Google |
| Multimodal services | Vision model, TTS, ffmpeg |

## Section 8, evaluation criteria
| Criterion | Weight | Where it is shown |
|---|---|---|
| Functional execution and verified outcomes | 25 % | Four cases, UI walkthrough 20/20 (offline and live), `docs/evidence/` |
| Agent intelligence and multi-step orchestration | 20 % | Typed plans, parallel tabs, replanning after failure (Case 4), Playbook replay, 9-step Case 3 chain |
| Multimodal and coding capabilities | 15 % | Vision, voiceover, teaser video, model-written landing page tested in a real tab; limits above |
| User experience and workflow clarity | 15 % | Product UI at 1280x720, 1920x1080 and phone width; screenshots in `docs/evidence/ui` |
| Security, permissions, user control | 10 % | Policy engine, taint tracking, 10 poisoned pages, red team (48 independent attempts, 0 bypass after fix), approvals, Cancel, Take over |
| Practical value, originality, GTM potential | 10 % | `docs/VALUE.md` |
| Demonstrated AdaL usage | 5 % | Partial; OWNER sessions pending |

## Section 9, deliverables
| # | Deliverable | Status | Where |
|---|---|---|---|
| 1 | Working prototype of the core workflow | MET | `npm run demo:offline` |
| 2 | Live demo or short video | OWNER | `docs/DEMO_SCRIPT.md`; the video must be recorded by the team |
| 3 | Source with setup and run instructions | MET | `README.md` |
| 4 | Architecture overview (agent, tools, verification) | MET | `docs/ARCHITECTURE.md` |
| 5 | Test case with success and failure handling | MET | `case1` (success with gaps), `case4` (failure then repair), `npm run test:acceptance` |
| 6 | Users, value, future | MET | `docs/VALUE.md` |
| 7 | AdaL usage evidence (recording of coding, debugging, browser testing) | OWNER | `docs/ADAL_TODO_FOR_OWNER.md` |

## Section 10, security and responsible execution
| Requirement | Status | Evidence |
|---|---|---|
| Respect website permissions, authentication boundaries, privacy | MET | Allow-listed origins (READ-001), no credential entry tools, local-only data |
| External pages and documents treated as untrusted | MET | Quarantined reader, taint tracking, `case2*` |
| Sensitive actions require approval | MET | EXT-001 approval cards |
| Credentials handled securely | MET | Keys only in `.env`, never logged (redaction tests), secret guard on every push |
| Never claim success without evidence | MET | Verdict comes from the verifier, not the agent; `case4` |
| Honest failure and a safe recovery path | MET | FAILED with plain cause, recovery offered, repair run |

## Section 11, expected outcome
"Not a browser with a chatbot, a coding assistant with a browser tool, or disconnected APIs; a unified workspace that understands a goal, selects capabilities, executes real work, verifies, presents transparently." Darby's single companion workspace does this through one plan, one policy engine, one verifier and one receipt across research, forms, and GTM assets.

## What would still move the score
1. AdaL recordings (OWNER): Browser Use QA, Video Producer intro, Playbook in AdaL, a debug story.
2. A demo video (OWNER).
3. Google Sheets and a real GitHub test repo PR (needs credentials: OWNER).
4. Audio transcription and a real image-generation provider (needs a paid or approved service; not done).

## Final status update (supersedes the PARTLY rows above where it says so)
| PS1 line | Now | Evidence |
|---|---|---|
| Image generation | MET with a live model: the hero uses real AI-generated artwork (free, key-less service), labelled `GENERATED:image-model(pollinations)`. Offline replay and any failure fall back to the labelled placeholder card | `gtm.hero_image`; Review panel caption says "AI-generated artwork" or "generated placeholder" |
| Audio transcription / analysis | MET: the Speak button records from the microphone and the multimodal model transcribes it into the goal box; works in any browser, not only Chrome | `POST /api/transcribe`; tested live with a generated voice clip |
| Codebase understanding, debugging, test execution, code changes | MET on a sample project: copy into the workspace, run its tests (2 of 3 fail), the coder model fixes one source file, the verifier runs the tests itself in a fresh process (3/3 pass), a diff is kept, the original is never edited; a coder answer that runs a shell command is refused | scenarios `case6` (scripted coder), `case6-real` (real planner and coder, recorded), `case6b` (hostile coder answer); new evidence kind `tests_pass` |
| Real internet research into an Excel sheet | MET (live): `web.search`, public-site reads only, quotes re-checked by the verifier's own fresh read, `.xlsx` shown in the app and downloadable | `case5`, `case5b`; live run in `docs/SUBMISSION.md` |
| "Desktop browser" | browser-integrated workspace plus an app-style window: `npm run desktop` opens Darby in its own Chrome app window (no tabs or address bar) | `scripts/demo.mjs --app` |
| Agentic voice assistant in Indian languages | MET with a Sarvam key: speak in 10+ languages, Darby runs the whole task and reports back by voice or text with the key findings; stop at any time; text-only mode | `/api/voice/*`, `/api/runs/:id/summary`, `apps/server/src/voice/`, unit tests with a mocked API (no key needed) |
| Still not built | video understanding of third-party video; Slack, Notion, Google Workspace connectors; Electron installer; context from the user's own live Chrome tabs (a "Page context" field exists instead) | listed in `docs/DECK_AUDIT.md` |
| Still the owner's | AdaL usage recordings, demo video, real GitHub PR token | `docs/ADAL_TODO_FOR_OWNER.md` |
