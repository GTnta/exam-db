import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const outDir = path.join(root, 'worklogs');
const dryRun = process.argv.includes('--dry-run');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

const changes = [];

for (let index = 0; index < questions.length; index += 1) {
  const question = questions[index];
  const next = questions[index + 1];
  const original = question.masked_problem_text;
  if (!original) continue;

  if (!next || examKey(question) !== examKey(next)) {
    const cleaned = cleanTail(original);
    if (cleaned && cleaned !== original) {
      question.masked_problem_text = cleaned;
      question.problem_text_status = appendStatus(question.problem_text_status, 'trimmed-to-question-boundary');
      question.problem_text_trimmed_at = new Date().toISOString();
      changes.push(changeRecord(question.id, next?.id ?? '', original, cleaned));
    }
    continue;
  }

  const trimmed = trimText(question, next, original);
  if (!trimmed || trimmed === original) continue;
  if (trimmed.length < 80 && original.length >= 140) continue;

  question.masked_problem_text = trimmed;
  question.problem_text_status = appendStatus(question.problem_text_status, 'trimmed-to-question-boundary');
  question.problem_text_trimmed_at = new Date().toISOString();
  changes.push(changeRecord(question.id, next.id, original, trimmed));
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outDir, `masked-text-trim-${stamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify({
  created_at: new Date().toISOString(),
  dry_run: dryRun,
  changed_questions: changes.length,
  changes,
}, null, 2)}\n`, 'utf8');

if (!dryRun) {
  fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
}

console.log(`changed_questions=${changes.length}`);
console.log(`report=${path.relative(root, reportPath)}`);

function trimText(question, next, text) {
  const candidates = boundaryCandidates(question, next, text)
    .filter((candidate) => candidate.index >= Math.min(80, Math.floor(text.length * 0.2)))
    .filter((candidate) => looksLikeNextContent(candidate, question, next, text))
    .sort((a, b) => a.index - b.index);

  if (!candidates.length) return cleanTail(text);

  const cut = candidates[0].index;
  const trimmed = text.slice(0, cut).trim();
  return cleanTail(trimmed);
}

function boundaryCandidates(question, next, text) {
  const candidates = [];
  const nextMinor = numberPart(next.minor_no);

  for (let major = Number(question.major_no) + 1; major <= 6; major += 1) {
    addMatches(candidates, text, new RegExp(`(?:物理\\s*(?:基礎|I)?\\s*)?第\\s*${major}\\s*問`, 'g'), 'future-major');
  }

  if (next.major_no !== question.major_no) {
    addMatches(candidates, text, new RegExp(`(?:物理\\s*(?:基礎|I)?\\s*)?第\\s*${next.major_no}\\s*問`, 'g'), 'next-major');
    addMatches(candidates, text, /下\s*書\s*き\s*用\s*紙/g, 'draft-paper-before-next-major');
    addMatches(candidates, text, /試\s*験\s*問\s*題\s*は\s*次\s*に\s*続\s*く/g, 'continues-before-next-major');
  }

  if (next.middle_no && next.middle_no !== question.middle_no) {
    addMatches(candidates, text, new RegExp(`(?:^|[\\s。])${escapeRegExp(next.middle_no)}\\s+(?!(?:さん|君|氏|は|が|を|に))`, 'g'), 'next-middle');
  }

  if (nextMinor) {
    addMatches(candidates, text, new RegExp(`問\\s*${nextMinor}(?!\\d)`, 'g'), 'next-minor');
  }

  return candidates;
}

function looksLikeNextContent(candidate, question, next, text) {
  const after = text.slice(candidate.index, Math.min(text.length, candidate.index + 900));
  const before = text.slice(0, candidate.index);

  if (candidate.reason === 'draft-paper-before-next-major' || candidate.reason === 'continues-before-next-major') {
    return hasHeaderForNextMajor(after, next) || hasNextMetadata(after, next);
  }

  if (candidate.reason === 'next-major' || candidate.reason === 'future-major') return true;

  const ownQuestionMarker = markerIndex(before, question);
  if (candidate.reason === 'next-minor' && ownQuestionMarker >= 0 && candidate.index < ownQuestionMarker + 90) {
    return false;
  }

  return hasNextMetadata(after, next) || isLateEnoughForSequentialQuestion(candidate.index, text);
}

function hasHeaderForNextMajor(text, next) {
  return new RegExp(`第\\s*${next.major_no}\\s*問`).test(text);
}

function hasNextMetadata(text, next) {
  const compactAfter = compact(text);
  const tokens = metadataTokens(next);
  const hits = tokens.filter((token) => compactAfter.includes(token));
  return hits.length >= Math.min(2, tokens.length);
}

function metadataTokens(question) {
  const raw = [
    question.unit,
    question.summary,
    ...(question.keywords ?? []),
  ].join(' ');
  return [...new Set(
    raw
      .normalize('NFKC')
      .split(/[・/／,、。\s]+/)
      .map((token) => compact(token))
      .filter((token) => token.length >= 2)
      .filter((token) => !/^(物理|物理I|物理基礎|小問集合|典型度|高|中|低)$/.test(token)),
  )].slice(0, 10);
}

function isLateEnoughForSequentialQuestion(index, text) {
  return index > 180 && index > text.length * 0.45;
}

function markerIndex(text, question) {
  const ownMinor = numberPart(question.minor_no);
  if (!ownMinor) return -1;
  const match = text.match(new RegExp(`問\\s*${ownMinor}(?!\\d)`));
  return match ? match.index ?? -1 : -1;
}

function cleanTail(text) {
  return text
    .replace(/\s*\(?\s*下\s*書\s*き\s*用\s*紙\s*\)?.*$/u, '')
    .replace(/\s*(?:物\s*理|物\s*理\s*基\s*礎)\s*の\s*試\s*験\s*問\s*題\s*は\s*次\s*に\s*続\s*く.*$/u, '')
    .replace(/\s*試\s*験\s*問\s*題\s*は\s*次\s*に\s*続\s*く.*$/u, '')
    .replace(/\s*(?:物理|物理基礎)\s*解答番号\s*\d+\s*[~～]\s*\d+\s*$/u, '')
    .replace(/\s*(?:物理|物理基礎)\s*\(\s*\d{4}\s*[―ー-]\s*\d+\s*\)\s*$/u, '')
    .replace(/\s*\(\s*\d{4}\s*[―ー-]\s*\d+\s*\)\s*(?:物理|物理基礎)?\s*$/u, '')
    .trim();
}

function addMatches(candidates, text, pattern, reason) {
  for (const match of text.matchAll(pattern)) {
    candidates.push({ index: match.index ?? 0, reason, match: match[0] });
  }
}

function examKey(question) {
  return [question.year, question.exam_system, question.session, question.subject].join('|');
}

function numberPart(value) {
  const match = String(value ?? '').match(/\d+/);
  return match ? match[0] : '';
}

function compact(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[‐‑‒–—−ー]/g, '-')
    .replace(/\s+/g, '');
}

function oneLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function appendStatus(status, suffix) {
  const current = String(status ?? '');
  return current.includes(suffix) ? current : [current || 'unknown', suffix].join('+');
}

function changeRecord(id, nextId, original, trimmed) {
  return {
    id,
    next_id: nextId,
    before_length: original.length,
    after_length: trimmed.length,
    removed_length: original.length - trimmed.length,
    before_tail: oneLine(original.slice(-220)),
    after_tail: oneLine(trimmed.slice(-220)),
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
