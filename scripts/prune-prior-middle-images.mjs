import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const reportPath = path.join(root, 'worklogs', `prior-middle-image-prune-${timestamp()}.json`);

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
const order = { A: 1, B: 2, C: 3 };

const manualRemovals = new Set([
  'data/images/questions/2011_center_main_physics1_a22_p4.jpg',
  'data/images/questions/2009_center_main_physics1_a22_p4.jpg',
  'data/images/questions/2007_center_main_physics1_a23_p4.jpg',
  'data/images/questions/2006_center_main_physics1_a22_p4.jpg',
]);

const imageRowsByExam = new Map();
for (const question of questions) {
  const key = examKey(question);
  const imagePaths = getImagePaths(question);
  for (const imagePath of imagePaths) {
    const absolutePath = path.join(root, imagePath);
    if (!fs.existsSync(absolutePath)) continue;
    const row = {
      id: question.id,
      middle_no: question.middle_no || '',
      path: normalizePath(imagePath),
      hash: fileHash(absolutePath),
    };
    if (!imageRowsByExam.has(key)) imageRowsByExam.set(key, []);
    imageRowsByExam.get(key).push(row);
  }
}

const removedByQuestion = new Map();

for (const question of questions) {
  if (!['B', 'C'].includes(question.middle_no)) continue;

  const key = examKey(question);
  const imagePaths = getImagePaths(question);
  const priorRows = (imageRowsByExam.get(key) ?? []).filter(
    (row) => order[row.middle_no] && order[row.middle_no] < order[question.middle_no],
  );

  for (const imagePath of imagePaths) {
    const normalized = normalizePath(imagePath);
    const absolutePath = path.join(root, normalized);
    if (!fs.existsSync(absolutePath)) continue;

    const hash = fileHash(absolutePath);
    const duplicatePrior = priorRows.find((row) => row.hash === hash);
    const manuallyPrior = manualRemovals.has(normalized);
    if (!duplicatePrior && !manuallyPrior) continue;

    if (!removedByQuestion.has(question.id)) removedByQuestion.set(question.id, []);
    removedByQuestion.get(question.id).push({
      path: normalized,
      reason: duplicatePrior
        ? `duplicate of prior middle ${duplicatePrior.middle_no} (${duplicatePrior.id})`
        : 'manual visual confirmation: prior middle page',
    });
  }
}

const removedPaths = new Set();
for (const question of questions) {
  const removed = removedByQuestion.get(question.id) ?? [];
  if (!removed.length) continue;

  const removedForQuestion = new Set(removed.map((item) => item.path));
  const next = getImagePaths(question).filter((imagePath) => !removedForQuestion.has(normalizePath(imagePath)));
  for (const item of removed) removedPaths.add(item.path);

  if (next.length) {
    question.image_paths = next;
    question.image_path = next[0];
    delete question.image_status;
  } else {
    delete question.image_paths;
    delete question.image_path;
    question.image_status = 'unavailable-prior-middle-pruned';
  }
}

const usedImagePaths = new Set();
for (const question of questions) {
  for (const imagePath of getImagePaths(question)) {
    usedImagePaths.add(normalizePath(imagePath));
  }
}

const deletedFiles = [];
for (const imagePath of removedPaths) {
  if (usedImagePaths.has(imagePath)) continue;
  const absolutePath = path.join(root, imagePath);
  if (fs.existsSync(absolutePath)) {
    fs.rmSync(absolutePath, { force: true });
    deletedFiles.push(imagePath);
  }
}

const keptCrops = crops.filter((crop) => !removedPaths.has(normalizePath(crop.output)));

const report = {
  created_at: new Date().toISOString(),
  changed_questions: removedByQuestion.size,
  removed_image_references: [...removedByQuestion.values()].reduce((sum, items) => sum + items.length, 0),
  deleted_files: deletedFiles.length,
  crop_rows_before: crops.length,
  crop_rows_after: keptCrops.length,
  manual_removals: [...manualRemovals],
  questions: [...removedByQuestion.entries()].map(([id, removed]) => ({ id, removed })),
};

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.writeFileSync(cropsPath, `${JSON.stringify(keptCrops, null, 2)}\n`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`changed_questions=${report.changed_questions}`);
console.log(`removed_image_references=${report.removed_image_references}`);
console.log(`deleted_files=${report.deleted_files}`);
console.log(`crop_rows_before=${report.crop_rows_before}`);
console.log(`crop_rows_after=${report.crop_rows_after}`);
console.log(`report=${path.relative(root, reportPath)}`);

function examKey(question) {
  return [
    question.year,
    question.exam_system,
    question.session,
    question.subject,
    question.major_no,
  ].join('|');
}

function getImagePaths(question) {
  if (Array.isArray(question.image_paths)) return question.image_paths.map(normalizePath);
  if (question.image_path) return [normalizePath(question.image_path)];
  return [];
}

function fileHash(absolutePath) {
  return crypto.createHash('sha1').update(fs.readFileSync(absolutePath)).digest('hex');
}

function normalizePath(value) {
  return String(value ?? '').split(/[\\/]+/).join('/');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
