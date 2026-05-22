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

const broadTopicSeparators = /、|・|\/|／|と|および/;
const topicWords = [
  '力学',
  '波動',
  '電磁気',
  '熱',
  '原子',
  '運動',
  'エネルギー',
  '運動量',
  'モーメント',
  '電場',
  '磁場',
  '交流',
  'レンズ',
  '音波',
  '光',
  '気体',
  '波',
  '回路',
  'コンデンサー',
];

function hasGenericSummary(summary = '') {
  return genericPatterns.some((pattern) => pattern.test(summary));
}

function likelyMixedSummary(summary = '', unit = '') {
  if (!summary.includes('問')) return false;
  const head = summary.split('。')[0] ?? '';
  if (!broadTopicSeparators.test(head)) return false;
  const hits = topicWords.filter((word) => head.includes(word));
  if (hits.length < 2) return false;
  return !head.includes(unit);
}

function likelyKeywordPollution(question) {
  const keywords = Array.isArray(question.keywords) ? question.keywords : [];
  if (keywords.length < 8) return false;
  const unit = question.unit ?? '';
  const unrelated = keywords.filter((keyword) => keyword && !unit.includes(keyword));
  return unrelated.length >= 5;
}

const findings = questions
  .map((question) => {
    const reasons = [];
    if (hasGenericSummary(question.summary)) reasons.push('generic_summary');
    if (likelyMixedSummary(question.summary, question.unit)) reasons.push('mixed_summary');
    if (likelyKeywordPollution(question)) reasons.push('keyword_pollution_candidate');
    return {
      id: question.id,
      year: question.year,
      exam_type: question.exam_type,
      subject: question.subject,
      major_no: question.major_no,
      middle_no: question.middle_no,
      minor_no: question.minor_no,
      unit: question.unit,
      reasons,
      keyword_count: Array.isArray(question.keywords) ? question.keywords.length : 0,
      summary: question.summary,
    };
  })
  .filter((item) => item.reasons.length);

const byYear = new Map();
for (const item of findings) {
  const key = String(item.year);
  byYear.set(key, (byYear.get(key) ?? 0) + 1);
}

const byReason = new Map();
for (const item of findings) {
  for (const reason of item.reasons) {
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }
}

const report = {
  created_at: new Date().toISOString(),
  total_questions: questions.length,
  findings_count: findings.length,
  by_reason: Object.fromEntries([...byReason.entries()].sort()),
  by_year: Object.fromEntries([...byYear.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))),
  findings,
};

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonPath = path.join(outDir, `summary-contamination-audit-${stamp}.json`);
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`questions=${questions.length}`);
console.log(`findings=${findings.length}`);
console.log(`by_reason=${JSON.stringify(report.by_reason)}`);
console.log(`report=${path.relative(root, jsonPath)}`);
