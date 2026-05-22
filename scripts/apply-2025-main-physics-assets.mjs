import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const questionsPath = path.join(root, "data", "questions.json");
const cropsPath = path.join(root, "data", "image-crops.json");
const manifestPath = path.join(root, "worklogs", "2025-main-physics-question-assets-manifest.json");

const targetPrefix = /^2025_common_main_physics_a\d+$/;

const summaries = {
  "2025_common_main_physics_a01": "山頂で密閉した空気をふもとへ持ってきたときの体積変化から、理想気体の状態方程式で山頂の大気圧を表す。",
  "2025_common_main_physics_a02": "地表の重力を地球との万有引力で表し、地球質量を万有引力定数・地球半径・重力加速度から見積もる。",
  "2025_common_main_physics_a03": "正方形板にはたらく三つの力の合力について、大きさ・向き・作用線を図から選ぶ。",
  "2025_common_main_physics_a04": "電子が電場・磁場のある領域を通過する状況で、電場と磁場を片方ずつ消したときの出口での速さを比較する。",
  "2025_common_main_physics_a05": "電子のド・ブロイ波長と結晶面による反射条件から、電子線回折に関わる式の組合せを選ぶ。",
  "2025_common_main_physics_a06": "小振幅の単振り子で、接線方向の復元力を角度または変位の近似を用いて表す。",
  "2025_common_main_physics_a07": "単振り子の変位を時刻の関数として表し、角振動数を重力加速度と振り子の長さで表す。",
  "2025_common_main_physics_a08": "振り子の周期測定で、手動操作による一定の時間遅れが周期の見積もりに与える誤差と測定回数の効果を判断する。",
  "2025_common_main_physics_a09": "光センサーの電圧波形から、振り子の周期に対応する時間間隔を選ぶ。",
  "2025_common_main_physics_a10": "地球の自転による遠心力を考慮し、極と赤道で測定される重力加速度の違いを式で表す。",
  "2025_common_main_physics_a11": "理想気体の定積変化と定圧変化から、A→B→Cで気体が外部にした仕事を求める。",
  "2025_common_main_physics_a12": "pV図で与えられた理想気体の状態変化を、温度と体積のグラフに変換して選ぶ。",
  "2025_common_main_physics_a13": "理想気体をCからAへ戻す二つの過程について、内部エネルギー変化と吸収熱の大小関係を判断する。",
  "2025_common_main_physics_a14": "点Pで観測された波の変位の時間グラフから、波の振動数と振幅を読み取る。",
  "2025_common_main_physics_a15": "二つの波源による合成波と一方の波源の波から、もう一方の波源が点Pに作る変位の時間変化を選ぶ。",
  "2025_common_main_physics_a16": "同位相の二つの波源からの波が点Pで強め合う条件を、到達時間差と経路差で表す。",
  "2025_common_main_physics_a17": "一様磁場中を動く導体棒に生じる誘導起電力の大きさと、回路を閉じた直後の電流の向きを判断する。",
  "2025_common_main_physics_a18": "コンデンサーを含む導体棒回路で、スイッチを閉じた後に一定速度を保つための外力の時間変化を選ぶ。",
  "2025_common_main_physics_a19": "導体棒回路で外力の仕事、コンデンサーのエネルギー増加、ジュール熱の関係をエネルギー保存で表す。",
  "2025_common_main_physics_a20": "導体棒回路で十分時間が経った後のコンデンサー蓄積エネルギーと抵抗で発生したジュール熱を求める。",
  "2025_common_main_physics_a21": "充電後のコンデンサーを含む導体棒回路で、スイッチを再び閉じた直後の電流の向きと導体棒の運動を判断する。",
  "2025_common_main_physics_a22": "コイルを含む導体棒回路で、十分時間が経って電流が一定になったときの誘導起電力を判断する。",
  "2025_common_main_physics_a23": "コイルを含む導体棒回路で、スイッチを閉じた後に一定速度を保つための外力の時間変化を選ぶ。",
  "2025_common_main_physics_a24": "電流の時間変化グラフの初期接線の傾きと誘導起電力から、コイルの自己インダクタンスを表す。"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function pageLabel(cropRows) {
  const pages = [...new Set(cropRows.map((row) => row.page).filter(Boolean))].sort((a, b) => a - b);
  if (pages.length === 0) return "";
  if (pages.length === 1) return String(pages[0]);
  return `${pages[0]}-${pages[pages.length - 1]}`;
}

function compactText(text) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const questions = readJson(questionsPath);
const crops = readJson(cropsPath);
const manifest = readJson(manifestPath);

const manifestById = new Map();
for (const record of manifest.records) {
  manifestById.set(record.id, record);
}

let updated = 0;
for (const question of questions) {
  if (!targetPrefix.test(question.id)) continue;
  const record = manifestById.get(question.id);
  if (!record) {
    throw new Error(`Missing manifest record for ${question.id}`);
  }

  question.image_paths = record.image_paths;
  question.image_path = record.image_paths[0] ?? "";
  question.masked_problem_text = compactText(record.masked_problem_text);
  question.problem_text_status = "pdfium-question-marker-slice";
  question.problem_text_source = "2025-main-physics-question-marker-crop";
  question.summary = summaries[question.id] ?? question.summary;
  const pages = pageLabel(record.crop_rows);
  if (pages) question.page = pages;
  updated += 1;
}

if (updated !== 24) {
  throw new Error(`Expected 24 updated questions, got ${updated}`);
}

const nextCrops = crops.filter((row) => !targetPrefix.test(row.question_id));
for (const record of manifest.records) {
  for (const row of record.crop_rows) {
    nextCrops.push(row);
  }
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
fs.writeFileSync(cropsPath, `${JSON.stringify(nextCrops, null, 2)}\n`, "utf8");

console.log(`updated_questions=${updated}`);
console.log(`updated_crop_rows=${nextCrops.length - crops.filter((row) => !targetPrefix.test(row.question_id)).length}`);
