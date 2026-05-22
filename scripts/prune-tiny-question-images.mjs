import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const reportPath = path.join(root, 'worklogs', 'tiny-question-images.json');
const thresholdBytes = Number(process.argv.find((arg) => arg.startsWith('--threshold='))?.split('=')[1] ?? 5000);

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
const questionsById = new Map(questions.map((question) => [question.id, question]));

const rowsByQuestion = groupBy(crops, (row) => row.question_id);
const removedOutputs = new Set();
const inspected = [];

for (const [questionId, rows] of rowsByQuestion.entries()) {
  const question = questionsById.get(questionId);
  const existingRows = rows
    .map((row) => ({ row, output: normalizePath(row.output), size: fileSize(row.output) }))
    .filter((item) => item.output && item.size != null);

  const smallRows = existingRows.filter((item) => item.size < thresholdBytes);
  const usableRows = existingRows.filter((item) => item.size >= thresholdBytes);
  if (!smallRows.length) continue;
  if (!usableRows.length && !isPendingText(question)) continue;

  for (const item of smallRows) {
    removedOutputs.add(item.output);
    inspected.push({
      question_id: questionId,
      output: item.output,
      size: item.size,
    });
  }
}

for (const output of removedOutputs) {
  const absolute = path.join(root, output);
  if (fs.existsSync(absolute)) fs.rmSync(absolute, { force: true });
}

const keptCrops = crops.filter((row) => !removedOutputs.has(normalizePath(row.output)));
for (const question of questions) {
  const current = Array.isArray(question.image_paths)
    ? question.image_paths.map(normalizePath)
    : question.image_path
      ? [normalizePath(question.image_path)]
      : [];
  const next = current.filter((output) => !removedOutputs.has(output));
  if (next.length) {
    question.image_paths = next;
    question.image_path = next[0];
    delete question.image_status;
  } else if (current.some((output) => removedOutputs.has(output))) {
    delete question.image_paths;
    delete question.image_path;
    question.image_status = 'unavailable-small-crop';
  }
}

fs.writeFileSync(cropsPath, `${JSON.stringify(keptCrops, null, 2)}\n`);
fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({
  created_at: new Date().toISOString(),
  threshold_bytes: thresholdBytes,
  removed_count: removedOutputs.size,
  removed: inspected,
}, null, 2)}\n`);

console.log(`threshold_bytes=${thresholdBytes}`);
console.log(`removed_tiny_images=${removedOutputs.size}`);
console.log(`crop_rows_before=${crops.length}`);
console.log(`crop_rows_after=${keptCrops.length}`);
console.log(`report=${path.relative(root, reportPath)}`);

function fileSize(relativePath) {
  if (!relativePath) return null;
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return null;
  return fs.statSync(absolute).size;
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

function normalizePath(value) {
  return String(value ?? '').split(/[\\/]+/).join('/');
}

function isPendingText(question) {
  if (!question) return true;
  if (!question.masked_problem_text && !question.problem_text) return true;
  return String(question.problem_text_status ?? '').startsWith('pending');
}
