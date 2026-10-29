# Submitted deck (Darby · Target 9x) — extracted text, for AdaL context
The deck is the commitment. The prototype must make every slide true.

 PS1     HackBriven Build Arena · Round 1 submission




Darby
                                                                                               Darby · research 10 AI startups

                                                                                             Plan: 4 steps, proof per step
                                                                                             Research 10 sites (reader isolated)
                                                                                             Write 10 rows to the Sheet

The AI-native browser where                                                                  Read back: 10 of 10 match
                                                                                             Share with team: you approved
“done” means proven.
                                                                                          VERIFIED WITH GAPS
Theme: an AI-native browser with an autonomous multimodal companion,
                                                                                         receipt 9f3a…c21e · 3 gaps flagged
built with AdaL.

  TEAM                                             MEMBERS
  Target 9x                                        Tanish Shitanshu        Sai Mohit Kotta           Ghana Polisetty          Pragunie Aditya
                                                   Team Leader             Member                    Member                   Member
  ID: team-B92D1FB4BB23
                                                   Shiv Nadar Institution of Eminence, Delhi NCR

DESIGN TARGETS FOR THE BUILD


 7/7                                    4                                     10                                     0
 PS1 requirements covered               live demo cases, one a failure        red-team poisoned pages                risky actions without approval


Concept preview of the Darby interface · sample data                                                                                                  1/7
02 · PROBLEM STATEMENT AND EXISTING GAP

AI browsers act on the web, but nobody proves the work
  A TYPICAL RUN                                                                    THE COST, AS REPORTED

                                                                                   30–61% of
                                   STARTUP       PRICE SOURCE                                real web tasks completed; most agents
                                   Acme AI       $29      found                           ~30%, best 61%
   “Put 10 competitors and
                                   Cobalt        $75      guessed                                   of failed runs wrongly marked “success” by
   their prices in my Sheet.”                                                      45%+             automated judges. Microsoft Research, 2026
                                   Delta         $99      found
       Done. All 10 added.                                                                          Gartner’s Dec 2025 advice on AI browsers, “for
                                   Echo          $60      guessed                  Block            now”
                                   + 6 more rows
                                                                                   WHO IS AFFECTED
  3 guessed prices, 1 hidden instruction on a page, no check.
                                                                                    Founders       Analysts   Students     Ops teams

CURRENT SOLUTIONS AND THEIR GAP

 Consumer AI browsers               Open agent stacks                 Research prototypes                     The gap
 Comet, Neon and Dia act for        browser-use and BrowserOS         Magentic-UI has strong              Nobody ties every step to evidence,
 you, but “done” is the agent’s     are flexible, with no proof or    oversight, but no evidence          isolates untrusted pages and hands back
 own word.                          receipts.                         contracts or receipts.              proof.
                                                                                                          Self-graded · Mixed trust · No audit trail




Sources: arXiv:2504.01382 · arXiv:2604.06240 · Gartner 7211030 · public docs, Oct 2026                                                           2/7
03 · PROPOSED SOLUTION

Darby plans with proof and returns a receipt
      In simple terms: Darby does the web work for you, then shows proof that it was done.


       1 You ask                      2 It plans                     3 It acts                        4 It checks                     5 You get proof
 Text, voice or a         → Typed steps, each with → Real tabs and apps;                   → Read-back, vision,         → A tamper-evident
 screenshot                     a proof contract               risky steps wait for you         independent verifier            receipt, clear verdict

                                                                                    WHAT DARBY ADDS
  ONE STEP, CONCRETELY
  STEP 2       write 10 rows to “Competitors!A2:F11”                                      Evidence contracts                  Quarantined reader
  PROOF        Sheets API read-back must equal the rows we wrote                     Every step names its proof.       Pages never reach the planner.
  CHECK        contract + fresh read; blind to the claim
                                                                                          Independent verifier                Tamper-evident
  RESULT       10/10 match, 3 empty → VERIFIED WITH GAPS
                                                                                     Fresh read of API, DOM or                receipt
                                                                                     screen.                           Hash-chained, signed,
                                                                                                                       shareable.

PS1 MANDATORY REQUIREMENTS: ALL SEVEN COVERED

1 Natural language    2 Real tool          3 Outcome             4 Transparent            5 Approval and      6 Capability           7 AdaL builds
tasks                 execution            verification          execution                control             orchestration          Darby



PS1: Build an AI-Native Browser with an Autonomous Multimodal Companion Using AdaL                                                                       3/7
04 · ARCHITECTURE AND TECH STACK

A trust boundary between what Darby plans and what pages say
YOU · LOCAL APP                   TRUSTED · SEES GOALS                             UNTRUSTED · SEES PAGES                    THE WORLD

 Companion panel          goal     Plan compiler                     fields only    Quarantined reader           page text    Web pages
 You speak or type;                Goal → typed plan, proof                         Tool-less LLM, schema-                    Untrusted text and
 you approve here                  per step                                         only output                               screenshots

                                                    typed plan

                                   Policy engine                   gated steps      Executor                        acts      Real tabs and apps
               signed receipt      Risk tiers, taint labels,                        Chromium via CDP, APIs,                   Sheets, Excel, Drive,
                                   approvals                                        code                                      GitHub



 Receipt ledger           proof    Verifier                                          independent read-back
 Tamper-evident hash               Fresh read of API, DOM or
 chain, signed                     screen; blind to claim


 Frontend                          Backend                                          Browser control            Integrations
 Electron · React · TS             Node.js · TypeScript                             Playwright · CDP           Sheets · Excel (Graph) · GitHub

                                                                                    AdaL, beyond coding
 AI layer · three model roles                       Data
                                                                                    Builds Darby · Browser Use tests it · red-teams it
 Azure OpenAI via Microsoft Foundry                 SQLite · Supabase sync
                                                                                    SKILL.md Playbooks · Video Producer teasers
 Vision · speech · image · video                    Memory you control
                                                                                    Proof: session recordings · commit tags · test logs

Design basis: CaMeL (arXiv:2503.18813) · AdaL docs (docs.sylph.ai)                                                                                    4/7
05 · KEY FEATURES

Five features, each built to make “done” checkable
  CORE                           NOVEL                        TRUST                        MULTIMODAL                    VISION

     write A2:F11                                                                             Copy + image                SKILL.md
                                  Page → Reader               #1 → #2 → #3
     read back                                                                                Video + voice              runs in AdaL
                                 typed fields only              Tamper-evident
     10/10 match                                                                              Page + live test              Hub: tested

 Evidence contracts             Quarantine and             Receipts and takeover         GTM Studio                     Playbooks and Hub
 Each step names the proof
                                approvals                  Live timeline, cancel, take   Research to copy, image,       A verified run becomes a
 that counts. No proof, no      A tool-less model reads    over, memory you control.     teaser video, voice and a      replayable Playbook. The
 tick.                          pages. Sends, posts and    Every run ends in a           landing page that Darby        Hub lists only tested ones.
                                payments wait for you.     tamper-evident receipt.       tests itself. Publishing
                                                                                         waits for you.

 Shown in Demo 1                Shown in Demo 2            Shown in Demos 1 and 4        Shown in Demo 3                Shown in Demo 1


EVERY RUN ENDS IN ONE OF FOUR VERDICTS

  VERIFIED                               VERIFIED WITH GAPS                 FAILED                                NEEDS YOU
 Every contract met                    Done, gaps listed                  What broke, and a fix                  Approval or takeover




Prior art credited: Magentic-UI (arXiv:2507.22358)                                                                                              5/7
06 · IMPACT AND FEASIBILITY

A product people can adopt, and a platform that compounds
      Who benefits                                                                  Real-world impact
  Founders, analysts, ops teams who delegate web work.                             Less re-checking: proof comes with the result
  Students and researchers who must cite and check.                                Fewer silent errors: gaps are listed
  Teams that need an audit trail.                                                  Safer delegation: risky acts wait for you
                                                                                   Shareable work: a tamper-evident receipt


      Scalability                                                                   Feasibility: cost and deployment
  Runs on each user’s own device, so compute does not grow with users.         Four live demo cases, each proving one feature.
   Verified run → Playbook → Hub → More trust                                  Installable desktop app; no servers needed to start.
  Free core, then Teams plan and Hub revenue share. Start with student         Pay-as-you-go model API; Supabase free tier.
  founders, then startup ops teams.

BUILT ON PROVEN, DOCUMENTED PARTS

 Electron + React                   Playwright + CDP          Azure OpenAI                     Sheets + Excel                  AdaL
 App shell                          Real browser tabs         Planner, reader, verifier        Read-back APIs                  Builds, tests, red-teams




Sources: Electron, Playwright, Microsoft Foundry, Microsoft Graph and Google Sheets API docs                                                          6/7
07 · DEMO AND CONCLUSION

Live demo: one goal, from request to receipt
          Darby   Sheet    startup-6.com     Email draft                                         TEST CASES · SUCCESS AND FAILURE

 docs.google.com/spreadsheets/Competitors                                          REAL TAB        SUCCESS Case 1: Research to Sheet
                                                                                                    VERIFIED WITH GAPS 10/10 read back
 STARTUP          PRICE    PROOF                           DARBY · LIVE
 Acme AI          $29      ✓ match                           Researched 10 sites                   SAFETY Case 2: Poisoned page
 Beta Labs        $49      ✓ match                            Page 6: injection blocked             CONTAINED no email sent
 Cobalt           —        gap                               Wrote 10 rows, read back
 Delta            $99      ✓ match                                                                 CONTROL Case 3: Launch assets
                                                           Share Sheet? Needs you                   NEEDS YOU post awaits you
 Echo             —        gap
                                                            Approve    Deny     Take over
 + 5 more rows
                                                                                                   FAILURE Case 4: Broken task
 Step 4 of 4                                                     0 risky actions unapproved         FAILED reported, then fixed


                                                                    WHY DARBY SHOULD BE SELECTED
  CONCLUSION                                                            All 7 PS1 requirements, demonstrated live
  Others say “done.” Darby shows                                        Novel: proof, quarantine, tamper-evident receipts

  the receipt.                                                          Fails honestly: Case 4 is reported, then fixed
                                                                        Built with AdaL: recordings, commit tags, test logs




Concept preview of the Darby interface · sample data                                                                                     7/7
