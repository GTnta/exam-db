import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const inDir = path.join(root, 'worklogs', 'analysis-pages');
const outPath = path.join(root, 'worklogs', 'toshin-analysis-extract.json');

function decodeHtml(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ascii = buffer.toString('latin1');
  const charset = /charset=["']?\s*shift[_-]?jis/i.test(ascii) ? 'shift_jis' : 'utf-8';
  return new TextDecoder(charset).decode(buffer);
}

function htmlToText(html) {
  const start = html.search(/<a\s+name=["']analysis["']/i);
  const sliced = start >= 0 ? html.slice(start) : html;
  return sliced
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|table|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function zenkakuToAscii(value) {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

function normalizeQuestionLabel(label) {
  return zenkakuToAscii(label)
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, '');
}

function parseMeta(fileName) {
  const match = fileName.match(/^(\d{4})_([^_]+)_(.+?)_東進\.html$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    session: match[2],
    subject: match[3],
  };
}

function parseText(text) {
  const lines = text.split('\n');
  const items = [];
  let currentMajor = null;
  let currentQuestion = null;

  function pushQuestion() {
    if (currentQuestion && currentQuestion.text.trim()) {
      items.push({
        major_no: currentMajor,
        question_label: currentQuestion.label,
        question_no: Number(currentQuestion.label.match(/\d+/)?.[0] ?? 0),
        text: currentQuestion.text.trim(),
      });
    }
    currentQuestion = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const section = line.match(/[【〖]\s*第\s*([0-9０-９]+)\s*問/);
    if (section) {
      pushQuestion();
      currentMajor = Number(zenkakuToAscii(section[1]));
      continue;
    }

    if (/^(Copyright|大学受験予備校|SNSでシェア)/.test(line)) {
      pushQuestion();
      break;
    }

    const questionStarts = [...line.matchAll(/問\s*([0-9０-９]+(?:[（(][0-9０-９]+[）)])?)\s*(?:では|は)/g)];
    if (questionStarts.length) {
      pushQuestion();
      for (let index = 0; index < questionStarts.length; index += 1) {
        const match = questionStarts[index];
        const next = questionStarts[index + 1];
        const label = normalizeQuestionLabel(`問${match[1]}`);
        const textStart = match.index + match[0].length;
        const textEnd = next ? next.index : line.length;
        const fragment = line.slice(textStart, textEnd).replace(/^、/, '').trim();
        currentQuestion = { label, text: fragment };
        if (next) pushQuestion();
      }
      continue;
    }

    if (currentQuestion && /^[A-ZＡ-Ｚ]は/.test(line)) {
      continue;
    }

    if (currentQuestion && !/[【〖]\s*第/.test(line)) {
      currentQuestion.text += currentQuestion.text ? ` ${line}` : line;
    }
  }
  pushQuestion();
  return items;
}

const extracts = [];
for (const dirent of fs.readdirSync(inDir, { withFileTypes: true })) {
  if (!dirent.isFile() || !dirent.name.endsWith('.html')) continue;
  const meta = parseMeta(dirent.name);
  if (!meta) continue;
  const filePath = path.join(inDir, dirent.name);
  const html = decodeHtml(filePath);
  const text = htmlToText(html);
  const items = parseText(text).map((item) => ({
    ...meta,
    ...item,
    source_file: path.relative(root, filePath),
  }));
  extracts.push(...items);
}

const report = {
  created_at: new Date().toISOString(),
  count: extracts.length,
  extracts,
};

fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

const byFile = new Map();
for (const item of extracts) {
  const key = `${item.year} ${item.subject}`;
  byFile.set(key, (byFile.get(key) ?? 0) + 1);
}
console.log(`extracted=${extracts.length}`);
for (const [key, count] of [...byFile.entries()].sort()) {
  console.log(`${key}: ${count}`);
}
console.log(`report=${path.relative(root, outPath)}`);
