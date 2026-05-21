import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";
const sourcesPath = "data/sources.json";
const sourceName = "東進";

const configs = [
  {
    year: 2016,
    physics: {
      units: {
        1: ["小問集合", "斜方投射、誘電分極と静電誘導、正弦進行波、運動量保存、熱の移動を扱う小問集合。", ["斜方投射", "誘電分極", "波の式", "運動量保存", "熱量保存"]],
        2: ["電磁気", "コンデンサー回路と、電場・磁場中の荷電粒子運動を扱う。", ["コンデンサー", "電場", "磁場", "荷電粒子"]],
        3: ["波動", "音波の干渉とドップラー効果、薄膜による光の干渉を扱う。", ["音波", "ドップラー効果", "薄膜干渉"]],
        4: ["力学", "鉛直面内の円運動と、振動する台上での慣性力・摩擦力を扱う。", ["円運動", "単振動", "慣性力", "摩擦力"]],
        5: ["熱・熱力学", "理想気体の混合と内部エネルギーを扱う選択問題。", ["理想気体", "状態方程式", "内部エネルギー"]],
        6: ["原子・光電効果", "光電効果、阻止電圧、光電流を扱う選択問題。", ["光電効果", "阻止電圧", "仕事関数"]]
      },
      rows: [
        [1, "", "問1", 1, "1", 4], [1, "", "問2", 2, "1", 4], [1, "", "問3", 3, "4", 4], [1, "", "問4", 4, "4", 4], [1, "", "問5", 5, "5", 4],
        [2, "A", "問1", 1, "1", 5], [2, "A", "問2", 2, "2", 5], [2, "B", "問3(1)", 3, "3", 5], [2, "B", "問3(2)", 4, "5", 5], [2, "B", "問4", 5, "4", 5, "5,6を解答した場合は2点。"],
        [3, "A", "問1", 1, "2", 5], [3, "A", "問2", 2, "7", 5], [3, "B", "問3", 3, "6", 5], [3, "B", "問4", 4, "3", 5],
        [4, "A", "問1", 1, "6", 5], [4, "A", "問2", 2, "2", 5], [4, "B", "問3", 3, "5", 5], [4, "B", "問4", 4, "9", 5, "7,8を解答した場合は2点。"],
        [5, "", "問1", 1, "3", 5], [5, "", "問2", 2, "3", 5], [5, "", "問3", 3, "5", 5],
        [6, "", "問1", 1, "6", 5], [6, "", "問2", 2, "8", 5], [6, "", "問3", 3, "4", 5]
      ]
    },
    basic: {
      units: {
        1: ["小問集合", "力の合成、エネルギー変換、気体の圧力、自由端反射、電磁誘導を扱う小問集合。", ["力の合成", "エネルギー変換", "圧力", "自由端反射", "電磁誘導"]],
        2: ["波動・電気", "縦波のグラフと、変圧器・送電のしくみを扱う。", ["縦波", "変圧器", "送電"]],
        3: ["力学", "力学的エネルギー保存則と、鉛直投げ上げを扱う。", ["エネルギー保存", "鉛直投げ上げ", "グラフ"]]
      },
      rows: [
        [1, "", "問1", 1, "2", 4], [1, "", "問2", 2, "6", 4], [1, "", "問3", 3, "1", 4], [1, "", "問4", 4, "3", 4], [1, "", "問5", 5, "5", 4],
        [2, "A", "問1", 6, "1", 4], [2, "A", "問2", 7, "2", 4], [2, "B", "問3", 8, "5", 4], [2, "B", "問4", 9, "8", 3],
        [3, "A", "問1", 10, "5", 4], [3, "A", "問2", 11, "4", 4], [3, "B", "問3", 12, "2", 4], [3, "B", "問4", 13, "4", 3]
      ]
    }
  },
  {
    year: 2015,
    physics: {
      units: {
        1: ["小問集合", "波の回折、静電気力、単振動と摩擦、状態方程式、剛体のつり合いを扱う小問集合。", ["回折", "静電気力", "単振動", "状態方程式", "剛体"]],
        2: ["電磁気", "ダイオードの整流作用と、サイクロトロンによる荷電粒子の加速を扱う。", ["ダイオード", "交流", "サイクロトロン", "荷電粒子"]],
        3: ["波動", "平面波の屈折と水面波の干渉を扱う。", ["屈折", "平面波", "水面波", "干渉"]],
        4: ["力学", "水平投射と壁への衝突、2つのばねに連結された物体の運動を扱う。", ["水平投射", "反発係数", "ばね", "運動方程式"]],
        5: ["熱・熱力学", "断熱・等温・定圧圧縮に関する気体の状態変化を扱う選択問題。", ["断熱変化", "等温変化", "定圧変化"]],
        6: ["原子・原子構造", "ラザフォード散乱、ボーアの原子模型、量子条件を扱う選択問題。", ["ラザフォード散乱", "ボーア模型", "ド・ブロイ波"]]
      },
      rows: [
        [1, "", "問1", 1, "5", 4], [1, "", "問2", 2, "8", 4], [1, "", "問3", 3, "7", 4], [1, "", "問4", 4, "8", 4], [1, "", "問5", 5, "2", 4],
        [2, "A", "問1", 1, "5", 5], [2, "A", "問2", 2, "3", 5], [2, "B", "問3", 3, "1", 5], [2, "B", "問4", 4, "1", 5],
        [3, "A", "問1", 1, "6", 5], [3, "A", "問2", 2, "2", 5], [3, "B", "問3", 3, "6", 5], [3, "B", "問4", 4, "2", 5],
        [4, "A", "問1", 1, "2", 5], [4, "A", "問2", 2, "5", 5], [4, "A", "問3", 3, "5", 5], [4, "B", "問4", 4, "1", 5], [4, "B", "問5", 5, "6", 5],
        [5, "", "問1", 1, "2", 5], [5, "", "問2", 2, "6", 5], [5, "", "問3", 3, "8", 5],
        [6, "", "問1", 1, "3", 5], [6, "", "問2", 2, "4", 5], [6, "", "問3", 3, "6", 5]
      ]
    },
    basic: {
      units: {
        1: ["小問集合", "静電気の帯電、熱効率、等加速度運動、弦の振動、原子力発電を扱う小問集合。", ["静電気", "熱効率", "等加速度運動", "弦の振動", "原子力発電"]],
        2: ["波動・電気", "正弦波のグラフと、抵抗器の直列・並列接続を扱う。", ["正弦波", "抵抗", "直列接続", "並列接続"]],
        3: ["力学", "ばねに働く力と仕事、斜面上の等加速度運動を扱う。", ["ばね", "仕事", "斜面", "等加速度運動"]]
      },
      rows: [
        [1, "", "問1", 1, "3", 4], [1, "", "問2", 2, "5", 4], [1, "", "問3", 3, "2", 4], [1, "", "問4", 4, "2", 4], [1, "", "問5", 5, "7", 4],
        [2, "A", "問1", 6, "2", 4], [2, "A", "問2", 7, "4", 4], [2, "B", "問3", 8, "7", 4], [2, "B", "問4", 9, "7", 3],
        [3, "A", "問1", 10, "2", 4], [3, "A", "問2", 11, "5", 4], [3, "B", "問3", 12, "1", 4], [3, "B", "問4", 13, "6", 3]
      ]
    }
  }
];

function record(config, subject, slug, row, sequence) {
  const [major, middle, minor, answerNo, answer, points, note = ""] = row;
  const block = subject === "物理" ? config.physics : config.basic;
  const [unit, summary, keywords] = block.units[major];
  const fileName = slug === "physics" ? "butsuri" : "butsuri-kiso";
  return {
    id: `${config.year}_center_main_${slug}_a${String(sequence).padStart(2, "0")}`,
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
    typicality: decideTypicality(unit, keywords, note),
    summary: `${summary} ${minor}は${unit}に関する設問。`,
    answer: String(answer),
    points,
    correct_rate: null,
    page: "",
    pdf_path: `https://www.toshin.com/center/${config.year}/q/${fileName}.pdf`,
    image_path: "",
    notes: note || `出典: 東進 センター試験${config.year}解答速報。`
  };
}

function decideTypicality(unit, keywords, note) {
  if (note || keywords.includes("ドップラー効果") || keywords.includes("サイクロトロン") || keywords.includes("ラザフォード散乱")) return "中";
  if (unit === "小問集合") return "低";
  return "高";
}

function sourceRows(config, subject, slug) {
  const name = slug === "physics" ? "butsuri" : "butsuri-kiso";
  const base = `https://www.toshin.com/center/${config.year}`;
  return [
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question", url: `${base}/q/${name}.pdf`, local_path: `data/pdf/${config.year}_center_main_${slug}.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer", url: `${base}/a/${name}_ans.pdf`, local_path: `data/pdf/${config.year}_center_main_${slug}_answer.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question_page", url: `${base}/${name}_mondai_0.html`, local_path: "", source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "analysis", url: `${base}/${name}_shousai.html#analysis`, local_path: "", source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer_page", url: `${base}/${name}_ans.html`, local_path: "", source_name: sourceName }
  ];
}

const questions = [];
const sources = [];
for (const config of configs) {
  questions.push(...config.physics.rows.map((row, index) => record(config, "物理", "physics", row, index + 1)));
  questions.push(...config.basic.rows.map((row, index) => record(config, "物理基礎", "physics_basic", row, index + 1)));
  sources.push(...sourceRows(config, "物理", "physics"));
  sources.push(...sourceRows(config, "物理基礎", "physics_basic"));
}

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
  (entry.subject === "物理" || entry.subject === "物理基礎")
));
const registeredSources = replaceGenerated(sourcesPath, sources, (entry) => (
  targetYears.has(entry.year) &&
  entry.exam_system === "center" &&
  entry.session === "main" &&
  (entry.subject === "物理" || entry.subject === "物理基礎") &&
  entry.source_name === sourceName
));

console.log(`registered questions: ${registeredQuestions}`);
console.log(`registered sources: ${registeredSources}`);
