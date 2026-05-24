import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const cropsPath = path.join(root, 'data', 'image-crops.json');
const reportPath = path.join(root, 'worklogs', 'recovered-image-crops-from-questions.json');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8').replace(/^\uFEFF/, ''));
const existing = JSON.parse(fs.readFileSync(cropsPath, 'utf8').replace(/^\uFEFF/, ''));
const existingByOutput = new Map(existing.map((row) => [normalizePath(row.output), row]));
const rows = [];

for (const question of questions) {
  const imagePaths = Array.isArray(question.image_paths) && question.image_paths.length
    ? question.image_paths
    : question.image_path
      ? [question.image_path]
      : [];
  const pages = pageNumbers(question.page);
  imagePaths.forEach((imagePath, index) => {
    const output = normalizePath(imagePath);
    const old = existingByOutput.get(output);
    const page = pages[index] ?? pages[0] ?? '';
    rows.push(old ?? {
      question_id: question.id,
      source_pdf: question.pdf_path ?? '',
      page,
      pdf_page: Number(page) > 2 ? Number(page) : '',
      box: { x: 0.055, y: 0.04, width: 0.89, height: 0.91 },
      output,
      label: imagePaths.length > 1 ? `${index + 1}/${imagePaths.length}` : '',
      status: 'recovered-from-question-image-paths',
      note: 'Recovered after metadata rewrite; image path is authoritative.',
    });
  });
}

fs.writeFileSync(cropsPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
fs.writeFileSync(reportPath, `${JSON.stringify({
  created_at: new Date().toISOString(),
  question_count: questions.length,
  crop_rows_before: existing.length,
  crop_rows_after: rows.length,
}, null, 2)}\n`, 'utf8');

console.log(`crop_rows_before=${existing.length}`);
console.log(`crop_rows_after=${rows.length}`);
console.log(`report=${path.relative(root, reportPath)}`);

function pageNumbers(value) {
  const text = String(value ?? '').normalize('NFKC');
  const range = text.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }
  }
  const one = text.match(/\d+/);
  return one ? [Number(one[0])] : [];
}

function normalizePath(value) {
  return String(value ?? '').split(/[\\/]+/).join('/');
}
