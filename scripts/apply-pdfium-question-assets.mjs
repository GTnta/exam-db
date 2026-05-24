import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestArg = process.argv.find((arg) => arg.endsWith(".json"));
if (!manifestArg) {
  console.error("Usage: node scripts/apply-pdfium-question-assets.mjs worklogs/pdfium-question-assets-YYYYMMDD-HHMMSS.json");
  process.exit(1);
}

const manifestPath = path.resolve(root, manifestArg);
const questionsPath = path.join(root, "data", "questions.json");
const cropsPath = path.join(root, "data", "image-crops.json");

const questions = readJson(questionsPath);
const crops = readJson(cropsPath);
const manifest = readJson(manifestPath);

const byId = new Map(manifest.records.map((record) => [record.id, record]));
const targetIds = new Set(byId.keys());
const targetPdfPaths = new Set(manifest.records.map((record) => record.pdf_path));
let updatedQuestions = 0;
let skippedMissingFiles = 0;

for (const question of questions) {
  const record = byId.get(question.id);
  if (!record) continue;
  const missing = record.image_paths.filter((imagePath) => !fs.existsSync(path.join(root, imagePath)));
  if (missing.length) {
    console.warn(`skip ${question.id}: missing images ${missing.join(", ")}`);
    skippedMissingFiles += 1;
    continue;
  }

  question.image_paths = record.image_paths;
  question.image_path = record.image_paths[0] ?? "";
  question.masked_problem_text = compactText(record.masked_problem_text);
  question.problem_text_status = record.problem_text_status ?? "pdfium-question-marker-slice";
  question.problem_text_source = record.problem_text_source ?? "pdfium-question-marker-crop";
  delete question.image_status;
  const page = pageLabel(record.crop_rows);
  if (page) question.page = page;
  updatedQuestions += 1;
}

const nextCrops = crops.filter((crop) => {
  if (!targetIds.has(crop.question_id)) return true;
  return !targetPdfPaths.has(crop.source_pdf);
});
let addedCropRows = 0;
for (const record of manifest.records) {
  for (const row of record.crop_rows) {
    nextCrops.push(row);
    addedCropRows += 1;
  }
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
fs.writeFileSync(cropsPath, `${JSON.stringify(nextCrops, null, 2)}\n`, "utf8");

console.log(`updated_questions=${updatedQuestions}`);
console.log(`added_crop_rows=${addedCropRows}`);
console.log(`skipped_missing_files=${skippedMissingFiles}`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function compactText(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageLabel(rows) {
  const pages = [...new Set(rows.map((row) => Number(row.page)).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!pages.length) return "";
  if (pages.length === 1) return String(pages[0]);
  return `${pages[0]}-${pages[pages.length - 1]}`;
}
