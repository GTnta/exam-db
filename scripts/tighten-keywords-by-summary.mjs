import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const outDir = path.join(root, 'worklogs');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

const domainWords = new Set([
  '力学',
  '波動',
  '波',
  '電磁気',
  '電気',
  '熱',
  '原子',
  '物理基礎',
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

function unitParts(unit = '') {
  return unit
    .split(/[・／\/、\s]+|と/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstDomain(unit = '') {
  const parts = unitParts(unit);
  return parts.find((part) => domainWords.has(part)) ?? '';
}

function keywordAllowed(keyword, question) {
  if (!keyword || weakKeywords.has(keyword)) return false;

  const unit = question.unit ?? '';
  const summary = question.summary ?? '';
  const allowedText = `${unit} ${summary}`;
  const domain = firstDomain(unit);

  if (domainWords.has(keyword)) {
    if (keyword === domain) return true;
    if (keyword === '波動' && domain === '波') return true;
    if (keyword === '波' && domain === '波動') return true;
    return false;
  }

  if (allowedText.includes(keyword)) return true;
  if (keyword.includes(unit) || unit.includes(keyword)) return true;

  return unitParts(unit)
    .filter((part) => !domainWords.has(part))
    .some((part) => part.length >= 2 && (keyword.includes(part) || part.includes(keyword)));
}

const changes = [];

for (const question of questions) {
  if (!Array.isArray(question.keywords) || question.keywords.length === 0) continue;
  const oldKeywords = question.keywords;
  const unitKeywords = unitParts(question.unit ?? '').filter((part) => !weakKeywords.has(part));
  const filtered = oldKeywords.filter((keyword) => keywordAllowed(keyword, question));
  const nextKeywords = [...new Set([...unitKeywords, ...filtered])].slice(0, 8);

  if (JSON.stringify(nextKeywords) !== JSON.stringify(oldKeywords)) {
    question.keywords = nextKeywords;
    changes.push({
      id: question.id,
      year: question.year,
      subject: question.subject,
      unit: question.unit,
      summary: question.summary,
      old_keywords: oldKeywords,
      new_keywords: nextKeywords,
    });
  }
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outDir, `keyword-tighten-${stamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify({ created_at: new Date().toISOString(), changes }, null, 2)}\n`);

console.log(`changed=${changes.length}`);
console.log(`report=${path.relative(root, reportPath)}`);
