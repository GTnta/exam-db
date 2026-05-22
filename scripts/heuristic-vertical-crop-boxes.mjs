import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const outPath = path.join(root, 'worklogs', 'heuristic-crop-boxes.json');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
const questionOrder = new Map(questions.map((question, index) => [question.id, index]));
const questionsById = new Map(questions.map((question) => [question.id, question]));

const groups = new Map();
for (const crop of crops) {
  const key = `${crop.source_pdf}|${crop.pdf_page}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(crop);
}

const contentBox = { x: 0.055, y: 0.035, width: 0.89, height: 0.91 };
const changes = [];

for (const [key, rows] of groups) {
  const blocks = [...groupBy(rows, blockKey).entries()]
    .map(([block, blockRows]) => ({
      block,
      rows: blockRows,
      firstQuestionId: blockRows.map((row) => row.question_id)
        .sort((a, b) => (questionOrder.get(a) ?? 0) - (questionOrder.get(b) ?? 0))[0],
    }))
    .sort((a, b) => (questionOrder.get(a.firstQuestionId) ?? 0) - (questionOrder.get(b.firstQuestionId) ?? 0));

  if (blocks.length === 1) {
    for (const row of rows) {
      setCrop(row, contentBox, 'heuristic-content-box', 'Single-question page: content margins only.');
    }
    continue;
  }

  const top = 0.035;
  const bottom = 0.96;
  const usableHeight = bottom - top;
  const band = usableHeight / blocks.length;
  const overlap = Math.min(0.075, band * 0.28);

  for (const [index, block] of blocks.entries()) {
    const y = Math.max(top, top + index * band - (index === 0 ? 0 : overlap / 2));
    const nextY = Math.min(bottom, top + (index + 1) * band + (index === blocks.length - 1 ? 0 : overlap / 2));
    const box = {
      x: 0.055,
      y: round(y),
      width: 0.89,
      height: round(Math.max(0.08, nextY - y)),
    };
    for (const row of block.rows) {
      setCrop(row, box, 'heuristic-vertical-split', `Auto split ${blocks.length} question blocks on the same PDF page.`);
    }
  }

  changes.push({
    page_group: key,
    block_count: blocks.length,
    question_ids: rows.map((row) => row.question_id),
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

function blockKey(row) {
  const question = questionsById.get(row.question_id);
  if (!question) return row.question_id;
  return [
    question.pdf_path ?? row.source_pdf,
    question.major_no ?? '',
    normalizeMinor(question.minor_no) || question.answer_no || row.question_id,
  ].join('|');
}

function normalizeMinor(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, '');
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
