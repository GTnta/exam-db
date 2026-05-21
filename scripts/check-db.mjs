import { readFileSync } from "node:fs";

const questions = JSON.parse(readFileSync("data/questions.json", "utf8"));
const ids = new Set();
const duplicateIds = [];
const missing = [];
const invalidCorrectRates = [];
const missingCorrectRateSources = [];

for (const q of questions) {
  if (ids.has(q.id)) duplicateIds.push(q.id);
  ids.add(q.id);
  for (const key of ["id", "year", "exam_system", "session", "subject", "major_no", "minor_no", "answer_no", "unit", "summary"]) {
    if (q[key] === undefined || q[key] === null || q[key] === "") {
      missing.push(`${q.id}: ${key}`);
    }
  }
  if (q.correct_rate != null && (typeof q.correct_rate !== "number" || q.correct_rate < 0 || q.correct_rate > 100)) {
    invalidCorrectRates.push(`${q.id}: ${q.correct_rate}`);
  }
  if (q.correct_rate != null && !q.correct_rate_source_url) {
    missingCorrectRateSources.push(q.id);
  }
}

const groups = new Map();
for (const q of questions) {
  const key = `${q.year} ${q.session} ${q.subject}`;
  groups.set(key, (groups.get(key) || 0) + 1);
}

console.log(`records: ${questions.length}`);
console.log("groups:");
for (const [key, count] of [...groups.entries()].sort()) {
  console.log(`  ${key}: ${count}`);
}
if (duplicateIds.length) {
  console.log("duplicate ids:");
  for (const id of duplicateIds) console.log(`  ${id}`);
}
if (missing.length) {
  console.log("missing required fields:");
  for (const item of missing) console.log(`  ${item}`);
}
if (invalidCorrectRates.length) {
  console.log("invalid correct rates:");
  for (const item of invalidCorrectRates) console.log(`  ${item}`);
}
if (missingCorrectRateSources.length) {
  console.log("missing correct rate sources:");
  for (const id of missingCorrectRateSources) console.log(`  ${id}`);
}
if (duplicateIds.length || missing.length || invalidCorrectRates.length || missingCorrectRateSources.length) process.exitCode = 1;
