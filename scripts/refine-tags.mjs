import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";

const broadTags = ["力学", "波動", "電磁気", "熱", "原子", "物理基礎", "物理I", "小問集合", "探究"];

const inferenceRules = [
  { tag: "力学", patterns: [/力学/, /運動/, /速度/, /加速度/, /力のつり合い/, /つり合い/, /運動方程式/, /仕事/, /エネルギー/, /運動量/, /衝突/, /ばね/, /摩擦/, /円運動/, /斜面/, /投射/, /重心/, /浮力/, /張力/] },
  { tag: "波動", patterns: [/波動/, /波/, /音/, /光/, /干渉/, /屈折/, /反射/, /回折/, /共鳴/, /定常波/, /うなり/, /ドップラー/, /弦/, /レンズ/, /鏡/] },
  { tag: "電磁気", patterns: [/電磁気/, /電気/, /電場/, /電位/, /電流/, /電圧/, /抵抗/, /回路/, /コンデンサー/, /磁場/, /磁界/, /電磁誘導/, /コイル/, /ダイオード/, /交流/, /送電/, /変圧器/, /静電気/] },
  { tag: "熱", patterns: [/熱/, /温度/, /比熱/, /熱量/, /熱容量/, /潜熱/, /気体/, /理想気体/, /状態方程式/, /内部エネルギー/, /pV/, /P-V/, /ボイル/, /シャルル/] },
  { tag: "原子", patterns: [/原子/, /放射線/, /原子核/, /核/, /X線/, /光電効果/, /電子/, /光子/, /半減期/, /質量欠損/, /結合エネルギー/, /ボーア/, /ラザフォード/, /素粒子/, /ニホニウム/] },
  { tag: "ドップラー効果", patterns: [/ドップラー/] },
  { tag: "ドップラー", patterns: [/ドップラー効果/] },
  { tag: "音源", patterns: [/音源/] },
  { tag: "反射板", patterns: [/反射板/] },
  { tag: "うなり", patterns: [/うなり/] },
  { tag: "気柱共鳴", patterns: [/気柱共鳴/, /気柱の共鳴/] },
  { tag: "共鳴", patterns: [/共鳴/] },
  { tag: "定常波", patterns: [/定常波/] },
  { tag: "弦の振動", patterns: [/弦の振動/, /弦/] },
  { tag: "光の干渉", patterns: [/光の干渉/, /光波の干渉/, /ヤング/, /ニュートンリング/, /薄膜/, /回折格子/] },
  { tag: "薄膜干渉", patterns: [/薄膜/] },
  { tag: "ヤングの実験", patterns: [/ヤング/] },
  { tag: "ニュートンリング", patterns: [/ニュートンリング/] },
  { tag: "回折格子", patterns: [/回折格子/] },
  { tag: "屈折", patterns: [/屈折/] },
  { tag: "全反射", patterns: [/全反射/] },
  { tag: "レンズ", patterns: [/レンズ/] },
  { tag: "球面鏡", patterns: [/球面鏡/] },
  { tag: "波のグラフ", patterns: [/波形/, /正弦波/, /縦波/, /y-xグラフ/, /グラフ.*波/] },
  { tag: "縦波", patterns: [/縦波/] },
  { tag: "正弦波", patterns: [/正弦波/] },
  { tag: "波長", patterns: [/波長/] },
  { tag: "振動数", patterns: [/振動数/] },
  { tag: "運動方程式", patterns: [/運動方程式/] },
  { tag: "力のつり合い", patterns: [/力のつり合い/, /つり合い/] },
  { tag: "力のモーメント", patterns: [/力のモーメント/, /剛体/] },
  { tag: "剛体", patterns: [/剛体/] },
  { tag: "仕事", patterns: [/仕事/] },
  { tag: "力学的エネルギー保存", patterns: [/力学的エネルギー保存/, /エネルギー保存/] },
  { tag: "エネルギー保存", patterns: [/力学的エネルギー保存/, /エネルギー保存/] },
  { tag: "運動量保存", patterns: [/運動量保存/, /衝突/] },
  { tag: "運動量", patterns: [/運動量/] },
  { tag: "力積", patterns: [/力積/] },
  { tag: "衝突", patterns: [/衝突/] },
  { tag: "弾性衝突", patterns: [/弾性衝突/] },
  { tag: "単振動", patterns: [/単振動/, /ばね振り子/] },
  { tag: "ばね", patterns: [/ばね/, /フックの法則/] },
  { tag: "フックの法則", patterns: [/フックの法則/] },
  { tag: "摩擦", patterns: [/摩擦/] },
  { tag: "円運動", patterns: [/円運動/] },
  { tag: "回転", patterns: [/回転/, /円運動/, /力のモーメント/, /剛体/] },
  { tag: "等速円運動", patterns: [/等速円運動/] },
  { tag: "慣性力", patterns: [/慣性力/] },
  { tag: "斜面", patterns: [/斜面/] },
  { tag: "水平投射", patterns: [/水平投射/] },
  { tag: "斜方投射", patterns: [/斜方投射/] },
  { tag: "鉛直投げ上げ", patterns: [/鉛直投げ上げ/, /投げ上げ/] },
  { tag: "放物運動", patterns: [/水平投射/, /斜方投射/, /投げ上げ/] },
  { tag: "空気抵抗", patterns: [/空気抵抗/, /終端速度/] },
  { tag: "終端速度", patterns: [/終端速度/] },
  { tag: "浮力", patterns: [/浮力/] },
  { tag: "重心", patterns: [/重心/] },
  { tag: "万有引力", patterns: [/万有引力/, /惑星/] },
  { tag: "惑星運動", patterns: [/惑星/] },
  { tag: "電場", patterns: [/電場/] },
  { tag: "電位", patterns: [/電位/] },
  { tag: "電流", patterns: [/電流/] },
  { tag: "電圧", patterns: [/電圧/] },
  { tag: "抵抗", patterns: [/抵抗/] },
  { tag: "直流回路", patterns: [/直流回路/] },
  { tag: "交流", patterns: [/交流/] },
  { tag: "送電", patterns: [/送電/] },
  { tag: "変圧器", patterns: [/変圧器/] },
  { tag: "ジュール熱", patterns: [/ジュール熱/] },
  { tag: "電力", patterns: [/電力/, /消費電力/] },
  { tag: "コンデンサー", patterns: [/コンデンサー/] },
  { tag: "電気容量", patterns: [/電気容量/, /コンデンサー/] },
  { tag: "静電エネルギー", patterns: [/静電エネルギー/] },
  { tag: "静電気力", patterns: [/静電気力/] },
  { tag: "電気力線", patterns: [/電気力線/] },
  { tag: "電磁誘導", patterns: [/電磁誘導/, /誘導起電力/, /レンツ/] },
  { tag: "誘導起電力", patterns: [/誘導起電力/] },
  { tag: "レンツの法則", patterns: [/レンツ/] },
  { tag: "ローレンツ力", patterns: [/ローレンツ力/] },
  { tag: "フレミング左手の法則", patterns: [/フレミング左手/] },
  { tag: "ダイオード", patterns: [/ダイオード/] },
  { tag: "整流", patterns: [/整流/] },
  { tag: "サイクロトロン", patterns: [/サイクロトロン/] },
  { tag: "荷電粒子", patterns: [/荷電粒子/] },
  { tag: "理想気体", patterns: [/理想気体/] },
  { tag: "状態方程式", patterns: [/状態方程式/] },
  { tag: "ボイル・シャルルの法則", patterns: [/ボイル/, /シャルル/] },
  { tag: "熱力学第一法則", patterns: [/熱力学第?一?1?法則/, /熱力学第一法則/] },
  { tag: "内部エネルギー", patterns: [/内部エネルギー/] },
  { tag: "pVグラフ", patterns: [/pVグラフ/, /P-Vグラフ/, /p-Vグラフ/] },
  { tag: "熱サイクル", patterns: [/熱サイクル/, /サイクル/] },
  { tag: "熱効率", patterns: [/熱効率/] },
  { tag: "比熱", patterns: [/比熱/] },
  { tag: "熱容量", patterns: [/熱容量/] },
  { tag: "潜熱", patterns: [/潜熱/] },
  { tag: "断熱変化", patterns: [/断熱/] },
  { tag: "等温変化", patterns: [/等温/] },
  { tag: "定圧変化", patterns: [/定圧/] },
  { tag: "気体分子運動論", patterns: [/気体分子/] },
  { tag: "光電効果", patterns: [/光電効果/] },
  { tag: "仕事関数", patterns: [/仕事関数/] },
  { tag: "阻止電圧", patterns: [/阻止電圧/] },
  { tag: "X線", patterns: [/X線/] },
  { tag: "放射線", patterns: [/放射線/] },
  { tag: "原子核", patterns: [/原子核/] },
  { tag: "半減期", patterns: [/半減期/] },
  { tag: "質量欠損", patterns: [/質量欠損/] },
  { tag: "結合エネルギー", patterns: [/結合エネルギー/] },
  { tag: "ボーア模型", patterns: [/ボーア/] },
  { tag: "ド・ブロイ波", patterns: [/ド・ブロイ/, /物質波/] },
  { tag: "ラザフォード散乱", patterns: [/ラザフォード/] },
  { tag: "素粒子", patterns: [/素粒子/] },
  { tag: "ニホニウム", patterns: [/ニホニウム/] },
  { tag: "探究", patterns: [/探究/, /実験/, /測定/, /データ/] },
  { tag: "グラフ", patterns: [/グラフ/] },
  { tag: "有効数字", patterns: [/有効数字/] }
];

const lowTypicalityPatterns = [
  /ニホニウム/,
  /素粒子/,
  /サイクロトロン/,
  /ラザフォード/,
  /音源が単振動/,
  /斜方投射.*物理基礎/,
  /新元素/
];

const mediumTypicalityPatterns = [
  /小問集合/,
  /探究/,
  /実験/,
  /測定/,
  /部分点/,
  /反射板/,
  /熱サイクル/,
  /複数分野/,
  /力学・熱/,
  /波動・電気/,
  /力学・熱力学/,
  /ドップラー/
];

function textFor(question) {
  return [
    question.subject,
    question.unit,
    question.summary,
    question.notes,
    ...(question.keywords ?? [])
  ].join(" ");
}

function normalizeKeyword(keyword) {
  return String(keyword ?? "")
    .trim()
    .replaceAll("Ｐ", "P")
    .replaceAll("Ｖ", "V")
    .replaceAll("ｐ", "p")
    .replaceAll("ｖ", "v")
    .replace(/熱力学第1法則/g, "熱力学第一法則")
    .replace(/Ｐ-Ｖ|P-V|p-V/g, "pV")
    .replace(/ドップラー$/g, "ドップラー効果");
}

function uniqueKeywords(keywords) {
  const seen = new Set();
  const result = [];
  for (const rawKeyword of keywords) {
    const keyword = normalizeKeyword(rawKeyword);
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
  }
  return result;
}

function inferKeywords(question) {
  const text = textFor(question);
  const inferred = [];
  if (question.subject === "物理基礎") inferred.push("物理基礎");
  if (question.subject === "物理I") inferred.push("物理I");
  if (question.major_no === 1 && /小問集合/.test(text)) inferred.push("小問集合");
  for (const rule of inferenceRules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      inferred.push(rule.tag);
    }
  }
  return inferred;
}

function sortKeywords(keywords) {
  return [...keywords].sort((a, b) => {
    const broadA = broadTags.indexOf(a);
    const broadB = broadTags.indexOf(b);
    const rankA = broadA === -1 ? 100 : broadA;
    const rankB = broadB === -1 ? 100 : broadB;
    return rankA - rankB || a.localeCompare(b, "ja");
  });
}

function refineTypicality(question) {
  const text = textFor(question);
  if (lowTypicalityPatterns.some((pattern) => pattern.test(text))) return "低";
  if (mediumTypicalityPatterns.some((pattern) => pattern.test(text))) return "中";
  return "高";
}

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
let touched = 0;

for (const question of questions) {
  const before = JSON.stringify({
    keywords: question.keywords,
    typicality: question.typicality
  });
  question.keywords = sortKeywords(uniqueKeywords([...(question.keywords ?? []), ...inferKeywords(question)]));
  question.typicality = refineTypicality(question);
  const after = JSON.stringify({
    keywords: question.keywords,
    typicality: question.typicality
  });
  if (before !== after) touched += 1;
}

writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
console.log(`refined records: ${touched}`);
