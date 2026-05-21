import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const questionsPath = join(root, "data", "questions.json");
const cropsPath = join(root, "data", "image-crops.json");
const reportPath = join(root, "data", "image-page-audit.json");
const tempDir = join(root, "data", "_tmp", "image-page-sync");
const dryRun = process.argv.includes("--dry-run");

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
const previousCrops = existsSync(cropsPath) ? JSON.parse(readFileSync(cropsPath, "utf8")) : [];
const previousByQuestion = groupBy(previousCrops, (crop) => crop.question_id);
const pdftotext = findCommand("pdftotext");
const pdfinfo = findCommand("pdfinfo");

if (!pdftotext || !pdfinfo) {
  console.error("pdftotext/pdfinfo was not found. Install poppler-utils before running this script.");
  process.exit(1);
}

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

const groups = groupBy(
  questions.filter((question) => question.pdf_path?.startsWith("data/pdf/") && existsSync(join(root, question.pdf_path))),
  (question) => question.pdf_path,
);

const syncedQuestionPages = new Map();
const audit = {
  total_questions: questions.length,
  pdf_groups: groups.size,
  synced_groups: 0,
  partial_groups: 0,
  fallback_groups: 0,
  synced_questions: 0,
  fallback_questions: 0,
  generated_crop_rows: 0,
  groups: [],
};

for (const [pdfPath, items] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ja"))) {
  const sourcePdf = join(root, pdfPath);
  const pageCount = getPageCount(sourcePdf);
  const pageTexts = extractPageTexts(sourcePdf, pageCount);
  const inferred = inferQuestionPdfPages(items, pageTexts, pageCount);
  let synced = 0;

  for (const question of items) {
    const pages = inferred.assignments.get(question.id);
    if (!pages?.length) continue;
    syncedQuestionPages.set(question.id, pages);
    synced += 1;
  }

  const status = synced === items.length ? "synced" : synced > 0 ? "partial" : "fallback";
  if (status === "synced") audit.synced_groups += 1;
  else if (status === "partial") audit.partial_groups += 1;
  else audit.fallback_groups += 1;

  audit.groups.push({
    pdf_path: pdfPath,
    status,
    question_count: items.length,
    synced_questions: synced,
    page_count: pageCount,
    major_starts: Object.fromEntries(inferred.majorStarts),
    missing_major_starts: inferred.missingMajorStarts,
    missing_minor_starts: inferred.missingMinorStarts,
  });
}

const newCrops = [];
for (const question of questions) {
  if (!question.pdf_path?.startsWith("data/pdf/") || !existsSync(join(root, question.pdf_path))) continue;

  const pdfPages = syncedQuestionPages.get(question.id);
  if (pdfPages?.length) {
    audit.synced_questions += 1;
    newCrops.push(...createCrops(question, pdfPages));
    continue;
  }

  const fallback = previousByQuestion.get(question.id);
  if (fallback?.length) {
    audit.fallback_questions += 1;
    newCrops.push(...fallback.map((crop) => ({ ...crop })));
  }
}

newCrops.sort((a, b) => (
  String(a.source_pdf).localeCompare(String(b.source_pdf), "ja") ||
  Number(a.pdf_page ?? a.page) - Number(b.pdf_page ?? b.page) ||
  String(a.question_id).localeCompare(String(b.question_id), "ja") ||
  String(a.output).localeCompare(String(b.output), "ja")
));

audit.generated_crop_rows = newCrops.length;

if (!dryRun) {
  writeFileSync(cropsPath, `${JSON.stringify(newCrops, null, 2)}\n`);
  writeFileSync(reportPath, `${JSON.stringify(audit, null, 2)}\n`);
}

console.log(`pdf groups: ${audit.pdf_groups}`);
console.log(`synced groups: ${audit.synced_groups}`);
console.log(`partial groups: ${audit.partial_groups}`);
console.log(`fallback groups: ${audit.fallback_groups}`);
console.log(`synced questions: ${audit.synced_questions}`);
console.log(`fallback questions: ${audit.fallback_questions}`);
console.log(`image crop rows: ${audit.generated_crop_rows}`);

for (const group of audit.groups.filter((entry) => entry.status !== "synced")) {
  console.log(`needs review: ${group.pdf_path} (${group.status}, ${group.synced_questions}/${group.question_count})`);
  if (group.missing_major_starts.length) console.log(`  missing major: ${group.missing_major_starts.join(", ")}`);
  if (group.missing_minor_starts.length) console.log(`  missing minor: ${group.missing_minor_starts.slice(0, 12).join(", ")}`);
}

function inferQuestionPdfPages(items, pageTexts, pageCount) {
  const assignments = new Map();
  const compactTexts = pageTexts.map(compact);
  const majors = [...new Set(items.map((item) => String(item.major_no)))].sort((a, b) => Number(a) - Number(b));
  const majorStarts = new Map();
  const missingMajorStarts = [];
  const missingMinorStarts = [];

  for (const majorNo of majors) {
    const page = findMajorStartPage(majorNo, compactTexts);
    if (page == null) missingMajorStarts.push(majorNo);
    else majorStarts.set(majorNo, page);
  }

  for (let majorIndex = 0; majorIndex < majors.length; majorIndex += 1) {
    const majorNo = majors[majorIndex];
    const start = majorStarts.get(majorNo);
    if (start == null) continue;

    const nextStart = majors
      .slice(majorIndex + 1)
      .map((nextMajor) => majorStarts.get(nextMajor))
      .find((page) => page != null && page > start);
    const end = nextStart ? nextStart - 1 : pageCount;
    const majorItems = items.filter((item) => String(item.major_no) === majorNo);
    const minorGroups = [...groupBy(majorItems, (item) => primaryMinorNo(item.minor_no)).entries()];
    const minorStarts = [];

    for (const [minorNo] of minorGroups) {
      const page = findMinorStartPage(minorNo, compactTexts, start, end);
      if (page == null) {
        missingMinorStarts.push(`${majorNo}:${minorNo}`);
      }
      minorStarts.push({ minorNo, page });
    }

    for (let index = 0; index < minorStarts.length; index += 1) {
      const current = minorStarts[index];
      if (current.page == null) continue;

      const next = minorStarts.slice(index + 1).find((entry) => entry.page != null);
      const pageEnd = next ? Math.max(current.page, next.page) : end;
      const pages = range(current.page, pageEnd);
      for (const item of groupBy(majorItems, (entry) => primaryMinorNo(entry.minor_no)).get(current.minorNo)) {
        assignments.set(item.id, pages);
      }
    }
  }

  return { assignments, majorStarts, missingMajorStarts, missingMinorStarts };
}

function createCrops(question, pdfPages) {
  const displayPages = expandPages(question.page);
  return pdfPages.map((pdfPage, index) => {
    const page = displayPages[index] ?? displayPages.at(-1) ?? pdfPage;
    const output = `data/images/questions/${question.id}${pdfPages.length > 1 ? `_p${index + 1}` : ""}.webp`;
    return {
      question_id: question.id,
      source_pdf: question.pdf_path,
      page,
      pdf_page: pdfPage,
      box: null,
      output,
      label: pdfPages.length > 1 ? `${index + 1}/${pdfPages.length}` : "",
      status: "full-page-placeholder",
      note: "Full page image. Add a normalized box {x,y,width,height} for per-question crops.",
    };
  });
}

function findMajorStartPage(majorNo, compactTexts) {
  const patterns = [
    new RegExp(`第${escapeRegExp(toAsciiDigits(majorNo))}問`),
    new RegExp(`第${escapeRegExp(toKanjiNumber(Number(majorNo)))}問`),
  ];
  for (let index = 0; index < compactTexts.length; index += 1) {
    if (patterns.some((pattern) => pattern.test(compactTexts[index]))) return index + 1;
  }
  return null;
}

function findMinorStartPage(minorNo, compactTexts, startPage, endPage) {
  const value = toAsciiDigits(primaryMinorNo(minorNo));
  const patterns = [
    new RegExp(`問${escapeRegExp(value)}(?!\\d)`),
    new RegExp(`間${escapeRegExp(value)}(?!\\d)`),
  ];
  for (let page = startPage; page <= endPage; page += 1) {
    if (patterns.some((pattern) => pattern.test(compactTexts[page - 1]))) return page;
  }
  return null;
}

function getPageCount(sourcePdf) {
  const result = run(pdfinfo, [sourcePdf], { capture: true });
  const match = result.stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Unable to read page count: ${sourcePdf}`);
  return Number(match[1]);
}

function extractPageTexts(sourcePdf, pageCount) {
  const texts = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const result = run(pdftotext, ["-layout", "-enc", "UTF-8", "-f", String(page), "-l", String(page), sourcePdf, "-"], { capture: true });
    texts.push(result.stdout);
  }
  return texts;
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

function primaryMinorNo(value) {
  const normalized = toAsciiDigits(String(value));
  const match = normalized.match(/問\s*(\d+)/);
  return match ? match[1] : normalized.replace(/\s+/g, "");
}

function expandPages(value) {
  const pages = [];
  for (const part of String(value ?? "").split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let page = start; page <= end; page += 1) pages.push(page);
      continue;
    }
    if (/^\d+$/.test(trimmed)) pages.push(Number(trimmed));
  }
  return pages;
}

function range(start, end) {
  const pages = [];
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
}

function compact(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function normalizeText(value) {
  return toAsciiDigits(String(value)).normalize("NFKC");
}

function toAsciiDigits(value) {
  return String(value).replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10));
}

function toKanjiNumber(value) {
  const table = new Map([
    [1, "一"],
    [2, "二"],
    [3, "三"],
    [4, "四"],
    [5, "五"],
    [6, "六"],
  ]);
  return table.get(value) ?? String(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCommand(command) {
  const lookup = spawnSync(process.platform === "win32" ? "where.exe" : "which", [command], { encoding: "utf8" });
  return lookup.status === 0 ? command : "";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stderr || result.stdout}`);
  }
  if (options.capture) return result;
  return result;
}
