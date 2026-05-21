import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const questionsPath = join(root, "data", "questions.json");
const tempDir = join(root, "data", "_tmp", "pdf-text-pages");
const dryRun = process.argv.includes("--dry-run");

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
const pdftotext = findCommand("pdftotext");
const pdfinfo = findCommand("pdfinfo");

if (!pdftotext || !pdfinfo) {
  console.error("pdftotext/pdfinfo が見つかりません。poppler-utils を入れてから実行してください。");
  process.exit(1);
}

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

const groups = groupByPdf(questions.filter((question) => (
  question.pdf_path?.startsWith("data/pdf/") &&
  existsSync(join(root, question.pdf_path)) &&
  !question.page
)));

let updated = 0;
let exactGroups = 0;
let fallbackGroups = 0;
const unresolved = [];

for (const [pdfPath, items] of groups) {
  const sourcePdf = join(root, pdfPath);
  const pageCount = getPageCount(sourcePdf);
  const pageTexts = extractPageTexts(sourcePdf, pageCount);
  const assignments = inferAssignments(items, pageTexts, pageCount);

  for (const item of items) {
    const assigned = assignments.get(item.id);
    if (!assigned) {
      unresolved.push(item.id);
      continue;
    }
    item.page = assigned;
    updated += 1;
  }

  if ([...assignments.values()].some((value) => value.includes("*"))) fallbackGroups += 1;
  else exactGroups += 1;
}

if (!dryRun) {
  for (const question of questions) {
    if (typeof question.page === "string" && question.page.endsWith("*")) {
      question.page = question.page.slice(0, -1);
    }
  }
  writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
}

console.log(`pdf groups: ${groups.size}`);
console.log(`updated pages: ${updated}`);
console.log(`exact groups: ${exactGroups}`);
console.log(`fallback groups: ${fallbackGroups}`);
if (unresolved.length) {
  console.log("unresolved:");
  for (const id of unresolved) console.log(`  ${id}`);
}

function groupByPdf(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.pdf_path)) map.set(item.pdf_path, []);
    map.get(item.pdf_path).push(item);
  }
  return map;
}

function findCommand(command) {
  const lookup = spawnSync(process.platform === "win32" ? "where.exe" : "which", [command], { encoding: "utf8" });
  return lookup.status === 0 ? command : "";
}

function getPageCount(sourcePdf) {
  const result = run(pdfinfo, [sourcePdf], { capture: true });
  const match = result.stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`PDFページ数を取得できません: ${sourcePdf}`);
  return Number(match[1]);
}

function extractPageTexts(sourcePdf, pageCount) {
  const texts = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const result = run(pdftotext, ["-layout", "-enc", "UTF-8", "-f", String(page), "-l", String(page), sourcePdf, "-"], { capture: true });
    texts.push(normalizeText(result.stdout));
  }
  return texts;
}

function inferAssignments(items, pageTexts, pageCount) {
  const assignments = new Map();
  const majorRanges = inferMajorRanges(items, pageTexts, pageCount);
  let usedFallback = false;

  for (const [majorNo, majorItems] of groupByMajor(items)) {
    const majorRange = majorRanges.get(String(majorNo)) ?? { start: 1, end: pageCount, confidence: "fallback" };
    const minorGroups = [...groupByMinor(majorItems).entries()];
    const starts = minorGroups.map(([minorNo]) => ({
      minorNo,
      page: findMinorStartPage(minorNo, pageTexts, majorRange.start, majorRange.end),
    }));

    if (starts.some((entry) => entry.page == null)) {
      usedFallback = true;
      const fallback = fallbackMinorRanges(minorGroups, majorRange.start, majorRange.end);
      for (const [minorNo, pageRange] of fallback) {
        for (const item of groupByMinor(majorItems).get(minorNo)) {
          assignments.set(item.id, `${pageRange}*`);
        }
      }
      continue;
    }

    for (let index = 0; index < starts.length; index += 1) {
      const current = starts[index];
      const next = starts[index + 1];
      const start = current.page;
      const end = next ? Math.max(start, next.page) : majorRange.end;
      const pageRange = formatPageRange(start, end);
      for (const item of groupByMinor(majorItems).get(current.minorNo)) {
        assignments.set(item.id, pageRange);
      }
    }
  }

  if (usedFallback) {
    for (const id of assignments.keys()) {
      if (!assignments.get(id).endsWith("*")) assignments.set(id, `${assignments.get(id)}*`);
    }
  }
  return assignments;
}

function inferMajorRanges(items, pageTexts, pageCount) {
  const majors = [...new Set(items.map((item) => String(item.major_no)))].sort((a, b) => Number(a) - Number(b));
  const starts = majors.map((majorNo) => ({
    majorNo,
    page: findMajorStartPage(majorNo, pageTexts),
  }));
  const found = starts.filter((entry) => entry.page != null);
  if (found.length === 0) {
    return fallbackMajorRanges(majors, items, pageCount);
  }

  const ranges = new Map();
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    const next = starts.slice(index + 1).find((entry) => entry.page != null);
    if (current.page == null) continue;
    ranges.set(current.majorNo, {
      start: current.page,
      end: next ? Math.max(current.page, next.page - 1) : pageCount,
      confidence: "exact",
    });
  }

  for (const majorNo of majors) {
    if (!ranges.has(majorNo)) {
      const fallback = fallbackMajorRanges([majorNo], items.filter((item) => String(item.major_no) === majorNo), pageCount);
      ranges.set(majorNo, fallback.get(majorNo));
    }
  }
  return ranges;
}

function fallbackMajorRanges(majors, items, pageCount) {
  const ranges = new Map();
  const total = items.length || 1;
  let cursor = 1;
  for (const majorNo of majors) {
    const count = items.filter((item) => String(item.major_no) === majorNo).length || 1;
    const span = Math.max(1, Math.round((count / total) * pageCount));
    const end = majorNo === majors.at(-1) ? pageCount : Math.min(pageCount, cursor + span - 1);
    ranges.set(String(majorNo), { start: cursor, end, confidence: "fallback" });
    cursor = Math.min(pageCount, end + 1);
  }
  return ranges;
}

function fallbackMinorRanges(minorGroups, startPage, endPage) {
  const ranges = new Map();
  const pages = Math.max(1, endPage - startPage + 1);
  const total = minorGroups.reduce((sum, [, group]) => sum + group.length, 0) || 1;
  let cursor = startPage;
  for (let index = 0; index < minorGroups.length; index += 1) {
    const [minorNo, group] = minorGroups[index];
    const span = Math.max(1, Math.round((group.length / total) * pages));
    const end = index === minorGroups.length - 1 ? endPage : Math.min(endPage, cursor + span - 1);
    ranges.set(minorNo, formatPageRange(cursor, end));
    cursor = Math.min(endPage, end + 1);
  }
  return ranges;
}

function groupByMajor(items) {
  const map = new Map();
  for (const item of items) {
    const key = String(item.major_no);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function groupByMinor(items) {
  const map = new Map();
  for (const item of items) {
    const key = primaryMinorNo(item.minor_no);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function findMajorStartPage(majorNo, pageTexts) {
  const pattern = new RegExp(`第${escapeRegExp(toAsciiDigits(majorNo))}問`);
  for (let index = 0; index < pageTexts.length; index += 1) {
    if (pattern.test(compact(pageTexts[index]))) return index + 1;
  }
  return null;
}

function findMinorStartPage(minorNo, pageTexts, startPage, endPage) {
  const pattern = new RegExp(`問${escapeRegExp(primaryMinorNo(minorNo))}`);
  for (let page = startPage; page <= endPage; page += 1) {
    if (pattern.test(compact(pageTexts[page - 1]))) return page;
  }
  return null;
}

function primaryMinorNo(value) {
  const normalized = toAsciiDigits(String(value));
  const match = normalized.match(/問\s*(\d+)/);
  return match ? match[1] : normalized.replace(/\s+/g, "");
}

function normalizeText(value) {
  return toAsciiDigits(value).replace(/[　]/g, " ");
}

function compact(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function toAsciiDigits(value) {
  return String(value).replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10));
}

function formatPageRange(start, end) {
  return start === end ? String(start) : `${start}-${end}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stderr || result.stdout}`);
  }
  if (options.capture) return result;
  return result;
}
