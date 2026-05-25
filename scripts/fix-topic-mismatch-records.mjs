import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";

const updates = {
  "2024_common_makeup_physics_basic_a01": {
    unit: "熱・潜熱",
    keywords: ["熱", "潜熱", "状態変化", "冷却", "凝固"],
    summary: "水を冷却したとき温度が一定になる区間について、液体から固体への状態変化と潜熱を判断する。",
  },
  "2024_common_makeup_physics_basic_a02": {
    unit: "波・自由端反射",
    keywords: ["波", "自由端反射", "反射", "波形", "波の進行"],
    summary: "自由端で反射する波について、反射後の波形と進行距離を時刻から判断する。",
  },
  "2024_common_makeup_physics_basic_a03": {
    unit: "波・気柱共鳴",
    keywords: ["波", "気柱共鳴", "開管", "閉管", "振動数"],
    summary: "長さの異なる開管と閉管について、はじめて共鳴する振動数が等しくなる管を判断する。",
  },
  "2024_common_makeup_physics_basic_a04": {
    unit: "電気・豆電球回路",
    keywords: ["電気", "直流回路", "豆電球", "電流", "明るさ"],
    summary: "豆電球を組み合わせた直流回路で、各豆電球の明るさを電流の流れ方から比較する。",
  },
  "2024_common_makeup_physics_basic_a07": {
    unit: "力学・静止摩擦係数",
    keywords: ["力学", "静止摩擦", "摩擦係数", "斜面", "力のつり合い"],
    summary: "斜面を傾けたときに物体がすべり始める条件から、静止摩擦係数を臨界角で表す。",
  },
  "2024_common_makeup_physics_basic_a08": {
    unit: "力学・摩擦力",
    keywords: ["力学", "静止摩擦", "動摩擦", "摩擦力", "斜面"],
    summary: "斜面角を大きくするとき、静止摩擦力と動摩擦力の大きさが角度にどう依存するかを判断する。",
  },
  "2024_common_makeup_physics_basic_a11": {
    unit: "エネルギー・火力発電",
    keywords: ["エネルギー", "火力発電", "化石燃料", "熱エネルギー", "電気エネルギー"],
    summary: "火力発電について、化石燃料の化学エネルギー利用、二酸化炭素排出、エネルギー変換の正誤を判断する。",
  },
  "2024_common_makeup_physics_basic_a12": {
    unit: "エネルギー・原子力発電",
    keywords: ["エネルギー", "原子力発電", "核分裂", "中性子", "連鎖反応"],
    summary: "原子力発電で原子核の核分裂が中性子により連鎖的に起こることを判断する。",
  },
  "2024_common_makeup_physics_basic_a13": {
    unit: "電気・電力と電力量",
    keywords: ["電気", "電力", "電力量", "電流", "充電"],
    summary: "電気自動車の充電について、電圧と電力から電流を求め、電力量と充電時間を判断する。",
  },
  "2024_common_makeup_physics_basic_a16": {
    unit: "力学・エネルギー変換",
    keywords: ["力学", "エネルギー", "回生ブレーキ", "力学的エネルギー", "電気エネルギー", "発電"],
    summary: "坂道を下る電気自動車の力学的エネルギー減少から、回生ブレーキで変換された電気エネルギーを求める。",
  },
  "2024_common_makeup_physics_basic_a17": {
    unit: "力学・エネルギー変換",
    keywords: ["力学", "エネルギー", "回生ブレーキ", "力学的エネルギー", "電気エネルギー", "有効数字"],
    summary: "回生ブレーキで変換された電気エネルギーを科学的記数法で表し、係数の各桁を選ぶ。",
  },
  "2023_common_makeup_physics_a01": {
    unit: "力学・万有引力と仕事",
    keywords: ["力学", "万有引力", "仕事率", "エネルギー保存", "彗星"],
    summary: "太陽のまわりを運動する彗星について、万有引力のする仕事率の符号と各点での速さの大小を判断する。",
  },
  "2023_common_makeup_physics_a03": {
    unit: "熱・熱機関",
    keywords: ["熱", "熱機関", "熱効率", "内部エネルギー", "仕事", "pVグラフ"],
    summary: "理想気体の熱機関サイクルで、内部エネルギー変化と仕事の表から吸収熱量と熱効率を求める。",
  },
  "2023_common_makeup_physics_a04": {
    unit: "原子・ド・ブロイ波",
    keywords: ["原子", "ド・ブロイ波", "物質波", "電子", "陽子", "運動量"],
    summary: "同じ電圧で加速した電子と陽子について、運動量とド・ブロイ波長の関係を判断する。",
  },
  "2023_common_makeup_physics_a05": {
    unit: "波動・光の屈折",
    keywords: ["波動", "光の屈折", "屈折率", "見かけの深さ", "近似"],
    summary: "水中のコインを真上から見るとき、屈折による見かけの深さを小角近似で表す。",
  },
  "2019_center_main_physics_a12": {
    unit: "波動・光の屈折",
    keywords: ["波動", "光の屈折", "屈折率", "見かけの位置", "光路"],
    summary: "透明な板を通る光の屈折について、観測者から見た点の見かけの位置と光路を判断する。",
  },
  "2019_center_main_physics_a13": {
    unit: "波動・光の屈折",
    keywords: ["波動", "光の屈折", "屈折率", "見かけの位置", "光路"],
    summary: "透明な壁を通して見る相手の位置について、屈折による見かけの位置関係を判断する。",
  },
  "2024_common_makeup_physics_a12": {
    unit: "波動・音速と次元解析",
    keywords: ["波動", "音速", "次元解析", "気体", "状態方程式"],
    summary: "圧力と密度の単位から音速と同じ次元の量を選び、気体の状態方程式と音速の関係につなげる。",
  },
  "2022_common_main_physics_a24": {
    unit: "原子・ボーア模型",
    keywords: ["原子", "ボーア模型", "エネルギー準位", "円運動", "ド・ブロイ波", "量子条件"],
    summary: "水素原子のボーア模型で、電子の円運動と量子条件から軌道半径とエネルギー準位を求める。",
  },
  "2018_center_main_physics_a09": {
    unit: "電磁気・電磁誘導と力のつり合い",
    keywords: ["電磁気", "電磁誘導", "コイル", "磁気力", "力のつり合い", "終端速度"],
    summary: "落下するコイルに生じる誘導電流と磁場から受ける力を考え、重力とのつり合いで一定速度を表す。",
  },
  "2015_center_main_physics_a09": {
    unit: "電磁気・荷電粒子と円運動",
    keywords: ["電磁気", "荷電粒子", "ローレンツ力", "円運動", "サイクロトロン"],
    summary: "磁場中で加速される荷電粒子について、ローレンツ力による円運動の半径と速さを表す。",
  },
  "2011_center_main_physics1_a15": {
    unit: "波動・音波の干渉",
    keywords: ["物理I", "波動", "音波の干渉", "経路差", "弱め合い", "波長"],
    summary: "二つの同位相の音源からの音波が弱め合う条件を、経路差と波長の関係で表す。",
  },
  "2006_center_main_physics1_a09": {
    unit: "原子・陰極線",
    keywords: ["物理I", "原子", "陰極線", "電子", "X線", "放射線"],
    summary: "陰極線の実体が電子であることを、赤外線・原子核・X線などとの違いから判断する。",
  },
  "2025_common_main_physics_a08": {
    unit: "力学・単振り子の周期測定",
    keywords: ["力学", "単振り子", "周期", "測定誤差", "ストップウォッチ"],
    summary: "単振り子の周期測定で、手動操作による一定の時間遅れが周期の見積もりに与える誤差と測定回数の効果を判断する。",
  },
  "2025_common_main_physics_a09": {
    unit: "力学・単振り子の周期測定",
    keywords: ["力学", "単振り子", "周期", "光センサー", "電圧波形"],
    summary: "光センサーの電圧波形から、単振り子の周期に対応する時間間隔を選ぶ。",
  },
  "2025_common_makeup_physics_a18": {
    unit: "原子・光電効果と電位",
    keywords: ["原子", "光電効果", "光電子", "電位", "減速電圧"],
    summary: "光電効果の実験で、減速電圧が加えられた平行極板間の電位分布グラフを選ぶ。",
  },
  "2025_common_makeup_physics_a19": {
    unit: "原子・光電効果と電場",
    keywords: ["原子", "光電効果", "光電子", "電場", "静電気力の仕事"],
    summary: "光電効果で飛び出した光電子が減速電場中を進むとき、静電気力のする仕事の符号と大きさを判断する。",
  },
  "2025_common_makeup_physics_a20": {
    unit: "原子・光電効果とエネルギー保存",
    keywords: ["原子", "光電効果", "光電子", "電場", "エネルギー保存"],
    summary: "初速度をもつ光電子が減速電場中を進む状況を、運動エネルギーと静電気力の仕事の関係で表す。",
  },
  "2006_center_main_physics1_a02": {
    unit: "波動・フィゾーの実験",
    keywords: ["物理I", "波動", "フィゾーの実験", "光速測定", "歯車", "反射"],
    summary: "回転する歯車と遠方の鏡を用いたフィゾーの光速測定で、歯数と回転数から歯車と鏡の距離を求める。",
  },
};

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
let touched = 0;

for (const question of questions) {
  const update = updates[question.id];
  if (!update) continue;
  Object.assign(question, update);
  touched += 1;
}

writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
console.log(`updated records: ${touched}`);
