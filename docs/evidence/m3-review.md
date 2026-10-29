# M3 review (AdaL search sub-agent on the companion UI + Browser Use walkthrough)

## Findings from the review pass and what was done
| # | severity | finding | resolution |
|---|---|---|---|
| 1 | medium | `screenshotPath` from an event was rendered straight into `<img src>`; the UI did not enforce "same-origin path from our own API" | **Fixed** (`state.ts safeShot`): only `/api/runs/run_…/shots/<name>.png|jpg` is ever stored/rendered; anything else is dropped. Unit-tested with javascript:, external, protocol-relative, traversal, data: and svg inputs |
| 2 | medium | `open(run)` replaced state with the REST history and could drop live WebSocket events that arrived during the fetch | **Fixed** (`useDarby.ts`): live events are buffered per run; after the snapshot is folded, buffered events that are not in it (compared by content) are re-applied |
| 3 | low | drawer / lightbox / approval card had no focus handling | **Fixed**: dialogs take focus on open, the lightbox traps Tab, focus returns to the opener on close, the approval card is `role="alert"` (non-modal, so it never steals focus into Approve/Deny). Verified live: focus moves into the drawer, returns to the step ticket on Esc |

Checked and found sound by the reviewer: no `dangerouslySetInnerHTML`; all dynamic text rendered as React text; the green "chain valid" badge only appears after the server's `/verify` answers; tamper results come from the server; `/memory` validation; `/runs/:id/remember` takes no client data.

## Found by my own tests/walkthrough
- Reducer bug (caught by the new unit test): the step's verification results were written to a discarded copy, so the evidence drawer would have been empty. Fixed.
- Receipt title was squeezed by the stamp; the timeline scrolled away on long receipts -> the timeline column is now sticky.

## Browser Use walkthrough (Case 1 through the UI)
`docs/evidence/m3-00-start.png` -> `m3-01-approval.png` (approval card at the top, sticky Cancel/Take over bar) -> `m3-02-evidence-drawer.png` (proof, policy decision, 10 verification results with the 3 gaps) -> `m3-03-receipt-tamper.png` (SIMULATED/REPLAY labels, chain valid, tamper test: original VALID, edited copy INVALID) -> `m3-04-memory.png` (note added, then deleted).
Browser Use has no recorder, so `docs/evidence/m3-case1-walkthrough.mp4` is a captioned 16 s slideshow of those states (ffmpeg + ImageMagick).
