# PS1 — Problem Statement (verbatim text of the organiser PDF, for AdaL context)

 Problem Statement-1: Build an AI-Native Browser with an
    Autonomous Multimodal Companion Using AdaL

1. Overview
The next generation of browsers should do more than display websites or answer questions.
They should understand user intent, operate real web applications, execute complex
workflows, and verify that the requested work has actually been completed.

In this challenge, participants must build an AI-native desktop browser with an
autonomous, user-controlled multimodal AI companion, using AdaL by Sylph as a
mandatory part of the development and execution workflow.

AdaL must be actively used to develop the solution, orchestrate relevant capabilities, and
accelerate implementation. Participants should leverage its coding-agent workflow,
browser-use capabilities, and relevant multimodal skills to build a working prototype that
combines browser automation, intelligent task execution, coding assistance, and creative
workflows.

The goal is to move beyond a conventional browser with a chatbot and create an
AI-powered workspace that can understand a user's goal, take meaningful actions, and
verify the results.


2. The Problem
Today's AI assistants can generate text, analyze images, write code, and provide
recommendations. However, users still have to switch between applications, perform
repetitive browser actions, transfer information manually, and verify whether their work was
completed correctly.

Meanwhile, coding agents and multimodal tools offer powerful capabilities for software
development, research, image generation, audio processing, video creation, and
go-to-market (GTM) workflows. These capabilities are often fragmented across different
tools and interfaces.

How might we build a unified AI-native browser that combines autonomous browser
control, multimodal intelligence, coding capabilities, and GTM automation into one
workspace—with AdaL serving as a mandatory development and
capability-orchestration tool?
3. Core Challenge
Build a working prototype of an AI-native desktop browser or browser-integrated workspace
with an autonomous multimodal companion.

Your solution must use AdaL by Sylph as a core part of the development process and
demonstrate a functional product that can perform real tasks rather than merely generate
instructions.

The solution should bring together the following capabilities:

   1.​ AI-native browsing: Understand the user's intent and operate actual browser tabs,
       websites, and authorized web applications.
   2.​ Autonomous task execution: Plan and perform multi-step tasks using browser
       controls, APIs, and other permitted tools.
   3.​ Multimodal intelligence: Incorporate relevant image, audio, and video
       understanding or generation capabilities.
   4.​ Coding and development: Use AdaL to assist with implementation, codebase
       analysis, debugging, testing, and iteration.
   5.​ GTM automation: Support market research, competitor analysis, content
       preparation, and product-launch workflows.
   6.​ Verification and transparency: Verify real outcomes, expose execution progress,
       and report failures honestly.
   7.​ User control and security: Include appropriate approval checkpoints, cancellation,
       and manual takeover.


4. Mandatory AdaL Requirement
AdaL by Sylph is mandatory for every participating team.

Teams must actively use AdaL in building their solution. It must be part of the actual
development workflow, not just referenced in documentation or included in the final
presentation.

Participants are expected to use AdaL for relevant activities such as:

   ●​   Understanding the project architecture and generating implementation plans.
   ●​   Writing, modifying, and debugging application code.
   ●​   Building and improving the browser interface and agent experience.
   ●​   Testing a locally running application through browser-use capabilities.
   ●​   Developing multi-step automation workflows.
   ●​   Integrating relevant multimodal capabilities where supported.
   ●​   Debugging failures, refining execution logic, and improving reliability.

Teams should use AdaL's available capabilities and skills according to the task. Image,
audio, video, browser, coding, and research capabilities should be incorporated where
relevant to the proposed solution.
The final submission must include a brief explanation of how AdaL was used and a
demonstration of its role in the development workflow. Teams should provide genuine
evidence, such as a short recording of the workflow or a live demonstration.

Important: AdaL must be used to build the product; the finished product does not
necessarily need to depend on AdaL at runtime. Teams may choose the runtime architecture
and AI provider appropriate to their implementation, provided the mandatory AdaL usage
requirement is satisfied.


5. Two Core Capability Pillars
Pillar 1: AI-Native Browser and Autonomous Execution

Build a browser or browser-integrated workspace where an AI companion can interact with
actual web applications and complete user-authorized tasks.

Potential capabilities include:

   ●​   Context-aware assistance using the active or user-selected browser tab.
   ●​   Multi-step browser automation and web research.
   ●​   Real editing of documents and spreadsheets.
   ●​   Structured information extraction and report generation.
   ●​   Connected-app workflows through authorized APIs or browser automation.
   ●​   Task history, progress tracking, and user-controlled memory.
   ●​   Independent verification of actions and transparent failure reporting.

Example challenge: A user asks the agent to research ten AI startups, compare their
products and pricing, and create a spreadsheet.

The agent should research relevant sources, collect evidence, populate the actual
spreadsheet, read back the written data, flag unknown information, and provide the resulting
artifact.

Teams should use AdaL to accelerate the implementation and testing of this workflow,
including browser interactions and debugging where appropriate.

Pillar 2: Autonomous Multimodal Companion for Coding and GTM

Build a companion that can select and combine relevant capabilities to complete a complex
task. Use AdaL as a mandatory coding agent during development and leverage its available
capabilities where they support the workflow.

Potential capabilities include:

   ●​   Codebase understanding, debugging, test execution, and code changes.
   ●​   Browser-based testing of locally running applications.
   ●​   Image understanding and generation.
   ●​   Audio transcription, voiceover generation, or audio analysis.
   ●​   Video understanding, generation, editing, or compositing where supported.
   ●​   Market and competitor research.
   ●​   GTM content creation, product messaging, and campaign preparation.
   ●​   Chaining multiple tools into a single end-to-end workflow.

Example challenge: A user asks the companion to analyze a product's target audience,
research competitors, create a marketing concept, generate supporting creative assets, and
prepare a launch campaign.

The agent should coordinate relevant capabilities and deliver reviewable outputs through a
coherent workspace. AdaL should be used during development to implement, test, and
refine the experience.


6. Mandatory Functional Requirements
Every submission must demonstrate:

1. Natural-language task execution

The user can provide a multi-step instruction, and the system can convert it into an
actionable plan.

2. Real tool execution

At least one workflow must operate on a real browser page, local application, document, or
another authorized system. Simulated actions do not count as successful execution.

3. Outcome verification

The system must check whether the intended change occurred before marking a task
complete.

4. Transparent execution

Users can inspect progress, actions performed, results, and errors.

5. User approval and control

Users can cancel execution, intervene manually, and approve consequential actions such as
sending messages, publishing content, or deleting data.

6. Capability orchestration

At least one end-to-end workflow must combine multiple tools or capabilities to accomplish a
useful task.

7. Mandatory AdaL usage

AdaL must be actively used during implementation, development, debugging, or testing.
Teams must explain and demonstrate how they used it.
7. Suggested Technical Architecture
Teams may select their own technology stack. A possible architecture includes:

   ●​ Desktop/browser: Electron, Chromium, or another suitable browser-control
      framework.
   ●​ Frontend: React and TypeScript.
   ●​ Agent runtime: Task planner, tool router, execution controller, policy engine, and
      verifier.
   ●​ AI layer: A suitable model provider for reasoning, structured tool calls, and
      multimodal capabilities.
   ●​ Browser automation: Playwright, Chrome DevTools Protocol (CDP), or equivalent
      authorized controls.
   ●​ Backend: Node.js, TypeScript, and an appropriate API service.
   ●​ Database: PostgreSQL, Supabase, or equivalent persistence.
   ●​ Integrations: Google Workspace, GitHub, Slack, Notion, or other supported
      services.
   ●​ Development agent: AdaL by Sylph, mandatory for the development workflow.
   ●​ Multimodal services: Relevant image, audio, and video tools or APIs.

This architecture is illustrative rather than prescriptive. Teams should prioritize a working,
reliable prototype instead of unnecessary infrastructure complexity.


8. Evaluation Criteria
                    Criterion                       Weight

 Functional execution and verified outcomes         25%

 Agent intelligence and multi-step orchestration    20%

 Multimodal and coding capabilities                 15%

 User experience and workflow clarity               15%

 Security, permissions, and user control            10%

 Practical value, originality, and GTM potential    10%

 Demonstrated AdaL usage                            5%

 Total                                              100%

AdaL usage is mandatory regardless of the points assigned to it. A strong presentation or a
claim of using AdaL cannot substitute for genuine usage and a working prototype.
9. Deliverables
Each team must submit:

   1.​ A working prototype demonstrating the core workflow.
   2.​ A live demonstration or short demo video.
   3.​ Source code with setup and execution instructions.
   4.​ An architecture overview explaining the agent, tools, and verification process.
   5.​ A test case demonstrating successful execution and appropriate failure handling.
   6.​ A brief explanation of the target users, practical value, and future potential.
   7.​ AdaL usage evidence: A short demonstration or recording showing how AdaL
       contributed to coding, debugging, browser testing, or other relevant development
       activities.


10. Security and Responsible Execution
Solutions must respect website permissions, authentication boundaries, and user privacy.
External webpages and documents must be treated as untrusted input.

Sensitive actions require appropriate user approval. Credentials must be handled securely,
and the agent must not claim that an action succeeded without sufficient evidence.

If execution or verification fails, the system must communicate the failure honestly and offer
a safe recovery path.


11. Expected Outcome
The ideal submission is not simply a browser with a chatbot, a coding assistant with a
browser tool, or a collection of disconnected AI APIs.

It is a unified AI-native workspace that can understand a goal, select the right capabilities,
execute real work, verify the outcome, and present the result transparently.

AdaL must play an active role in building this experience, helping teams develop, debug,
test, and refine their solutions.

The central question: Can you use AdaL to build an AI-native browser that moves
beyond understanding what a user wants and reliably completes the work in the real
world?

Build a browser where autonomous execution meets multimodal intelligence—and where
AdaL is an essential part of bringing that experience to life.
What can AdaL do for you:

Every coding agent can build, but only AdaL does GTM directly from your codebase.
AdaL stands out with Browser Use combined with 10 major LLM providers and goes
to audio, image and video generation, and editing.

Our gift.

Redeem the 1-month Pro subscription here, then install AdaL.

Join our Discord community to be inspired by how other people are using AdaL.
