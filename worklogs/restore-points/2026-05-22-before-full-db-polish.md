# Restore Point: Before Full DB Polish

- Created at: 2026-05-22T06:51:23.4543918+09:00
- Branch: main
- HEAD: 5814387ea88c2c4ca26b31a5243bfe3116af692c
- HEAD summary: 5814387 Improve physics question summaries
- Worktree status before this file: clean

## User-Confirmed Scope

The work should proceed across the existing database records only. Do not treat missing, unregistered years or sessions as part of this pass.

1. Improve summaries by comparing them with web-based exam analyses where available and the official problem PDFs where needed. Summaries and keywords must not include content from other subquestions.
2. Crop images question by question, including figures needed to understand each question. Fix currently misaligned problem/image references during this pass.
3. Transcribe problem text for search-only masked data. Full fidelity for formulas, choices, and subscripts is not required; searchable physical concepts, conditions, devices, and phenomena are the priority.

## Data Policy

- Problem images and search-only problem text may be stored in the repository and published to GitHub.
- Use separate fields for shared major-question context and subquestion-specific text when needed.
- Search should use subquestion-specific summary, unit, keywords, and masked problem text. Shared context may be searchable when it is necessary to understand the subquestion, but must not pollute summaries or keywords.

## Long-Run Operating Rules

- Work locally as much as possible.
- At major milestones, create restore-point files like this one.
- Try local commits at major milestones only if they do not block on approval.
- If a Git operation requires approval or fails due to permissions, skip the commit and continue working.
- Push can wait until the user returns or explicitly asks.
- If rate limits occur, wait and resume rather than stopping the overall task.

## Restore Notes

To return to the clean pre-polish code/data state, use the HEAD commit above:

```powershell
git switch main
git reset --hard 5814387ea88c2c4ca26b31a5243bfe3116af692c
```

Do not run the reset command automatically. It is recorded here only as a recovery reference.
