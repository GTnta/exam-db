import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const questionsPath = join(root, 'data', 'questions.json');
const reportPath = join(root, 'worklogs', 'image-ocr-search-text.json');
const tempDir = join(root, 'data', '_tmp', 'image-ocr');
const dryRun = process.argv.includes('--dry-run');

const tesseract = findCommand('tesseract');
const magick = findCommand('magick') || findCommand('convert');

if (!tesseract || !magick) {
  console.error('tesseract and ImageMagick are required for image OCR.');
  if (dryRun) process.exit(0);
  process.exit(1);
}

const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));
rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });

const report = {
  created_at: new Date().toISOString(),
  attempted_questions: 0,
  updated_questions: 0,
  skipped_existing_text: 0,
  missing_images: 0,
  empty_ocr: 0,
  samples: [],
};

for (const question of questions) {
  if (question.masked_problem_text && !/^pending/.test(question.problem_text_status ?? '')) {
    report.skipped_existing_text += 1;
    continue;
  }

  const images = getQuestionImages(question)
    .map((imagePath) => join(root, imagePath))
    .filter((imagePath) => existsSync(imagePath));

  if (!images.length) {
    report.missing_images += 1;
    question.problem_text_status = question.problem_text_status || 'pending-no-image-for-ocr';
    continue;
  }

  report.attempted_questions += 1;
  const parts = [];
  for (let index = 0; index < images.length; index += 1) {
    const pngPath = join(tempDir, `${safeName(question.id)}-${index + 1}.png`);
    convertForOcr(images[index], pngPath);
    const text = run(tesseract, [pngPath, 'stdout', '-l', 'jpn+eng', '--psm', '6'], { capture: true }).stdout;
    parts.push(text);
  }

  const cleaned = cleanSearchText(parts.join('\n'));
  if (!cleaned || cleaned.length < 20) {
    report.empty_ocr += 1;
    question.problem_text_status = 'pending-empty-ocr';
    continue;
  }

  question.masked_problem_text = cleaned;
  question.problem_text_status = question.problem_text_status === 'pdftotext-page-text'
    ? 'pdftotext-page-text-plus-ocr'
    : 'tesseract-image-ocr';
  question.problem_text_source = 'tesseract jpn+eng';
  report.updated_questions += 1;
  if (report.samples.length < 20) {
    report.samples.push({ id: question.id, status: question.problem_text_status, text: cleaned.slice(0, 160) });
  }
}

if (!dryRun) {
  writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`attempted_questions=${report.attempted_questions}`);
console.log(`updated_questions=${report.updated_questions}`);
console.log(`skipped_existing_text=${report.skipped_existing_text}`);
console.log(`missing_images=${report.missing_images}`);
console.log(`empty_ocr=${report.empty_ocr}`);
console.log(`report=${reportPath}`);

function getQuestionImages(question) {
  const images = [];
  if (Array.isArray(question.image_paths)) images.push(...question.image_paths);
  if (question.image_path) images.push(question.image_path);
  return [...new Set(images.filter(Boolean))];
}

function convertForOcr(inputPath, outputPath) {
  const args = [
    inputPath,
    '-colorspace',
    'Gray',
    '-resize',
    '2200x2200>',
    '-sharpen',
    '0x0.8',
    '-strip',
    outputPath,
  ];
  if (magick === 'magick') run('magick', args);
  else run(magick, args);
}

function cleanSearchText(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[|｜]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

function findCommand(command) {
  const lookup = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], { encoding: 'utf8' });
  return lookup.status === 0 ? command : '';
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  if (options.capture) return result;
  return result;
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}
