# Things only a human can do (AdaL will also ask for each at the right moment — see AGENTS.md "Human checkpoints")

Order by urgency. Tick them off.

- [ ] **H1 (5 min) LLM key.** Azure OpenAI via Microsoft Foundry: create a deployment (a GPT-4.1/4o class chat model with vision). Put `LLM_PROVIDER=azure`, endpoint, key, deployment in `.env`. Fallback: any OpenAI-compatible key (`LLM_PROVIDER=openai`). Without any key, only the `replay` provider works (tests only).
- [ ] **H2 (10 min) Git + GitHub.** `git init` and the `darby` repo are done by AdaL in P0 (run `gh auth login` first; AdaL asks before inviting anyone). Otherwise create an empty GitHub repo `darby` (private ok, make public before judging if asked) and a throwaway test repo `darby-launch-test` with a README. Create a fine-grained token (contents + pull requests on `darby-launch-test` only) -> `.env` `GITHUB_TOKEN`, `GITHUB_TEST_REPO`. Set `git config user.name/email` to your own identity.
- [ ] **H3 (20 min) Google OAuth (only for M4).** Google Cloud console -> new project -> enable Sheets API + Drive API -> OAuth consent (External, add yourself as test user) -> OAuth client "Desktop app" -> download JSON to `secrets/google-oauth.json`. Make a second Google account/alias for `SHARE_TEST_EMAIL`. If this blocks for >30 min, skip: local-xlsx adapter is the fallback and the demo still works.
- [ ] **H4 (2 min) Machine check.** Node 20+, `ffmpeg` (`brew install ffmpeg`), Chrome/Chromium installed. AdaL installed and logged in.
- [ ] **H5 AdaL account items.** Enable Browser Use in AdaL (it opens a dedicated Chrome window; use test accounts only). Check Video Producer works from the desktop app (needed for the intro clip and evidence).
- [ ] **H6 Organisers.** Ask: demo video required? length? presentation time? live demo allowed, internet at venue? Power/ports? Whether Wi-Fi can be trusted -> if not, we run the `replay` provider + local fixtures.
- [ ] **H7 Evidence capture.** Screen-record AdaL sessions (QuickTime). Keep every AdaL chat export. These are the AdaL usage evidence.
- [ ] **H8 Team (optional, only after Tiger has M0-M2 running).** When the team joins (hour 3-4): one person each takes (a) QA/red-team with Browser Use, (b) demo script + video, (c) README/architecture diagram + submission form, (d) Google OAuth + GTM assets. Don't let two people edit the same milestone.
