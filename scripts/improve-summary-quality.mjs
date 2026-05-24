import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const outDir = path.join(root, 'worklogs');

const badTerms = [
  '条件や基本法則',
  '注意',
  '気付',
  '容易',
  '難しくない',
  '考えればよい',
  'すればよい',
  '見極める',
  '落とし穴',
  '出題',
  '問題であった',
  '差がついた',
  '受験生',
  '苦戦',
  'ポイント',
  'できれば',
  '確認すれば',
  '解答できる',
];

const domainWords = new Set([
  '力学',
  '波動',
  '波',
  '電磁気',
  '電気',
  '熱',
  '原子',
  '物理',
  '物理I',
  '物理Ⅰ',
  '物理基礎',
]);

const boilerplatePatterns = [
  /^次の文章中の空欄.*?選べ。?/,
  /^次の文中の空欄.*?選べ。?/,
  /^次の会話文中の空欄.*?選べ。?/,
  /^次の.*?として最も適当なものを.*?選べ。?/,
  /^.*?として正しいものを.*?選べ。?/,
  /^.*?として最も適当なものを.*?選べ。?/,
  /^.*?最も適当なものを.*?選べ。?/,
  /^.*?正しいものを.*?選べ。?/,
];

function needsRewrite(summary = '') {
  return badTerms.some((term) => summary.includes(term));
}

function normalizeOcrText(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/([一-龯ぁ-んァ-ヶー])\s+(?=[一-龯ぁ-んァ-ヶー])/g, '$1')
    .replace(/問\s+(\d+)/g, '問$1')
    .replace(/[|｜]/g, '')
    .trim();
}

function stripQuestionLead(value = '') {
  return value
    .replace(/^問\d+(?:\([^)]+\))?\s*/, '')
    .replace(/^\d+\s*/, '')
    .trim();
}

function cleanSentence(value = '') {
  let text = normalizeOcrText(value)
    .replace(/物理基礎\/化学基礎\/生物基礎\/地学基礎 出題範囲:物理基礎/g, '')
    .replace(/物理基礎|物理 I|物理I|物 理 基 礎|物 理/g, '')
    .replace(/\(\d{4}[―ー一-]\d+\)/g, '')
    .replace(/解答番号.*$/g, '')
    .replace(/下書き用紙.*$/g, '')
    .replace(/次の[1-9１-９].*$/g, '')
    .replace(/後の.*$/g, '')
    .replace(/下の.*$/g, '')
    .trim();

  for (const pattern of boilerplatePatterns) {
    text = text.replace(pattern, '').trim();
  }

  return text
    .replace(/^[,，、。・\s]+/, '')
    .replace(/[。！？、,，\s]+$/, '')
    .trim();
}

function firstUsefulSentence(text = '') {
  const normalized = stripQuestionLead(normalizeOcrText(text));
  const sentences = normalized
    .split(/(?<=。)|(?<=\.)/)
    .map(cleanSentence)
    .filter(Boolean)
    .filter((sentence) => sentence.length >= 8)
    .filter((sentence) => !/^次の/.test(sentence))
    .filter((sentence) => !/選べ$/.test(sentence));

  if (sentences.length) return sentences[0];

  const fallback = cleanSentence(normalized.split(/として|最も適当|正しいもの|選べ/)[0] ?? '');
  return fallback.length >= 8 ? fallback : '';
}

function unitTopic(unit = '') {
  const parts = unit
    .split(/[・／\/、\s]+|と/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !domainWords.has(part));
  return parts.length ? parts.join('・') : unit || 'この問題';
}

function truncateJapanese(value, maxLength = 72) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).replace(/[、,，\s]+$/, '')}…`;
}

function buildSummary(question) {
  const topic = unitTopic(question.unit ?? '');
  const lead = firstUsefulSentence(question.masked_problem_text || question.problem_text || '');
  if (lead) {
    return `${topic}について、${truncateJapanese(lead)}を問う。`;
  }
  if (question.common_summary) {
    return `${topic}について、${question.common_summary.replace(/[。！？]$/, '')}中の設問内容を問う。`;
  }
  return `${topic}について、問題文の状況に基づいて関係式や物理量を判断する。`;
}

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const changes = [];

for (const question of questions) {
  const oldSummary = question.summary ?? '';
  if (!needsRewrite(oldSummary)) continue;

  const nextSummary = buildSummary(question);
  if (nextSummary === oldSummary) continue;

  question.summary = nextSummary;
  changes.push({
    id: question.id,
    year: question.year,
    subject: question.subject,
    unit: question.unit,
    old_summary: oldSummary,
    new_summary: nextSummary,
  });
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outDir, `summary-quality-${stamp}.json`);
fs.writeFileSync(
  reportPath,
  `${JSON.stringify({ created_at: new Date().toISOString(), changes }, null, 2)}\n`,
);

console.log(`changed=${changes.length}`);
console.log(`report=${path.relative(root, reportPath)}`);
