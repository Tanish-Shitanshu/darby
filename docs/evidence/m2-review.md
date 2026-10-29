# M2 review — independent headless AdaL red-team of the policy engine, then fixes

**How:** a one-shot scheduled task launched a *headless AdaL* (unattended, YOLO mode, own chat) with a red-team brief: try to bypass
`evaluatePolicy` (TAINT-002 / FORB-003 / EXT-001) and report. Brief and raw run log: `docs/evidence/redteam-adal-headless.log`.
AdaL wrote its own harness (`docs/evidence/adal-redteam/attempts.ts`, 151 attempts + 5 controls in 14 categories), its tables
(`results.md`, `results.json`, `run-output.txt`) and `docs/evidence/adal-redteam/report.md`. It also ran `npm run redteam` (exit 0).

## What it found (before the fix)
| class | result before |
|---|---|
| BLOCKED / GATED properly | 48 + 11 |
| **BYPASS** (forbidden or tainted value got `allow`) | **48** |
| **SOFT-BYPASS** (tainted value caught only by the approval prompt, not by TAINT-002) | **40** |
| `evaluatePolicy` crashed (RangeError on circular / 10k-deep args) | 2 |

Root causes (its findings F-1…F-5): taint was an **exact-token** match (same attacker domain, plus-tags, subdomains, Cyrillic/combining/soft-hyphen
variants, base64/hex, `[at]`, HTML entities and double percent-encoding all slipped through); `SENSITIVE_KEYS`, `FORBIDDEN_KEYS` and `PATH_KEYS` were
**exact key-name deny-lists** (rename a key and the value is unchecked); path checks were lexical and optional; a tainted URL inside the query/fragment of an
allowlisted URL was allowed.

## What I changed (policy/engine.ts, tools/registry.ts)
1. **Allow-list, not deny-list:** every tool has a strict argument schema; an argument name that is not on the list is blocked (`FORB-003-invalid-arguments`). There is no "neutral key" to hide a value in.
2. **Taint at domain level + canonicalisation:** tainted domains cover subdomains and any local part; values are decoded (entities, repeated percent-encoding), NFKC/NFD-folded, stripped of invisible characters and combining marks, homoglyph-mapped, de-obfuscated (`[at]`, `[dot]`), and base64/hex segments are decoded before comparison. A tainted URL inside a longer value is found.
3. **Recipients are a positive allow-list:** an email recipient must be the settings' team address or an address the user wrote in the goal (`TAINT-002-recipient-not-from-user`), so encodings the canonicaliser has never seen still cannot become a recipient.
4. **Fail closed:** circular, too deep, too many nodes or too long -> blocked; any exception inside the engine -> blocked.
5. Credential/shell detection by canonical key *and* by value (`curl … | sh`, `sk-…`, private keys); document names are validated (`^[\w][\w \-]{0,39}$`); `file:`/`data:`/`javascript:` URLs and credentials in URLs are never allowed.

## After the fix
Same 151 attempts re-run against the hardened engine (`after-fix-output.txt`): **BLOCKED 146, GATED 3 (IP-literal hosts needing approval as new origins), BYPASS 0, SOFT-BYPASS 0, THROWS 0.**
The 3 "control failures" are benign controls the new rules block on purpose (e.g. a recipient the user never named). Unit tests added from every class it found (`policy/engine.test.ts`, 21 tests).

## Also fixed in M2 by the UI walkthrough (Browser Use)
- Live WebSocket events were validated with zod, which strips unknown keys, so the receipt's signed `labels` (REPLAY / SIMULATED) never reached the UI: the UI now keeps the validated original.
- Cancelling while an approval card was open left a stale card, a stale "needs your approval" step badge and a pending approval row. Now the approval is closed as `cancelled`, cut-off steps emit `step.finished: cancelled`, the receipt is the final word on step status. Covered by the new `cancel-approval` scenario.
