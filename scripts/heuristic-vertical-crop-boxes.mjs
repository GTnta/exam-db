import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const outPath = path.join(root, 'worklogs', 'heuristic-crop-boxes.json');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
const questionOrder = new Map(questions.map((question, index) => [question.id, index]));

const groups = new Map();
for (const crop of crops) {
  const key = `${crop.source_pdf}|${crop.pdf_page}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(crop);
}

const contentBox = { x: 0.055, y: 0.035, width: 0.89, height: 0.91 };
const changes = [];

for (const [key, rows] of groups) {
  const uniqueQuestionIds = [...new Set(rows.map((row) => row.question_id))]
    .sort((a, b) => (questionOrder.get(a) ?? 0) - (questionOrder.get(b) ?? 0));

  if (uniqueQuestionIds.length === 1) {
    for (const row of rows) {
      setCrop(row, contentBox, 'heuristic-content-box', 'Single-question page: content margins only.');
    }
    continue;
  }

  const top = 0.035;
  const bottom = 0.96;
  const usableHeight = bottom - top;
  const band = usableHeight / uniqueQuestionIds.length;
  const overlap = Math.min(0.075, band * 0.28);

  for (const [index, questionId] of uniqueQuestionIds.entries()) {
    const y = Math.max(top, top + index * band - (index === 0 ? 0 : overlap / 2));
    const nextY = Math.min(bottom, top + (index + 1) * band + (index === uniqueQuestionIds.length - 1 ? 0 : overlap / 2));
    const box = {
      x: 0.055,
      y: round(y),
      width: 0.89,
      height: round(Math.max(0.08, nextY - y)),
    };
    for (const row of rows.filter((item) => item.question_id === questionId)) {
      setCrop(row, box, 'heuristic-vertical-split', `Auto split ${uniqueQuestionIds.length} questions on the same PDF page.`);
    }
  }

  changes.push({
    page_group: key,
    question_count: uniqueQuestionIds.length,
    question_ids: uniqueQuestionIds,
  });
}

fs.writeFileSync(cropsPath, `${JSON.stringify(crops, null, 2)}\n`);
fs.writeFileSync(outPath, `${JSON.stringify({ created_at: new Date().toISOString(), changed_page_groups: changes }, null, 2)}\n`);

const byStatus = crops.reduce((map, crop) => {
  map[crop.status] = (map[crop.status] ?? 0) + 1;
  return map;
}, {});

console.log(`crop_rows=${crops.length}`);
console.log(`page_groups=${groups.size}`);
console.log(`multi_question_page_groups=${changes.length}`);
console.log(`status=${JSON.stringify(byStatus)}`);
console.log(`report=${path.relative(root, outPath)}`);

function setCrop(row, box, status, note) {
  row.box = box;
  row.status = status;
  row.note = note;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
