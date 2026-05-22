import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const extractPath = path.join(root, 'worklogs', 'toshin-analysis-extract.json');
const sourcesPath = path.join(root, 'data', 'sources.json');
const outDir = path.join(root, 'worklogs');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const extracts = JSON.parse(fs.readFileSync(extractPath, 'utf8')).extracts;
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

const domains = new Set(['力学', '波動', '波', '電磁気', '電気', '熱', '原子', '物理基礎']);

function questionNo(minorNo = '') {
  const match = String(minorNo).match(/問\s*([0-9０-９]+)/);
  if (!match) return null;
  return Number(match[1].replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)));
}

function unitParts(unit = '') {
  return unit
    .split(/[・／\/、\s]+|と/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isBroadUnit(unit = '') {
  return unitParts(unit).filter((part) => !domains.has(part)).length === 0 || unit === '力学・熱';
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function analysisLooksRelevant(question, analysisText) {
  if (isBroadUnit(question.unit ?? '')) return true;
  const text = normalizeText(analysisText);
  const unit = normalizeText(question.unit ?? '');
  const unitKeywords = unitParts(question.unit ?? '').filter((part) => !domains.has(part) && part.length >= 2);
  const currentKeywords = (question.keywords ?? []).filter((part) => !domains.has(part) && part.length >= 2);
  const candidates = [...new Set([...unitKeywords, ...currentKeywords])].map(normalizeText);
  if (candidates.some((keyword) => text.includes(keyword) || keyword.includes(text))) return true;
  if (unit.includes('干渉') && /(干渉|強め|経路差|位相|光路長)/.test(analysisText)) return true;
  if (unit.includes('ドップラー') && /ドップラー|音源|観測者|反射板|波長/.test(analysisText)) return true;
  if (unit.includes('熱力学') && /熱力学|内部エネルギー|状態方程式|仕事|熱量/.test(analysisText)) return true;
  if (unit.includes('エネルギー') && /エネルギー|仕事|保存/.test(analysisText)) return true;
  return false;
}

function analysisToSummary(text) {
  let summary = text
    .replace(/で差がついたであろう。?/g, '')
    .replace(/で差がつく。?/g, '')
    .replace(/比較的得点しやすいと思われる。?/g, '')
    .replace(/典型問題のため、答えを覚えている受験生も多かったであろう。?/g, '')
    .replace(/なお、.*?部分点が設定されている。?/g, '')
    .replace(/気を付ける必要があるが、今回の問題ではその旨が問題文に書いてあるので、それにならって解答すること。?/g, '条件に従って経路差を判断する。')
    .replace(/考えればよい/g, '考える')
    .replace(/考えるとよい/g, '考える')
    .replace(/求めればよい/g, '求める')
    .replace(/選択すればよい/g, '選択する')
    .replace(/立てればよい/g, '立てる')
    .replace(/気づけばよい/g, '判断する')
    .replace(/注意すること/g, '注意する')
    .replace(/解答する/g, '判断する')
    .replace(/\s+/g, ' ')
    .trim();

  if (summary.length > 150) {
    const firstSentence = summary.split('。')[0];
    summary = firstSentence.length >= 40 ? `${firstSentence}。` : `${summary.slice(0, 148)}。`;
  }
  return /[。！？]$/.test(summary) ? summary : `${summary}。`;
}

function analysisUrl(question) {
  const source = sources.find((item) => (
    item.kind === 'analysis' &&
    item.year === question.year &&
    item.exam_system === question.exam_system &&
    item.session === question.session &&
    item.subject === question.subject
  ));
  return source?.url ?? '';
}

const index = new Map();
for (const item of extracts) {
  const key = `${item.year}|${item.session}|${item.subject}|${item.major_no}|${item.question_no}`;
  if (!index.has(key)) index.set(key, item);
}

const changes = [];
const skipped = [];

for (const question of questions) {
  const qNo = questionNo(question.minor_no);
  if (!qNo) continue;
  const key = `${question.year}|${question.session}|${question.subject}|${question.major_no}|${qNo}`;
  const analysis = index.get(key);
  if (!analysis) continue;

  if (!analysisLooksRelevant(question, analysis.text)) {
    skipped.push({
      id: question.id,
      unit: question.unit,
      minor_no: question.minor_no,
      analysis: analysis.text,
      reason: 'unit_analysis_mismatch',
    });
    continue;
  }

  const oldSummary = question.summary ?? '';
  const nextSummary = analysisToSummary(analysis.text);
  if (nextSummary === oldSummary) continue;

  question.summary = nextSummary;
  question.summary_source_url = analysisUrl(question);
  question.summary_source_name = '東進 設問別分析';
  changes.push({
    id: question.id,
    year: question.year,
    subject: question.subject,
    unit: question.unit,
    minor_no: question.minor_no,
    old_summary: oldSummary,
    new_summary: nextSummary,
    source_url: question.summary_source_url,
  });
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outDir, `toshin-analysis-summary-apply-${stamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify({ created_at: new Date().toISOString(), changes, skipped }, null, 2)}\n`);

console.log(`changed=${changes.length}`);
console.log(`skipped=${skipped.length}`);
console.log(`report=${path.relative(root, reportPath)}`);
