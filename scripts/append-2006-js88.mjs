import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";
const sourcesPath = "data/sources.json";
const year = 2006;
const subject = "物理I";
const sourceName = "JS日本の学校";

const units = {
  1: ["小問集合", "物理Iの各分野からの小問集合。", ["小問集合"]],
  2: ["電磁気", "電流・磁場・電磁誘導・回路に関する大問。", ["電磁気", "電流", "磁場", "回路"]],
  3: ["波動", "波の性質、干渉、共鳴、音波に関する大問。", ["波動", "干渉", "共鳴", "音波"]],
  4: ["力学・熱", "力学、エネルギー、熱に関する総合大問。", ["力学", "エネルギー", "熱"]]
};

const rows = [
  [1, "", "問1", 1, "1", 5], [1, "", "問2", 2, "6", 5], [1, "", "問3", 3, "4", 5], [1, "", "問4", 4, "2", 5], [1, "", "問5", 5, "3", 5], [1, "", "問6", 6, "3", 5],
  [2, "A", "問1", 1, "5", 5], [2, "A", "問2", 2, "5", 5], [2, "B", "問3", 3, "4", 4], [2, "B", "問4", 4, "1", 4],
  [3, "A", "問1", 1, "5", 4], [3, "A", "問2", 2, "2", 4], [3, "B", "問3", 3, "3", 4], [3, "B", "問4", 4, "3", 4],
  [4, "A", "問1", 1, "3", 4], [4, "A", "問2", 2, "4", 4], [4, "A", "問3", 3, "3", 4], [4, "", "問4", 4, "5", 4], [4, "B", "問5", 5, "1", 4], [4, "B", "問6", 6, "1", 4], [4, "", "問7", 7, "1", 4], [4, "C", "問8", 8, "3", 4], [4, "C", "問9", 9, "4", 4]
];

function record(row, index) {
  const [major, middle, minor, answerNo, answer, points] = row;
  const [unit, summary, keywords] = units[major];
  return {
    id: `${year}_center_main_physics1_a${String(index).padStart(2, "0")}`,
    year,
    exam_system: "center",
    session: "main",
    subject,
    major_no: major,
    middle_no: middle,
    minor_no: minor,
    answer_no: String(answerNo),
    unit,
    keywords,
    typicality: unit === "小問集合" ? "低" : "高",
    summary: `${summary} ${minor}は${unit}に関する設問。`,
    answer: String(answer),
    points,
    correct_rate: null,
    page: "",
    pdf_path: "https://school.js88.com/sd_article/dai/dai_center_data/pdf/2006Phy1.pdf",
    image_path: "",
    notes: "出典: JS日本の学校 センター試験過去問題。"
  };
}

const questions = rows.map((row, index) => record(row, index + 1));
const sources = [
  { year, exam_system: "center", session: "main", subject, kind: "question", url: "https://school.js88.com/sd_article/dai/dai_center_data/pdf/2006Phy1.pdf", local_path: "data/pdf/2006_center_main_physics1.pdf", source_name: sourceName },
  { year, exam_system: "center", session: "main", subject, kind: "answer", url: "https://school.js88.com/sd_article/dai/dai_center_data/pdf/2006Phy1_ans.pdf", local_path: "data/pdf/2006_center_main_physics1_answer.pdf", source_name: sourceName }
];

function replaceGenerated(path, entries, predicate) {
  const current = JSON.parse(readFileSync(path, "utf8"));
  const filtered = current.filter((entry) => !predicate(entry));
  filtered.push(...entries);
  writeFileSync(path, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
  return entries.length;
}

const registeredQuestions = replaceGenerated(questionsPath, questions, (entry) => (
  entry.year === year &&
  entry.exam_system === "center" &&
  entry.session === "main" &&
  entry.subject === subject
));
const registeredSources = replaceGenerated(sourcesPath, sources, (entry) => (
  entry.year === year &&
  entry.exam_system === "center" &&
  entry.session === "main" &&
  entry.subject === subject &&
  entry.source_name === sourceName
));

console.log(`registered questions: ${registeredQuestions}`);
console.log(`registered sources: ${registeredSources}`);
