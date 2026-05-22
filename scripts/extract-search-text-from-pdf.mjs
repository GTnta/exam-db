import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const questionsPath = join(root, 'data', 'questions.json');
const cropsPath = join(root, 'data', 'image-crops.json');
const reportPath = join(root, 'worklogs', 'pdf-search-text-extract.json');
const tempDir = join(root, 'data', '_tmp', 'pdf-search-text');
const dryRun = process.argv.includes('--dry-run');

const pdftotext = findCommand('pdftotext');
const pdfinfo = findCommand('pdfinfo');

if (!pdftotext || !pdfinfo) {
  console.error('pdftotext/pdfinfo was not found. Install poppler-utils before running this script.');
  if (dryRun) process.exit(0);
  process.exit(1);
}

const questions = JSON.parse(readFileSync(questionsPath, 'utf8'));
const crops = existsSync(cropsPath) ? JSON.parse(readFileSync(cropsPath, 'utf8')) : [];
const cropsByQuestion = groupBy(crops, (crop) => crop.question_id);
const questionsByPdf = groupBy(
  questions.filter((question) => question.pdf_path?.startsWith('data/pdf/') && existsSync(join(root, question.pdf_path))),
  (question) => question.pdf_path,
);

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });

const report = {
  created_at: new Date().toISOString(),
  pdf_groups: questionsByPdf.size,
  updated_questions: 0,
  pending_questions: 0,
  by_status: {},
  samples: [],
};

for (const [pdfPath, groupQuestions] of questionsByPdf) {
  const sourcePdf = join(root, pdfPath);
  const pageCount = getPageCount(sourcePdf);
  const pageTexts = extractPageTexts(sourcePdf, pageCount);

  const sortedQuestions = [...groupQuestions].sort((a, b) => (
    Number(a.major_no) - Number(b.major_no) ||
    Number(primaryQuestionNo(a.minor_no) ?? 0) - Number(primaryQuestionNo(b.minor_no) ?? 0) ||
    String(a.id).localeCompare(String(b.id), 'ja')
  ));

  for (let index = 0; index < sortedQuestions.length; index += 1) {
    const question = sortedQuestions[index];
    const pdfPages = pdfPagesForQuestion(question, cropsByQuestion, pageCount);
    if (!pdfPages.length) {
      markStatus(question, 'pending-no-pdf-page');
      continue;
    }

    const joinedPageText = pdfPages
      .map((page) => pageTexts[page - 1] ?? '')
      .join('\n')
      .trim();

    const nextQuestion = sortedQuestions.slice(index + 1).find((candidate) => (
      candidate.pdf_path === question.pdf_path &&
      String(candidate.major_no) === String(question.major_no) &&
      primaryQuestionNo(candidate.minor_no) !== primaryQuestionNo(question.minor_no)
    ));

    const sliced = sliceQuestionText(joinedPageText, question, nextQuestion);
    const text = cleanSearchText(sliced || joinedPageText);
    if (!text || text.length < 20) {
      markStatus(question, 'pending-empty-text');
      continue;
    }

    question.masked_problem_text = text;
    question.problem_text_status = sliced ? 'pdftotext-question-slice' : 'pdftotext-page-text';
    question.problem_text_source = 'pdftotext';
    report.updated_questions += 1;
    increment(report.by_status, question.problem_text_status);
    if (report.samples.length < 20) {
      report.samples.push({ id: question.id, status: question.problem_text_status, text: text.slice(0, 160) });
    }
  }
}

if (!dryRun) {
  writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
}

for (const question of questions) {
  if (!question.problem_text_status) {
    report.pending_questions += 1;
    increment(report.by_status, 'pending');
  }
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`pdf_groups=${report.pdf_groups}`);
console.log(`updated_questions=${report.updated_questions}`);
console.log(`pending_questions=${report.pending_questions}`);
console.log(`by_status=${JSON.stringify(report.by_status)}`);
console.log(`report=${reportPath}`);

function pdfPagesForQuestion(question, cropsByQuestion, pageCount) {
  const cropPages = (cropsByQuestion.get(question.id) ?? [])
    .map((crop) => Number(crop.pdf_page ?? crop.page))
    .filter((page) => Number.isFinite(page) && page >= 1 && page <= pageCount);
  if (cropPages.length) return unique(cropPages);
  return expandPages(question.page)
    .filter((page) => page >= 1 && page <= pageCount);
}

function sliceQuestionText(text, question, nextQuestion) {
  const currentNo = primaryQuestionNo(question.minor_no);
  if (!currentNo) return '';
  const currentIndex = findQuestionMarker(text, currentNo);
  if (currentIndex < 0) return '';
  const nextNo = primaryQuestionNo(nextQuestion?.minor_no);
  const nextIndex = nextNo ? findQuestionMarker(text.slice(currentIndex + 1), nextNo) : -1;
  const end = nextIndex >= 0 ? currentIndex + 1 + nextIndex : text.length;
  return text.slice(currentIndex, end);
}

function findQuestionMarker(text, questionNo) {
  const patterns = [
    new RegExp(`問\\s*${escapeRegExp(questionNo)}(?!\\d)`),
    new RegExp(`問${escapeRegExp(toZenkakuDigits(questionNo))}`),
  ];
  const compactText = text.replace(/\s+/g, ' ');
  const positions = patterns
    .map((pattern) => compactText.search(pattern))
    .filter((index) => index >= 0);
  return positions.length ? Math.min(...positions) : -1;
}

function cleanSearchText(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/- \d+ -/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

function markStatus(question, status) {
  question.problem_text_status = status;
  increment(report.by_status, status);
}

function getPageCount(sourcePdf) {
  const result = run(pdfinfo, [sourcePdf], { capture: true });
  const match = result.stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Could not read page count: ${sourcePdf}`);
  return Number(match[1]);
}

function extractPageTexts(sourcePdf, pageCount) {
  const texts = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const result = run(pdftotext, ['-layout', '-enc', 'UTF-8', '-f', String(page), '-l', String(page), sourcePdf, '-'], { capture: true });
    texts.push(result.stdout);
  }
  return texts;
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

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function expandPages(value) {
  const pages = new Set();
  for (const part of String(value ?? '').split(',')) {
    const trimmed = part.trim();
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      for (let page = Number(range[1]); page <= Number(range[2]); page += 1) pages.add(page);
      continue;
    }
    if (/^\d+$/.test(trimmed)) pages.add(Number(trimmed));
  }
  return [...pages].sort((a, b) => a - b);
}

function primaryQuestionNo(value = '') {
  const match = String(value)
    .normalize('NFKC')
    .match(/問\s*(\d+)/);
  return match ? match[1] : '';
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toZenkakuDigits(value) {
  return String(value).replace(/[0-9]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0xfee0));
}
