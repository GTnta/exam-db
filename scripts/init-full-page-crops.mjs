import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const questionsPath = join(root, "data", "questions.json");
const cropsPath = join(root, "data", "image-crops.json");

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
const crops = existsSync(cropsPath) ? JSON.parse(readFileSync(cropsPath, "utf8")) : [];
const existingKeys = new Set(crops.map((crop) => cropKey(crop)));
let added = 0;

for (const question of questions) {
  if (!question.pdf_path || !question.page || !question.pdf_path.startsWith("data/pdf/")) continue;
  if (!existsSync(join(root, question.pdf_path))) continue;

  const pages = expandPages(question.page);
  if (pages.length === 0) continue;

  pages.forEach((page, index) => {
    const output = `data/images/questions/${question.id}${pages.length > 1 ? `_p${index + 1}` : ""}.webp`;
    const crop = {
      question_id: question.id,
      source_pdf: question.pdf_path,
      page,
      box: null,
      output,
      label: pages.length > 1 ? `${index + 1}/${pages.length}` : "",
      status: "full-page-placeholder",
      note: "boxを{x,y,width,height}の0-1正規化座標で入れると設問単位の切り出しになる",
    };
    const key = cropKey(crop);
    if (existingKeys.has(key)) return;
    crops.push(crop);
    existingKeys.add(key);
    added += 1;
  });
}

crops.sort((a, b) => (
  String(a.source_pdf).localeCompare(String(b.source_pdf), "ja") ||
  Number(a.page) - Number(b.page) ||
  String(a.question_id).localeCompare(String(b.question_id), "ja")
));

writeFileSync(cropsPath, `${JSON.stringify(crops, null, 2)}\n`);
console.log(`image crop rows: ${crops.length}`);
console.log(`added rows: ${added}`);

function cropKey(crop) {
  return `${crop.question_id}|${crop.source_pdf}|${crop.page}|${crop.output}`;
}

function expandPages(value) {
  const pages = new Set();
  for (const part of String(value).split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let page = start; page <= end; page += 1) pages.add(page);
      continue;
    }
    const single = trimmed.match(/^\d+$/);
    if (single) pages.add(Number(trimmed));
  }
  return [...pages].sort((a, b) => a - b);
}
