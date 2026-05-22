import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const reportPath = path.join(root, 'worklogs', 'tiny-crop-fallbacks.json');
const thresholdBytes = Number(process.argv.find((arg) => arg.startsWith('--threshold='))?.split('=')[1] ?? 5000);
const contentBox = { x: 0.055, y: 0.035, width: 0.89, height: 0.91 };

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
const questionsById = new Map(questions.map((question) => [question.id, question]));

const changed = [];
for (const row of crops) {
  const output = normalizePath(row.output);
  const size = fileSize(output);
  if (size == null || size >= thresholdBytes) continue;

  const question = questionsById.get(row.question_id);
  if (isPendingText(question)) continue;

  row.box = { ...contentBox };
  row.status = 'heuristic-full-page-fallback';
  row.note = `Previous crop output was under ${thresholdBytes} bytes; use the full printable page area instead.`;
  changed.push({
    question_id: row.question_id,
    output,
    previous_size: size,
  });
}

fs.writeFileSync(cropsPath, `${JSON.stringify(crops, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({
  created_at: new Date().toISOString(),
  threshold_bytes: thresholdBytes,
  changed_count: changed.length,
  changed,
}, null, 2)}\n`);

console.log(`threshold_bytes=${thresholdBytes}`);
console.log(`tiny_crop_fallbacks=${changed.length}`);
console.log(`report=${path.relative(root, reportPath)}`);

function fileSize(relativePath) {
  if (!relativePath) return null;
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return null;
  return fs.statSync(absolute).size;
}

function normalizePath(value) {
  return String(value ?? '').split(/[\\/]+/).join('/');
}

function isPendingText(question) {
  if (!question) return true;
  if (!question.masked_problem_text && !question.problem_text) return true;
  return String(question.problem_text_status ?? '').startsWith('pending');
}
