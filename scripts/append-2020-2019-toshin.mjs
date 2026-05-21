import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";
const sourcesPath = "data/sources.json";

const sourceName = "東進";

const configs = [
  {
    year: 2020,
    base: "https://www.toshin.com/center",
    physics: {
      questionPdf: "https://www.toshin.com/center/q/butsuri.pdf",
      answerPdf: "https://www.toshin.com/center/a/butsuri_ans.pdf",
      analysis: "https://www.toshin.com/center/butsuri_shousai.html#analysis",
      rows: [
        [1, "", "問1", 1, "力学・力のモーメント", ["力のモーメント", "つり合い", "小問集合"], "小問集合。力のモーメントやつり合いを用いて、回転しない条件を判断する。", "3", 5],
        [1, "", "問2", 2, "電磁気・電流と磁場", ["直線電流", "磁力線", "電流", "小問集合"], "小問集合。2本の直線電流がつくる磁場の向きと磁力線の重ね合わせを判断する。", "1", 5],
        [1, "", "問3", 3, "波動・音波の干渉", ["クインケ管", "音波", "干渉", "位相差"], "小問集合。クインケ管における経路差と干渉条件から音の強弱を判断する。", "4", 5],
        [1, "", "問4", 4, "熱・理想気体", ["理想気体", "状態変化", "pVグラフ", "小問集合"], "小問集合。理想気体の状態変化について、圧力・体積・温度や仕事の関係を判断する。", "3", 5, "4を解答した場合は3点。"],
        [1, "", "問5", 5, "力学・衝突", ["衝突", "運動量", "運動エネルギー", "小問集合"], "小問集合。2物体の衝突で運動量や運動エネルギーに関する記述を判断する。", "4", 5],
        [2, "A", "問1", 1, "電磁気・コンデンサー", ["コンデンサー", "直列接続", "並列接続", "電気容量"], "コンデンサー回路の接続を読み替え、合成容量や電荷の関係を判断する。", "4", 5],
        [2, "A", "問2", 2, "電磁気・コンデンサー", ["コンデンサー", "電気量", "電圧", "回路"], "コンデンサーの直列・並列接続について、電圧や蓄えられる電気量を求める。", "2", 5],
        [2, "B", "問3", 3, "電磁気・荷電粒子", ["荷電粒子", "磁場", "ローレンツ力", "電場"], "磁場中・電場中を運動する荷電粒子について、軌道や力の向きを組合せで判断する。", "5", 5],
        [2, "B", "問4", 4, "電磁気・荷電粒子", ["荷電粒子", "電場", "磁場", "等速円運動"], "荷電粒子の運動条件から、電場や磁場の影響を組合せで判断する。", "3", 5, "4を解答した場合は3点。"],
        [3, "A", "問1", 1, "波動・ドップラー効果", ["ドップラー効果", "水面波", "振動数", "周期"], "水面波のドップラー効果で、波源の運動に伴う波長や振動数の変化を判断する。", "3", 5],
        [3, "A", "問2", 2, "波動・ドップラー効果", ["ドップラー効果", "水面波", "波長", "グラフ"], "波源が動く水面波について、波長の変化を読み取り適切なグラフを選ぶ。", "2", 5],
        [3, "B", "問3", 3, "波動・光の干渉", ["ヤングの実験", "光の干渉", "明線", "波長"], "ヤングの実験で、明線間隔と光の波長・スリット間隔の関係を用いる。", "6", 5],
        [3, "B", "問4", 4, "波動・光の干渉", ["ニュートンリング", "光の干渉", "薄膜", "明暗"], "ニュートンリングの干渉条件から、明暗や半径の関係を判断する。", "7", 5, "8または9を解答した場合は3点。"],
        [4, "A", "問1", 1, "力学・衝突と円運動", ["衝突", "円運動", "力学的エネルギー", "運動量"], "小物体の衝突と鉛直円筒面内の運動について、保存則と運動条件を用いる。", "1", 5],
        [4, "A", "問2", 2, "力学・円運動", ["円運動", "垂直抗力", "力学的エネルギー", "向心力"], "鉛直円筒面内を運動する小物体について、エネルギー保存と向心力の条件を考える。", "3", 5],
        [4, "B", "問3", 3, "力学・ばねとつり合い", ["ばね", "つり合い", "弾性力", "運動方程式"], "鉛直ばねでつながれた2物体のつり合いを、力のつり合いの式から判断する。", "4", 5],
        [4, "B", "問4", 4, "力学・ばねと運動", ["ばね", "運動方程式", "単振動", "弾性力"], "鉛直ばねでつながれた2物体の運動を、運動方程式と力の関係から考える。", "4", 5],
        [5, "", "問1", 1, "熱・熱力学", ["熱力学", "浮力", "理想気体", "状態変化"], "選択問題。水槽中に浮かぶ円筒容器内の気体について、状態変化の条件を読む。", "1", 5],
        [5, "", "問2", 2, "熱・熱力学", ["熱力学", "仕事", "内部エネルギー", "理想気体"], "選択問題。気体の状態変化における仕事・熱・内部エネルギーの関係を考える。", "2", 5],
        [5, "", "問3", 3, "熱・熱力学", ["熱力学", "気体", "状態方程式", "浮力"], "選択問題。円筒容器と気体の状態変化を組み合わせ、必要な物理量を求める。", "3", 5],
        [6, "", "問1", 1, "原子・原子核", ["ニホニウム", "原子核", "放射性崩壊", "質量数"], "選択問題。新元素生成と放射性崩壊について、原子番号や質量数の変化を判断する。", "8", 5],
        [6, "", "問2", 2, "原子・結合エネルギー", ["結合エネルギー", "質量欠損", "原子核", "エネルギー"], "選択問題。原子核の結合エネルギーと質量欠損の関係を用いて考える。", "5", 5],
        [6, "", "問3", 3, "原子・放射線", ["放射線", "アルファ線", "ベータ線", "ガンマ線", "電場"], "選択問題。電場中のα線・β線・γ線の軌道を、電荷と質量の違いから判断する。", "6", 5]
      ]
    },
    basic: {
      questionPdf: "https://www.toshin.com/center/q/butsuri-kiso.pdf",
      answerPdf: "https://www.toshin.com/center/a/butsuri-kiso_ans.pdf",
      analysis: "https://www.toshin.com/center/butsuri-kiso_shousai.html#analysis",
      rows: [
        [1, "", "問1", 1, "力学・ばねとつり合い", ["ばね", "つり合い", "弾性力", "小問集合"], "小問集合。並列のばねと物体を一体として考え、力のつり合いを判断する。", "1", 4],
        [1, "", "問2", 2, "力学・等加速度運動", ["等加速度運動", "速度", "加速度", "小問集合"], "小問集合。等加速度運動の基本関係から速度や運動の様子を判断する。", "6", 4],
        [1, "", "問3", 3, "電気・交流送電", ["交流", "送電", "電力", "損失"], "小問集合。交流による送電の効率や電力損失について判断する。", "4", 4],
        [1, "", "問4", 4, "波・うなり", ["うなり", "音波", "振動数", "小問集合"], "小問集合。近い振動数の音が重なるときのうなりの回数を考える。", "3", 4, "4を解答した場合は2点。"],
        [1, "", "問5", 5, "熱・潜熱", ["潜熱", "融解熱", "状態変化", "熱"], "小問集合。潜熱や状態変化に関する語句・現象の正誤を判断する。", "2", 4],
        [2, "A", "問1", 6, "波・重ね合わせ", ["波の独立性", "重ね合わせ", "変位", "波形"], "互いに逆向きに進む波について、独立性と重ね合わせの原理を用いて考える。", "3", 4],
        [2, "A", "問2", 7, "波・重ね合わせ", ["重ね合わせ", "変位", "時間変化", "波形"], "変位の時間変化グラフに直して、波の重ね合わせ後の変位を判断する。", "5", 4],
        [2, "B", "問3", 8, "電気・抵抗回路", ["抵抗", "直流回路", "スイッチ", "電流"], "3つの抵抗と切り替えスイッチを含む直流回路で、電流や抵抗の関係を判断する。", "7", 3],
        [2, "B", "問4", 9, "電気・抵抗回路", ["抵抗", "電圧", "直流回路", "スイッチ"], "切り替えスイッチを含む抵抗回路について、各部の電圧や電流の変化を考える。", "8", 4],
        [3, "A", "問1", 10, "力学・エネルギー保存", ["ゴムひも", "弾性力", "力学的エネルギー", "仕事"], "ゴムひもの先端につけた小球を静かに放す運動を、力学的エネルギー保存で考える。", "5", 3],
        [3, "A", "問2", 11, "力学・エネルギー保存", ["ゴムひも", "弾性力", "力学的エネルギー", "位置エネルギー"], "ゴムひもの振る舞いを含む運動で、エネルギーの変化と速さを判断する。", "5", 4],
        [3, "B", "問3", 12, "力学・斜方投射", ["斜方投射", "運動方程式", "速度", "加速度"], "斜方投射について、与えられた誘導に沿って運動を分解して考える。", "6", 4],
        [3, "B", "問4", 13, "力学・斜方投射", ["斜方投射", "到達距離", "時間", "運動方程式"], "斜方投射の水平・鉛直方向の運動を組み合わせ、到達条件を判断する。", "3", 4]
      ]
    }
  },
  {
    year: 2019,
    base: "https://www.toshin.com/center/2019",
    physics: {
      questionPdf: "https://www.toshin.com/center/2019/q/butsuri.pdf",
      answerPdf: "https://www.toshin.com/center/2019/a/butsuri_ans.pdf",
      analysis: "https://www.toshin.com/center/2019/butsuri_shousai.html#analysis",
      rows: [
        [1, "", "問1", 1, "力学・運動量とエネルギー", ["運動量", "運動エネルギー", "正誤問題", "小問集合"], "小問集合。運動エネルギーと運動量に関する基本的な記述の正誤を判断する。", "2", 5],
        [1, "", "問2", 2, "電磁気・電場", ["点電荷", "電場", "重ね合わせ", "小問集合"], "小問集合。2つの点電荷による電場を重ね合わせ、向きや大きさを判断する。", "6", 5],
        [1, "", "問3", 3, "波動・レンズ", ["凸レンズ", "実像", "光学", "小問集合"], "小問集合。凸レンズによる像のでき方や光線の進み方を判断する。", "1", 5],
        [1, "", "問4", 4, "熱・理想気体", ["理想気体", "シリンダー", "状態変化", "熱"], "小問集合。シリンダー内の理想気体について、状態量の変化を考える。", "5", 5],
        [1, "", "問5", 5, "力学・単振動", ["単振動", "ばね", "周期", "小問集合"], "小問集合。ばねにつけられた小球の単振動の周期を判断する。", "4", 5],
        [2, "A", "問1", 1, "電磁気・ダイオード", ["ダイオード", "半導体", "電流", "回路"], "半導体ダイオードの基本性質を読み取り、電流の流れ方を判断する。", "3", 5],
        [2, "A", "問2", 2, "電磁気・ダイオード回路", ["ダイオード", "電気回路", "電圧", "電流"], "ダイオードを含む回路で、電圧や電流の変化を判断する。", "5", 5],
        [2, "B", "問3", 3, "電磁気・電磁誘導", ["電磁誘導", "導体棒", "磁場", "ローレンツ力"], "磁場中の平行レール上を動く導体棒について、誘導起電力や電流を考える。", "2", 5],
        [2, "B", "問4", 4, "電磁気・電磁誘導", ["電磁誘導", "導体棒", "磁場", "力"], "導体棒に流れる電流と磁場から、棒にはたらく力や運動を判断する。", "5", 5],
        [3, "A", "問1(1)", 1, "波動・光の屈折と干渉", ["屈折", "干渉", "光", "穴埋め"], "光の屈折と干渉に関する文章穴埋めで、現象と条件を正確に読み取る。", "1", 3],
        [3, "A", "問1(2)", 2, "波動・光の屈折と干渉", ["屈折", "干渉", "光", "穴埋め"], "光の屈折と干渉に関する文章穴埋めで、適切な語句や関係を選ぶ。", "3", 2],
        [3, "A", "問2(1)", 3, "波動・光の干渉", ["光の干渉", "経路差", "波長", "穴埋め"], "光の干渉条件を用いて、経路差や波長に関する空欄を補う。", "4", 2],
        [3, "A", "問2(2)", 4, "波動・光の干渉", ["光の干渉", "経路差", "波長", "穴埋め"], "光の干渉条件の読み替えから、残りの空欄を判断する。", "2", 3],
        [3, "B", "問3", 5, "波動・ドップラー効果", ["ドップラー効果", "音源", "単振動", "音波"], "音源が単振動するときのドップラー効果について、音源速度の変化を踏まえて考える。", "4", 5],
        [3, "B", "問4", 6, "波動・ドップラー効果", ["ドップラー効果", "音源", "単振動", "振動数"], "単振動する音源から観測される音の振動数変化を判断する。", "3", 5],
        [4, "A", "問1", 1, "力学・慣性力", ["慣性力", "加速度", "電車", "つり合い"], "一定加速度で動く電車内で、つるされたおもりに働く力と慣性力を考える。", "3", 5],
        [4, "A", "問2", 2, "力学・相対運動", ["慣性力", "放物運動", "加速度", "電車"], "加速する電車内で静かに放したボールの運動を、非慣性系で判断する。", "5", 5],
        [4, "B", "問3", 3, "力学・鉛直円運動", ["円運動", "張力", "力学的エネルギー", "小球"], "糸につながれた小球の鉛直面内の円運動で、エネルギー保存から運動を考える。", "5", 5],
        [4, "B", "問4", 4, "力学・鉛直円運動", ["円運動", "張力", "向心力", "力学的エネルギー"], "鉛直円運動する小球について、張力や速さの条件を判断する。", "6", 5],
        [5, "", "問1", 1, "熱・熱サイクル", ["熱サイクル", "内部エネルギー", "仕事", "熱力学第一法則"], "選択問題。熱サイクルの各過程について、温度変化・仕事・熱を判断する。", "1", 5],
        [5, "", "問2", 2, "熱・熱サイクル", ["熱サイクル", "pVグラフ", "仕事", "状態変化"], "選択問題。熱サイクルをグラフへ変換し、状態変化や仕事を読み取る。", "3", 5],
        [5, "", "問3", 3, "熱・熱サイクル", ["熱サイクル", "熱効率", "仕事", "理想気体"], "選択問題。熱機関のサイクルで、吸収熱・仕事・熱効率の関係を考える。", "6", 5],
        [6, "", "問1", 1, "原子・X線", ["X線", "X線管", "電子", "加速電圧"], "選択問題。X線管における電子の加速とX線の発生について判断する。", "1", 5],
        [6, "", "問2", 2, "原子・X線", ["X線", "最短波長", "加速電圧", "光子"], "選択問題。加速電圧とX線の最短波長の関係を考える。", "2", 5],
        [6, "", "問3", 3, "原子・X線", ["X線", "特性X線", "連続X線", "波長"], "選択問題。加速電圧や金属の種類によるX線スペクトルの変化を判断する。", "5", 5]
      ]
    },
    basic: {
      questionPdf: "https://www.toshin.com/center/2019/q/butsuri-kiso.pdf",
      answerPdf: "https://www.toshin.com/center/2019/a/butsuri-kiso_ans.pdf",
      analysis: "https://www.toshin.com/center/2019/butsuri-kiso_shousai.html#analysis",
      rows: [
        [1, "", "問1", 1, "力学・ばねの弾性力", ["ばね", "弾性力", "フックの法則", "小問集合"], "小問集合。ばねの弾性力と変位の関係を、フックの法則から判断する。", "2", 4],
        [1, "", "問2", 2, "力学・摩擦と速度変化", ["摩擦", "速度", "運動", "小問集合"], "小問集合。摩擦がある運動での速度変化や力の向きを判断する。", "2", 4],
        [1, "", "問3", 3, "波・電磁波", ["電磁波", "周波数", "分類", "知識問題"], "小問集合。電磁波の種類と周波数の大小関係を分類する。", "3", 4],
        [1, "", "問4", 4, "原子・放射線", ["原子", "放射線", "正誤問題", "知識問題"], "小問集合。原子と放射線に関する基本知識から、適切な記述を選ぶ。", "3", 4],
        [1, "", "問5", 5, "熱・比熱", ["比熱", "電力", "熱量", "小問集合"], "小問集合。電力と比熱の定義を用いて、温度変化や熱量を求める。", "4", 4],
        [2, "A", "問1", 6, "波・気柱共鳴", ["気柱共鳴", "定常波", "音波", "波長"], "気柱の共鳴で、管内にできる定常波の形から条件を判断する。", "2", 4],
        [2, "A", "問2", 7, "波・気柱共鳴", ["気柱共鳴", "音速", "波長", "振動数"], "ヘリウムガスで音速が変わるとき、共鳴する音波の波長や振動数を考える。", "7", 4],
        [2, "B", "問3", 8, "電気・直流回路", ["抵抗", "直流回路", "電流", "電圧"], "2つの抵抗と直流電源の回路で、電流や電圧の関係を判断する。", "4", 3],
        [2, "B", "問4", 9, "電気・直流回路", ["抵抗", "直流回路", "消費電力", "電圧"], "直流回路における抵抗値・電流・消費電力の関係を考える。", "3", 4, "4を解答した場合は2点。"],
        [3, "A", "問1", 10, "力学・運動方程式", ["運動方程式", "張力", "力", "加速度"], "複数物体の運動を、個々の物体に分けて運動方程式から考える。", "5", 4],
        [3, "A", "問2(1)", 11, "力学・仕事とエネルギー", ["仕事", "エネルギー", "運動方程式", "力学"], "仕事とエネルギーの関係を物体ごとに整理し、エネルギーの変化を判断する。", "2", 2],
        [3, "A", "問2(2)", 12, "力学・仕事とエネルギー", ["仕事", "エネルギー", "運動エネルギー", "力学"], "仕事と運動エネルギーの関係から、残りの空欄を補う。", "3", 2],
        [3, "B", "問3", 13, "力学・斜面上の運動", ["斜面", "エネルギー保存", "速さ", "到達時間"], "同じ高さから傾きの異なる斜面をすべる物体について、到達速度や時間を比較する。", "1", 4],
        [3, "B", "問4", 14, "力学・仕事", ["仕事", "垂直抗力", "斜面", "力"], "斜面上の運動で、運動方向に垂直な力が仕事をしないことを用いる。", "5", 3]
      ]
    }
  }
];

function makeRecord(config, subject, subjectSlug, questionPdf, row, sequence) {
  const [major, middle, minor, answerNo, unit, keywords, summary, answer, points, note = ""] = row;
  const index = String(sequence).padStart(2, "0");
  return {
    id: `${config.year}_center_main_${subjectSlug}_a${index}`,
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
    summary,
    answer: String(answer),
    points,
    correct_rate: null,
    page: "",
    pdf_path: questionPdf,
    image_path: "",
    notes: note || `出典: 東進 センター試験${config.year}解答速報。`
  };
}

function decideTypicality(unit, keywords, note) {
  if (note.includes("部分点") || keywords.includes("ドップラー効果") || keywords.includes("熱サイクル")) return "中";
  if (unit.includes("小問集合") || keywords.includes("知識問題")) return "低";
  return "高";
}

function sourceEntries(config, subject, block, questionPage, answerPage) {
  return [
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question", url: block.questionPdf, local_path: `data/pdf/${config.year}_center_main_${subject === "物理" ? "physics" : "physics_basic"}.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer", url: block.answerPdf, local_path: `data/pdf/${config.year}_center_main_${subject === "物理" ? "physics" : "physics_basic"}_answer.pdf`, source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "question_page", url: questionPage, local_path: "", source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "analysis", url: block.analysis, local_path: "", source_name: sourceName },
    { year: config.year, exam_system: "center", session: "main", subject, kind: "answer_page", url: answerPage, local_path: "", source_name: sourceName }
  ];
}

function appendUnique(path, entries, keyFn) {
  const current = JSON.parse(readFileSync(path, "utf8"));
  const keys = new Set(current.map(keyFn));
  let added = 0;
  for (const entry of entries) {
    const key = keyFn(entry);
    if (!keys.has(key)) {
      current.push(entry);
      keys.add(key);
      added += 1;
    }
  }
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  return added;
}

function replaceGeneratedQuestions(path, entries) {
  const current = JSON.parse(readFileSync(path, "utf8"));
  const targets = new Set(configs.map((config) => config.year));
  const filtered = current.filter((entry) => {
    return !(
      targets.has(entry.year) &&
      entry.exam_system === "center" &&
      entry.session === "main" &&
      (entry.subject === "物理" || entry.subject === "物理基礎")
    );
  });
  filtered.push(...entries);
  writeFileSync(path, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
  return current.length - filtered.length + entries.length;
}

function replaceGeneratedSources(path, entries) {
  const current = JSON.parse(readFileSync(path, "utf8"));
  const targets = new Set(configs.map((config) => config.year));
  const filtered = current.filter((entry) => {
    return !(
      targets.has(entry.year) &&
      entry.exam_system === "center" &&
      entry.session === "main" &&
      (entry.subject === "物理" || entry.subject === "物理基礎") &&
      entry.source_name === sourceName
    );
  });
  filtered.push(...entries);
  writeFileSync(path, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
  return current.length - filtered.length + entries.length;
}

const questionEntries = [];
const sourceRows = [];

for (const config of configs) {
  questionEntries.push(...config.physics.rows.map((row, index) => makeRecord(config, "物理", "physics", config.physics.questionPdf, row, index + 1)));
  questionEntries.push(...config.basic.rows.map((row, index) => makeRecord(config, "物理基礎", "physics_basic", config.basic.questionPdf, row, index + 1)));
  sourceRows.push(...sourceEntries(config, "物理", config.physics, `${config.base}/butsuri_mondai_0.html`, `${config.base}/butsuri_ans.html`));
  sourceRows.push(...sourceEntries(config, "物理基礎", config.basic, `${config.base}/butsuri-kiso_mondai_0.html`, `${config.base}/butsuri-kiso_ans.html`));
}

const addedQuestions = replaceGeneratedQuestions(questionsPath, questionEntries);
const addedSources = replaceGeneratedSources(sourcesPath, sourceRows);

console.log(`registered questions: ${addedQuestions}`);
console.log(`registered sources: ${addedSources}`);
