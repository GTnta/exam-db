import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";
const sourcesPath = "data/sources.json";
const sourceName = "東進";
const subject = "物理I";

const configs = [
  {
    year: 2014,
    units: {
      1: ["小問集合", "物理Iの各分野からの小問集合。", ["小問集合"]],
      2: ["電磁気", "電流・磁場・電磁誘導・回路に関する大問。", ["電磁気", "電流", "磁場", "回路"]],
      3: ["波動", "波の性質、干渉、共鳴に関する大問。", ["波動", "干渉", "共鳴"]],
      4: ["力学・熱", "力学と気体の状態変化に関する総合大問。", ["力学", "エネルギー", "熱", "気体"]]
    },
    rows: [
      [1, "", "問1", 1, "4", 5], [1, "", "問2", 2, "5", 5], [1, "", "問3", 3, "3", 5], [1, "", "問4", 4, "3", 5], [1, "", "問5", 5, "3", 5, "1を解答した場合は2点。"], [1, "", "問6", 6, "6", 5],
      [2, "A", "問1", 7, "2", 5], [2, "A", "問2(1)", 8, "6", 2], [2, "A", "問2(2)", 9, "1", 3], [2, "B", "問3", 10, "3", 5], [2, "B", "問4", 11, "4", 5],
      [3, "A", "問1", 12, "5", 5, "3,6を解答した場合は2点。"], [3, "A", "問2", 13, "2", 5], [3, "B", "問3", 14, "4", 5], [3, "B", "問4", 15, "3", 5],
      [4, "A", "問1", 16, "4", 4], [4, "A", "問2", 17, "2", 5], [4, "B", "問3", 18, "4", 5], [4, "B", "問4", 19, "5", 4], [4, "B", "問5", 20, "4", 4], [4, "C", "問6", 21, "2", 4], [4, "C", "問7", 22, "2", 4]
    ]
  },
  {
    year: 2013,
    units: {
      1: ["小問集合", "物理Iの各分野からの小問集合。", ["小問集合"]],
      2: ["電磁気", "電磁気と回路に関する大問。", ["電磁気", "回路", "電流"]],
      3: ["波動", "波動分野の基本事項と応用を扱う大問。", ["波動", "干渉", "音波"]],
      4: ["力学・熱", "力学と熱・エネルギーに関する総合大問。", ["力学", "エネルギー", "熱"]]
    },
    rows: [
      [1, "", "問1", 1, "1", 5], [1, "", "問2", 2, "3", 5], [1, "", "問3", 3, "3", 5], [1, "", "問4", 4, "2", 5], [1, "", "問5", 5, "2", 5], [1, "", "問6", 6, "4", 5],
      [2, "A", "問1", 7, "2", 5], [2, "A", "問2", 8, "3", 5], [2, "B", "問3(1)", 9, "4", 2], [2, "B", "問3(2)", 10, "3", 3], [2, "B", "問4", 11, "6", 5],
      [3, "A", "問1", 12, "1", 4], [3, "A", "問2", 13, "7", 4], [3, "B", "問3", 14, "4", 5], [3, "B", "問4", 15, "6", 5],
      [4, "A", "問1", 16, "4", 4], [4, "A", "問2", 17, "3", 4], [4, "A", "問3", 18, "1", 4], [4, "A", "問4", 19, "2", 4], [4, "B", "問5", 20, "6", 4], [4, "B", "問6", 21, "3", 4], [4, "C", "問7", 22, "8", 4, "2,5,7,9を解答した場合は1点。"], [4, "C", "問8", 23, "1", 4]
    ]
  },
  {
    year: 2012,
    units: {
      1: ["小問集合", "波の速さ、電流の磁場、運動方程式、波の屈折、熱量計算を扱う小問集合。", ["波の速さ", "磁場", "運動方程式", "屈折", "熱量"]],
      2: ["電磁気", "電流と磁場、電磁誘導、電流と抵抗を扱う大問。", ["電流", "磁場", "電磁誘導", "抵抗"]],
      3: ["波動", "回折格子による光の干渉と気柱共鳴を扱う大問。", ["回折格子", "光の干渉", "気柱共鳴"]],
      4: ["力学・気体の状態変化", "弾性力、力学的エネルギー、摩擦、気体の状態変化を扱う大問。", ["弾性力", "エネルギー保存", "摩擦", "気体"]]
    },
    rows: [
      [1, "", "問1", 1, "2", 5], [1, "", "問2", 2, "7", 5], [1, "", "問3", 3, "3", 5], [1, "", "問4", 4, "1", 5], [1, "", "問5", 5, "1", 5], [1, "", "問6", 6, "5", 5],
      [2, "A", "問1", 7, "1", 5], [2, "A", "問2", 8, "4", 5], [2, "B", "問3", 9, "3", 4], [2, "B", "問4", 10, "1", 4],
      [3, "A", "問1", 11, "2", 5], [3, "A", "問2", 12, "6", 5], [3, "B", "問3", 13, "2", 5], [3, "B", "問4", 14, "4", 5],
      [4, "A", "問1", 15, "3", 4], [4, "A", "問2", 16, "2", 5], [4, "B", "問3", 17, "6", 4], [4, "B", "問4", 18, "1", 5], [4, "B", "問5(1)", 19, "3", 3], [4, "B", "問5(2)", 20, "4", 3], [4, "C", "問6", 21, "3", 4], [4, "C", "問7", 22, "2", 4]
    ]
  }
];

function record(config, row, sequence) {
  const [major, middle, minor, answerNo, answer, points, note = ""] = row;
  const [unit, summary, keywords] = config.units[major];
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
    pdf_path: `https://www.toshin.com/center/${config.year}/q/butsuri.pdf`,
    image_path: "",
    notes: note || `出典: 東進 センター試験${config.year}解答速報。`
  };
}

function sourceRows(config) {
  const base = `https://www.toshin.com/center/${config.year}`;
  return [
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question", url: `${base}/q/butsuri.pdf`, local_path: `data/pdf/${config.year}_center_main_physics1.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer", url: `${base}/a/butsuri_ans.pdf`, local_path: `data/pdf/${config.year}_center_main_physics1_answer.pdf`, source_name: sourceName },
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
