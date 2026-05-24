import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const imagesDir = path.join(root, 'data', 'images', 'questions');
const reportPath = path.join(root, 'worklogs', 'unreferenced-question-images.json');

const questions = readJson(questionsPath);
const crops = readJson(cropsPath);
const referenced = new Set();

for (const question of questions) {
  if (Array.isArray(question.image_paths)) {
    for (const imagePath of question.image_paths) referenced.add(normalizePath(imagePath));
  }
  if (question.image_path) referenced.add(normalizePath(question.image_path));
}

for (const crop of crops) {
  if (crop.output) referenced.add(normalizePath(crop.output));
}

const removed = [];
for (const fileName of fs.readdirSync(imagesDir)) {
  if (!/\.(?:jpe?g|webp|png)$/i.test(fileName)) continue;
  const rel = normalizePath(path.join('data', 'images', 'questions', fileName));
  if (referenced.has(rel)) continue;
  fs.rmSync(path.join(imagesDir, fileName), { force: true });
  removed.push(rel);
}

fs.writeFileSync(reportPath, `${JSON.stringify({
  created_at: new Date().toISOString(),
  removed_count: removed.length,
  removed,
}, null, 2)}\n`);

console.log(`removed_unreferenced_images=${removed.length}`);
console.log(`report=${path.relative(root, reportPath)}`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function normalizePath(value) {
  return String(value ?? '').split(/[\\/]+/).join('/');
}
