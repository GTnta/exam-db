# Restore Point: after summary and tag precision pass

- Created at: 2026-05-22T07:11:45+09:00
- Base checkpoint: `5814387ea88c2c4ca26b31a5243bfe3116af692c`
- Current phase: summary/tag precision pass completed; image cropping and OCR/search text still pending.

## What Changed

- Added scripts to audit and repair summary/tag contamination:
  - `scripts/audit-summary-contamination.mjs`
  - `scripts/cleanup-generic-summaries.mjs`
  - `scripts/tighten-keywords-by-summary.mjs`
  - `scripts/stabilize-summary-precision.mjs`
- Removed broad大問 topic lists from searchable `summary` and `keywords`; moved broad context to `common_summary` where useful.
- Excluded `notes` from app search and added future search fields `problem_text` / `masked_problem_text`.
- Downloaded 東進 analysis pages listed in `data/sources.json` to `worklogs/analysis-pages`.
- Extracted 298 question-level analysis snippets to `worklogs/toshin-analysis-extract.json`.
- Reflected 233 relevant 東進 analysis summaries into `data/questions.json`; 73 uncertain matches were skipped and logged.

## Checks

- `node scripts\check-db.mjs` passed with 757 records.
- Summary contamination audit after this pass: 4 residual `mixed_summary` findings, all judged likely false positives or single-question descriptions.

## Notes

- This checkpoint intentionally prioritizes search precision over recall for older broad records until OCR/problem text is added.
- If rollback is needed, restore from Git commit `5814387ea88c2c4ca26b31a5243bfe3116af692c`; do not run reset automatically without user confirmation.
