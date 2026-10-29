# Recorded LLM responses (REPLAY)

83 recordings of real model calls (planner, reader, vision) made while running the demo cases against the fixture web.
They contain no keys and no personal data: prompts are fixture page text and fixed instructions.

The replay provider (`LLM_PROVIDER=replay`) answers from these files by request hash, so the acceptance tests and the offline demo run
without any API key or network. Runs served this way are labelled **REPLAY** in the UI and in the signed receipt.

Add more with `LLM_PROVIDER=gemini npm run test:acceptance -- --live` followed by `npm run replay:curate`.
