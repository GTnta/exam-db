# Restore Point: after image crop metadata and search-text pipeline prep

- Created at: 2026-05-22T07:24:30+09:00
- Base checkpoint: `5814387ea88c2c4ca26b31a5243bfe3116af692c`

## What Changed

- Added `scripts/audit-image-metadata.mjs`.
- Added `scripts/heuristic-vertical-crop-boxes.mjs` and applied heuristic crop boxes to `data/image-crops.json`.
  - 499 crop rows are single-question content-box crops.
  - 745 crop rows are heuristic vertical splits for pages containing multiple questions.
- Added `scripts/extract-search-text-from-pdf.mjs` for search-only `masked_problem_text` extraction with `pdftotext`.
- Updated `.github/workflows/build-question-images.yml` so the GitHub Actions image build also extracts search text before rebuilding images.

## Checks

- `node scripts\check-db.mjs` passed with 757 records.
- `node scripts\audit-image-metadata.mjs` found:
  - 757 questions with crop metadata.
  - 1244 crop rows.
  - 0 full-page placeholder rows after metadata conversion.
  - 0 missing output image files.
  - 2 possible low-page findings, both 2006 PDF pages that are actual problem pages in the existing images.

## Local Limitations

- This machine currently lacks `pdftoppm`, `pdftotext`, `pdfinfo`, ImageMagick, and `cwebp`, so actual image regeneration and PDF text extraction could not run locally.
- The metadata and scripts are ready for the existing GitHub Actions workflow or a local machine with `poppler-utils imagemagick webp`.
- Local Git staging failed with `.git/index.lock` permission denied, so no commit was created at this checkpoint.
