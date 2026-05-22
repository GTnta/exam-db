import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const outDir = path.join(root, 'worklogs');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

const genericPatterns = [
  /を扱う(?:小問集合)?。?\s*問\d+/,
  /に関する大問。?\s*問\d+/,
  /問\d+は.+に関する設問/,
  /小問集合に関する設問/,
  /小問集合。/,
];

const domainWords = new Set([
  '力学',
  '波動',
  '波',
  '電磁気',
  '電気',
  '熱',
  '原子',
  '物理基礎',
  'グラフ',
]);

const weakKeywords = new Set([
  '物理',
  '物理基礎',
  '探究',
  '選択問題',
  '考察',
  '計算',
  '小問集合',
]);

function isGenericSummary(summary = '') {
  return genericPatterns.some((pattern) => pattern.test(summary));
}

function extractCommonSummary(summary = '') {
  const match = summary.match(/^(.*?。?)\s*問\d+(?:\([^)]+\))?は.+?に関する設問。?$/);
  if (match) return tidySentence(match[1]);
  if (/^小問集合。/.test(summary)) return '小問集合。';
  return '';
}

function tidySentence(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[。！？]$/.test(trimmed) ? trimmed : `${trimmed}。`;
}

function unitParts(unit = '') {
  const parts = unit
    .split(/[・／\/、\s]+|と/)
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

function mainTopic(unit = '') {
  const parts = unitParts(unit).filter((part) => !domainWords.has(part));
  if (parts.length) return parts.join('・');
  return unit || 'この小問';
}

function splitTopicFragments(commonSummary = '') {
  const base = commonSummary
    .replace(/[。！？]$/g, '')
    .replace(/を扱う小問集合$/, '')
    .replace(/を扱う$/, '')
    .replace(/に関する選択問題$/, '')
    .replace(/に関する大問$/, '')
    .replace(/から考える$/, '')
    .replace(/を考える$/, '');
  return base
    .split(/、|および|ならびに/)
    .flatMap((fragment) => fragment.split(/・|と、/))
    .map((fragment) => fragment.trim())
    .filter(Boolean);
}

function fragmentMatchesUnit(fragment, unit) {
  const parts = unitParts(unit);
  if (fragment.includes(unit) || unit.includes(fragment)) return true;
  return parts.some((part) => {
    if (domainWords.has(part) || part.length < 2) return false;
    return fragment.includes(part) || part.includes(fragment);
  });
}

function keywordMatchesUnit(keyword, unit) {
  if (!keyword) return false;
  if (unit.includes(keyword) || keyword.includes(unit)) return true;
  const parts = unitParts(unit);
  return parts.some((part) => {
    if (part.length < 2) return false;
    return keyword.includes(part) || part.includes(keyword);
  });
}

function cleanKeywords(question, commonSummary) {
  const original = Array.isArray(question.keywords) ? question.keywords : [];
  const unit = question.unit ?? '';
  const fragments = splitTopicFragments(commonSummary);
  const hasIndependentFragments = fragments.length >= 2;
  const dropFragments = hasIndependentFragments
    ? fragments.filter((fragment) => !fragmentMatchesUnit(fragment, unit))
    : [];

  const kept = [];
  for (const keyword of original) {
    if (!keyword || weakKeywords.has(keyword)) continue;
    if (keywordMatchesUnit(keyword, unit)) {
      kept.push(keyword);
      continue;
    }
    const appearsOnlyInOtherFragment = dropFragments.some(
      (fragment) => fragment.includes(keyword) || keyword.includes(fragment),
    );
    if (appearsOnlyInOtherFragment) continue;
    kept.push(keyword);
  }

  const unitKeywords = unitParts(unit).filter((part) => !weakKeywords.has(part));
  const combined = [...unitKeywords, ...kept].filter(Boolean);
  return [...new Set(combined)].slice(0, 8);
}

function buildSummary(question, keywords) {
  const topic = mainTopic(question.unit ?? '');
  const unit = question.unit ?? '';
  const extras = keywords
    .filter((keyword) => !domainWords.has(keyword))
    .filter((keyword) => !unit.includes(keyword))
    .slice(0, 3);

  if (extras.length) {
    return `${topic}について、${extras.join('・')}を手がかりに判断する。`;
  }
  return `${topic}について、条件や基本法則の関係を判断する。`;
}

const changes = [];

for (const question of questions) {
  const oldSummary = question.summary ?? '';
  const commonSummary = extractCommonSummary(oldSummary);
  const shouldReplaceSummary = isGenericSummary(oldSummary);
  const shouldCleanKeywords =
    shouldReplaceSummary || (Array.isArray(question.keywords) && question.keywords.length >= 8);

  if (!shouldReplaceSummary && !shouldCleanKeywords) continue;

  const oldKeywords = Array.isArray(question.keywords) ? [...question.keywords] : [];
  const nextKeywords = shouldCleanKeywords ? cleanKeywords(question, commonSummary) : oldKeywords;
  const nextSummary = shouldReplaceSummary ? buildSummary(question, nextKeywords) : oldSummary;

  if (commonSummary && shouldReplaceSummary && !question.common_summary) {
    question.common_summary = commonSummary;
  }
  question.keywords = nextKeywords;
  question.summary = nextSummary;

  if (
    question.summary !== oldSummary ||
    JSON.stringify(question.keywords) !== JSON.stringify(oldKeywords)
  ) {
    changes.push({
      id: question.id,
      year: question.year,
      subject: question.subject,
      unit: question.unit,
      old_summary: oldSummary,
      new_summary: question.summary,
      old_keywords: oldKeywords,
      new_keywords: question.keywords,
      common_summary: question.common_summary ?? '',
    });
  }
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outDir, `summary-cleanup-${stamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify({ created_at: new Date().toISOString(), changes }, null, 2)}\n`);

console.log(`changed=${changes.length}`);
console.log(`report=${path.relative(root, reportPath)}`);
