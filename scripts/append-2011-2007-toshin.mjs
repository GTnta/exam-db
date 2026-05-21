import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";
const sourcesPath = "data/sources.json";
const sourceName = "東進";
const subject = "物理I";

const unitMap = {
  1: ["小問集合", "物理Iの各分野からの小問集合。", ["小問集合"]],
  2: ["電磁気", "電流・磁場・電磁誘導・回路に関する大問。", ["電磁気", "電流", "磁場", "回路"]],
  3: ["波動", "波の性質、干渉、共鳴、音波に関する大問。", ["波動", "干渉", "共鳴", "音波"]],
  4: ["力学・熱", "力学、エネルギー、熱に関する総合大問。", ["力学", "エネルギー", "熱"]]
};

const configs = [
  {
    year: 2011,
    rows: [
      [1, "", "問1", 1, "3", 5], [1, "", "問2", 2, "2", 5], [1, "", "問3", 3, "1", 5], [1, "", "問4", 4, "4", 5], [1, "", "問5", 5, "2", 5], [1, "", "問6", "6-7", "1-6", 6, "ハイフンでつながれた正解は順序を問わない。各3点。"],
      [2, "A", "問1(1)", 1, "4", 4], [2, "A", "問1(2)", 2, "4", 4], [2, "A", "問2", 3, "3", 4], [2, "B", "問3", 4, "1", 4], [2, "B", "問4", 5, "2", 4],
      [3, "A", "問1", 1, "6", 4], [3, "A", "問2", 2, "1", 4], [3, "B", "問3", 3, "4", 4], [3, "B", "問4", 4, "4", 4], [3, "B", "問5", 5, "6", 4],
      [4, "A", "問1(1)", 1, "6", 4], [4, "A", "問1(2)", 2, "5", 4], [4, "A", "問2", 3, "4", 4], [4, "B", "問3", 4, "3", 5], [4, "B", "問4", 5, "5", 4], [4, "C", "問5", 6, "3", 4], [4, "C", "問6", 7, "1", 4]
    ]
  },
  {
    year: 2010,
    rows: [
      [1, "", "問1", 1, "1", 5], [1, "", "問2", 2, "1", 5], [1, "", "問3", 3, "3", 5], [1, "", "問4", 4, "2", 5], [1, "", "問5", 5, "7", 5], [1, "", "問6", 6, "6", 5],
      [2, "A", "問1", 1, "6", 4], [2, "A", "問2(1)", 2, "2", 4, "解答番号2・3は両方正解の場合のみ点を与える。"], [2, "A", "問2(2)", 3, "1", 4, "解答番号2・3は両方正解の場合のみ点を与える。"], [2, "B", "問3", 4, "3", 4], [2, "B", "問4(1)", 5, "2", 4], [2, "B", "問4(2)", 6, "4", 4],
      [3, "A", "問1", 1, "5", 4], [3, "A", "問2", 2, "4", 4], [3, "B", "問3", 3, "5", 4], [3, "B", "問4(1)", 4, "3", 4], [3, "B", "問4(2)", 5, "6", 4],
      [4, "A", "問1", 1, "1", 4], [4, "A", "問2", 2, "2", 4], [4, "A", "問3", 3, "2", 4], [4, "", "問4", 4, "6", 4], [4, "B", "問5", 5, "1", 3], [4, "B", "問6", 6, "5", 3], [4, "C", "問7", 7, "4", 4], [4, "C", "問8", 8, "6", 4]
    ]
  },
  {
    year: 2009,
    rows: [
      [1, "", "問1", "1-2", "5-3", 5, "両方正解の場合のみ点を与える。"], [1, "", "問2", 3, "5", 5], [1, "", "問3", 4, "3", 5], [1, "", "問4", 5, "6", 5], [1, "", "問5", 6, "6", 5], [1, "", "問6", 7, "4", 5],
      [2, "A", "問1", 1, "4", 4], [2, "A", "問2", 2, "1", 4], [2, "A", "問3", 3, "6", 4], [2, "B", "問4", 4, "4", 4], [2, "B", "問5", 5, "2", 4],
      [3, "A", "問1", 1, "3", 4], [3, "A", "問2", 2, "4", 4], [3, "A", "問3", 3, "5", 4], [3, "B", "問4", 4, "3", 5], [3, "B", "問5", 5, "1", 5],
      [4, "A", "問1", 1, "3", 4], [4, "A", "問2", 2, "3", 4], [4, "A", "問3", 3, "2", 4], [4, "B", "問4", 4, "6", 4], [4, "B", "問5", 5, "1", 4], [4, "C", "問6", 6, "4", 4], [4, "C", "問7", 7, "2", 4]
    ]
  },
  {
    year: 2008,
    rows: [
      [1, "", "問1", "1-2", "3-2", 5], [1, "", "問2", "3-4", "6-3", 5], [1, "", "問3", 5, "5", 5], [1, "", "問4", 6, "7", 5], [1, "", "問5", 7, "2", 5], [1, "", "問6", 8, "1", 5],
      [2, "A", "問1", 1, "4", 4], [2, "A", "問2", 2, "3", 4], [2, "A", "問3", 3, "5", 4], [2, "B", "問4", 4, "3", 4], [2, "B", "問5", 5, "2", 4],
      [3, "A", "問1", 1, "4", 4], [3, "A", "問2", 2, "4", 4], [3, "A", "問3", 3, "3", 4], [3, "B", "問4(1)", 4, "2", 2], [3, "B", "問4(2)", 5, "3", 2], [3, "B", "問5", 6, "4", 4],
      [4, "A", "問1", 1, "3", 4], [4, "A", "問2", 2, "2", 4], [4, "A", "問3", 3, "4", 5], [4, "B", "問4", 4, "1", 4], [4, "B", "問5", 5, "3", 5], [4, "B", "問6", 6, "1", 4], [4, "B", "問7", 7, "4", 4]
    ]
  },
  {
    year: 2007,
    rows: [
      [1, "", "問1", 1, "4", 5], [1, "", "問2", 2, "3", 5], [1, "", "問3", 3, "4", 5], [1, "", "問4", 4, "2", 5], [1, "", "問5(1)", 5, "3", 3], [1, "", "問5(2)", 6, "6", 3], [1, "", "問6", 7, "4", 5],
      [2, "A", "問1", 1, "5", 4], [2, "A", "問2", 2, "8", 4], [2, "B", "問3", 3, "3", 4], [2, "B", "問4", 4, "2", 4],
      [3, "A", "問1", 1, "1", 4], [3, "A", "問2", 2, "3", 4], [3, "B", "問3", 3, "4", 5], [3, "B", "問4", 4, "8", 4], [3, "B", "問5", 5, "4", 4],
      [4, "A", "問1", 1, "3", 4], [4, "A", "問2", 2, "1", 4], [4, "A", "問3", 3, "1", 4], [4, "", "問4", 4, "5", 4], [4, "B", "問5", 5, "3", 4], [4, "B", "問6", 6, "2", 4], [4, "C", "問7", 7, "3", 4], [4, "C", "問8", 8, "1", 4]
    ]
  }
];

function record(config, row, sequence) {
  const [major, middle, minor, answerNo, answer, points, note = ""] = row;
  const [unit, summary, keywords] = unitMap[major];
  return {
    id: `${config.year}_center_main_physics1_a${String(sequence).padStart(2, "0")}`,
    year: config.year,
    exam_system: "center",
    session: "main",
    subject,
    major_no: major,
    middle_no: middle,
    minor_no: minor,
    answer_no: String(answerNo),
    unit,
    keywords,
    typicality: unit === "小問集合" ? "低" : note ? "中" : "高",
    summary: `${summary} ${minor}は${unit}に関する設問。`,
    answer: String(answer),
    points,
    correct_rate: null,
    page: "",
    pdf_path: `https://www.toshin.com/center/${config.year}/pdf/q/butsuri.pdf`,
    image_path: "",
    notes: note || `出典: 東進 センター試験${config.year}解答速報。`
  };
}

function sourceRows(config) {
  const base = `https://www.toshin.com/center/${config.year}`;
  return [
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question", url: `${base}/pdf/q/butsuri.pdf`, local_path: `data/pdf/${config.year}_center_main_physics1.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer", url: `${base}/pdf/a/butsuri_ans.pdf`, local_path: `data/pdf/${config.year}_center_main_physics1_answer.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question_page", url: `${base}/butsuri_mondai_0.html`, local_path: "", source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "analysis", url: `${base}/butsuri_shousai.html#analysis`, local_path: "", source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer_page", url: `${base}/butsuri_ans.html`, local_path: "", source_name: sourceName }
  ];
}

const questions = configs.flatMap((config) => config.rows.map((row, index) => record(config, row, index + 1)));
const sources = configs.flatMap(sourceRows);

function replaceGenerated(path, entries, predicate) {
  const current = JSON.parse(readFileSync(path, "utf8"));
  const filtered = current.filter((entry) => !predicate(entry));
  filtered.push(...entries);
  writeFileSync(path, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
  return entries.length;
}

const targetYears = new Set(configs.map((item) => item.year));
const registeredQuestions = replaceGenerated(questionsPath, questions, (entry) => (
  targetYears.has(entry.year) &&
  entry.exam_system === "center" &&
  entry.session === "main" &&
  entry.subject === subject
));
const registeredSources = replaceGenerated(sourcesPath, sources, (entry) => (
  targetYears.has(entry.year) &&
  entry.exam_system === "center" &&
  entry.session === "main" &&
  entry.subject === subject &&
  entry.source_name === sourceName
));

console.log(`registered questions: ${registeredQuestions}`);
console.log(`registered sources: ${registeredSources}`);
