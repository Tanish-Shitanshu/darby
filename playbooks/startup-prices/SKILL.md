---
name: startup-prices
description: Reads AI-startup pricing pages, extracts name, lowest paid monthly price and an exact evidence quote, writes a proven sheet and shares it with the team (after your approval).
---

# Startup Prices

Reads AI-startup pricing pages, extracts name, lowest paid monthly price and an exact evidence quote, writes a proven sheet and shares it with the team (after your approval).

Saved from run `run_20261029_133454_9km4` (verdict VERIFIED_WITH_GAPS, gaps: cobalt, echo, helio). Original goal: “Research the 10 AI startups on the fixture site, record name, lowest paid monthly price in USD and an evidence quote in a new sheet called Competitors, then share it with the team email.”

**CI: passed** on 2026-10-29 (5/5 checks, replay (recorded answers)). Bound to playbook.json sha256 `f12b45585a13…`.

## Steps (the proof for each is rebuilt by code on every run)
1. `browser.read_page` — Read pages for the 10 AI startups · proof: file_exists
2. `reader.extract` — Extract pricing details and quotes from startup pages · proof: quote_in_page
3. `sheet.write` — Create sheet Competitors with startup details · proof: sheet_readback
4. `share.grant` — Share Competitors sheet with the team email · proof: permission_present

## Parameters
- `urls` (urls) — Pages to read. Default: 10 pages
- `sheetName` (text) — Name of the new sheet. Default: “Competitors”

## Permission manifest (derived from the steps; a hand-edited manifest is rejected)
**Reads**
- the fixture web (allow-listed origin)

**Writes**
- a new Darby-owned spreadsheet (its name is a parameter)

**External effects (each one waits for your approval)**
- `share.grant` — share the document with the team email as reader

**Recipients**
- the team email from settings

## Run it
Hub tab in the Darby companion, or `POST /api/playbooks/startup-prices/run` with `{"params": {…}}`.
The run goes through the same policy engine, approvals, quarantined reader and independent verifier as any other run, and gets its own signed receipt labelled `PLAYBOOK:startup-prices`.
