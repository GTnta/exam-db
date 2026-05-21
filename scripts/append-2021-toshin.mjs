import { readFileSync, writeFileSync } from "node:fs";

const questionsPath = "data/questions.json";
const sourcesPath = "data/sources.json";

const physicsPdf = "https://www.toshin.com/kyotsutest/2021/data/375/butsuri.pdf";
const physicsAnswerPdf = "https://www.toshin.com/kyotsutest/2021/data/354/butsuri_ans.pdf";
const basicPdf = "https://www.toshin.com/kyotsutest/2021/data/249/butsuri-kiso.pdf";
const basicAnswerPdf = "https://www.toshin.com/kyotsutest/2021/data/265/butsuri-kiso_ans.pdf";

function q(id, subject, major, middle, minor, answerNo, unit, keywords, summary, answer, points, notes = "") {
  return {
    id,
    year: 2021,
    exam_system: "common",
    session: "main",
    subject,
    major_no: major,
    middle_no: middle,
    minor_no: minor,
    answer_no: String(answerNo),
    unit,
    keywords,
    typicality: keywords.includes("難問") ? "低" : keywords.includes("探究") || keywords.includes("考察") ? "中" : "高",
    summary,
    answer: String(answer),
    points,
    correct_rate: null,
    page: "",
    pdf_path: subject === "物理" ? physicsPdf : basicPdf,
    image_path: "",
    notes: notes || "出典: 東進 共通テスト解答速報2021。"
  };
}

const physics = [
  q("2021_common_main_physics_a01", "物理", 1, "", "問1", 1, "力学・慣性力", ["慣性力", "重力", "見かけの重力", "加速度"], "加速度運動する系で、慣性力と重力の合力を見かけの重力として扱う小問。", 4, 5),
  q("2021_common_main_physics_a02", "物理", 1, "", "問2", 2, "力学・力のつり合い", ["ロープ", "張力", "重力", "力のつり合い"], "全重力を複数のロープで支える状況から、張力の大きさを判断する。", 5, 5),
  q("2021_common_main_physics_a03", "物理", 1, "", "問3", 3, "電磁気・電場", ["電場", "電位差", "平行板", "極板間隔"], "極板間の電位差が等しいとき、間隔の狭さで電場の強さが決まることを判断する。", 2, 5),
  q("2021_common_main_physics_a04", "物理", 1, "", "問4", 4, "波動・ドップラー効果とうなり", ["ドップラー", "うなり", "音波", "振動数"], "ドップラー効果とうなりを組み合わせ、観測される振動数の変化を定性的に判断する。", 1, 5),
  q("2021_common_main_physics_a05", "物理", 1, "", "問5", 5, "熱・断熱変化", ["断熱変化", "等温変化", "pVグラフ", "熱力学"], "等温曲線と断熱曲線の勾配の違い、同じ圧力での最終状態を判断する。", 2, 5, "1を解答した場合は3点。"),
  q("2021_common_main_physics_a06", "物理", 2, "A", "問1", 6, "電磁気・抵抗回路", ["抵抗", "コンデンサー", "電位差", "対称性"], "対称な抵抗回路で電位差が0の部分を導線とみなし、電流を求める。", 3, 2),
  q("2021_common_main_physics_a07", "物理", 2, "A", "問1", 7, "電磁気・抵抗回路", ["抵抗", "コンデンサー", "電位差", "対称性"], "対称性を使った抵抗回路の電流計算で、関連する空欄を補う。", 3, null, "解答番号6で3を解答し、かつ全部正解の場合のみ点を与える。"),
  q("2021_common_main_physics_a08", "物理", 2, "A", "問1", 8, "電磁気・抵抗回路", ["抵抗", "電流", "対称性", "回路"], "導線で置き換えられる点と回路の対称性を用い、電流分布を判断する。", 0, null, "解答番号6で3を解答し、かつ全部正解の場合のみ点を与える。"),
  q("2021_common_main_physics_a09", "物理", 2, "A", "問1", 9, "電磁気・抵抗回路", ["抵抗", "電流", "対称性", "回路"], "対称な抵抗回路における電流値の空欄を補う。", 1, null, "解答番号6で3を解答し、かつ全部正解の場合のみ点を与える。"),
  q("2021_common_main_physics_a10", "物理", 2, "A", "問2", 10, "電磁気・コンデンサー", ["コンデンサー", "電位差", "電気量", "抵抗回路"], "電流が0の枝を断線状態とみなし、コンデンサーの電位差を求める。", 4, 3),
  q("2021_common_main_physics_a11", "物理", 2, "A", "問2", 11, "電磁気・コンデンサー", ["コンデンサー", "電気容量", "電荷", "電位差"], "電位差と電気容量からコンデンサーに蓄えられる電気量を求める。", 2, 3),
  q("2021_common_main_physics_a12", "物理", 2, "A", "問3", 12, "電磁気・ホイートストンブリッジ", ["ホイートストンブリッジ", "抵抗", "平衡条件", "回路"], "ホイートストンブリッジ回路の平衡条件を用いる。", 4, null, "解答番号12〜14は全部正解の場合のみ3点。"),
  q("2021_common_main_physics_a13", "物理", 2, "A", "問3", 13, "電磁気・ホイートストンブリッジ", ["ホイートストンブリッジ", "抵抗", "電位", "回路"], "ブリッジ回路で電流が流れない条件から抵抗比を判断する。", 0, null, "解答番号12〜14は全部正解の場合のみ3点。"),
  q("2021_common_main_physics_a14", "物理", 2, "A", "問3", 14, "電磁気・ホイートストンブリッジ", ["ホイートストンブリッジ", "抵抗", "回路", "平衡条件"], "ブリッジ平衡に関する残りの空欄を補う。", 1, null, "解答番号12〜14は全部正解の場合のみ3点。"),
  q("2021_common_main_physics_a15", "物理", 2, "B", "問4", 15, "電磁気・電磁誘導", ["導体棒", "一様磁場", "誘導起電力", "抵抗"], "一様磁場中で運動する導体棒について、単位長さあたりの抵抗値を考慮して回路量を求める。", 2, 4),
  q("2021_common_main_physics_a16", "物理", 2, "B", "問5", 16, "電磁気・電流が磁場から受ける力", ["導体棒", "磁場", "電流", "アンペール力"], "磁場中の電流が受ける力の向きと大きさを判断する。", 3, 4),
  q("2021_common_main_physics_a17", "物理", 2, "B", "問6", 17, "電磁気・運動量保存", ["導体棒", "電磁誘導", "運動量保存", "難問", "考察"], "二本の導体棒に同じ大きさで逆向きの力が働く場合の運動量保存と終状態を考察する。", 3, 4),
  q("2021_common_main_physics_a18", "物理", 3, "A", "問1", 18, "波動・屈折", ["屈折", "分散", "振動数", "波長", "ダイヤモンド"], "屈折で変化する量と変化しない量、分散による曲がり方を判断する。", 1, 4),
  q("2021_common_main_physics_a19", "物理", 3, "A", "問2", 19, "波動・全反射", ["屈折", "全反射", "臨界角", "ダイヤモンド"], "屈折の法則と臨界角を用いて全反射の条件を判断する。", 2, 4),
  q("2021_common_main_physics_a20", "物理", 3, "A", "問3", 20, "波動・全反射", ["全反射", "臨界角", "ダイヤモンド", "光路"], "ダイヤモンド内の光路で、入射角が臨界角より大きい面で全反射することを判断する。", 4, 4),
  q("2021_common_main_physics_a21", "物理", 3, "A", "問3", 21, "波動・全反射", ["全反射", "光路", "屈折", "考察"], "図で示された光路の意味を読み取り、全反射後の進み方を判断する。", 1, 4),
  q("2021_common_main_physics_a22", "物理", 3, "B", "問4", 22, "原子・蛍光灯", ["蛍光灯", "電場", "電子", "電磁気"], "蛍光灯内の電子運動を、原子知識ではなく電磁気の知識から判断する。", 2, 4),
  q("2021_common_main_physics_a23", "物理", 3, "B", "問5", 23, "原子・励起", ["水銀原子", "励起", "衝突", "エネルギー損失"], "水銀原子の励起を、衝突でエネルギーが失われるモデルとして考える。", 1, 5),
  q("2021_common_main_physics_a24", "物理", 3, "B", "問6", 24, "原子・励起", ["水銀原子", "励起", "電子", "エネルギー"], "電子の運動エネルギーが励起により変化する状況を判断する。", 6, 5),
  q("2021_common_main_physics_a25", "物理", 4, "", "問1", 25, "力学・放物運動", ["放物運動", "速度成分", "重力加速度", "野球"], "放物線運動における水平・鉛直方向の速度成分を判断する。", 4, 5),
  q("2021_common_main_physics_a26", "物理", 4, "", "問2", 26, "力学・運動量保存", ["運動量保存", "水平方向", "ボール", "捕球"], "水平方向に外力が無視できる条件で運動量保存則を適用する。", 3, 5),
  q("2021_common_main_physics_a27", "物理", 4, "", "問3", 27, "力学・完全非弾性衝突", ["完全非弾性衝突", "運動量保存", "捕球", "衝突"], "ボールの捕球を完全非弾性衝突とみなし、衝突後の速度を求める。", 1, 5),
  q("2021_common_main_physics_a28", "物理", 4, "", "問4", 28, "力学・衝突と撃力", ["撃力", "弾性衝突", "運動量変化", "衝突"], "衝突における撃力と弾性衝突の意味を用いて力積や速度変化を判断する。", 4, 5, "3を解答した場合は3点。")
];

const basic = [
  q("2021_common_main_physics_basic_a01", "物理基礎", 1, "", "問1", 1, "力学・力の図示", ["力の描図", "垂直抗力", "重力", "接触力"], "木片にはたらく重力、床やリンゴから受ける力の向きを図で判断する。", 4, 4),
  q("2021_common_main_physics_basic_a02", "物理基礎", 1, "", "問2", 2, "電気・静電気力", ["静電気力", "電荷", "引力", "斥力"], "同符号の電荷は斥力、異符号の電荷は引力を及ぼすことを判断する。", 1, null, "解答番号2・3は両方正解の場合のみ4点。"),
  q("2021_common_main_physics_basic_a03", "物理基礎", 1, "", "問2", 3, "電気・静電気力", ["静電気力", "電荷", "引力", "斥力"], "複数の帯電体の間にはたらく静電気力の向きを判断する。", 8, null, "解答番号2・3は両方正解の場合のみ4点。"),
  q("2021_common_main_physics_basic_a04", "物理基礎", 1, "", "問3", 4, "波・電磁波", ["電磁波", "振動数", "エネルギー", "波長"], "電磁波について、振動数が大きいほどエネルギーが大きいことを判断する。", 6, 4),
  q("2021_common_main_physics_basic_a05", "物理基礎", 1, "", "問4", 5, "熱・温度", ["熱", "絶対温度", "温度", "正誤問題"], "熱に関する会話文の正誤を、絶対温度の定義などから判断する。", 2, 2),
  q("2021_common_main_physics_basic_a06", "物理基礎", 1, "", "問4", 6, "熱・温度", ["熱", "絶対温度", "温度", "正誤問題"], "熱に関する会話文のもう一つの空欄を正誤判断で補う。", 5, 2),
  q("2021_common_main_physics_basic_a07", "物理基礎", 2, "A", "問1", 7, "波・音波", ["弦楽器", "音波", "波形", "倍音"], "弦楽器がつくる音波の波形グラフを読み取る。", 3, 3),
  q("2021_common_main_physics_basic_a08", "物理基礎", 2, "A", "問1", 8, "波・音波", ["弦楽器", "倍音", "波形", "音色"], "正弦波でない音波の波形を読み取り、倍音成分を判断する。", 5, 2, "解答番号7で3を解答した場合のみ5を正解として点を与える。"),
  q("2021_common_main_physics_basic_a09", "物理基礎", 2, "A", "問2", 9, "波・重ね合わせ", ["倍音", "重ね合わせ", "弦楽器", "波形"], "倍音の重ね合わせによって生じる波形を判断する。", 2, 4),
  q("2021_common_main_physics_basic_a10", "物理基礎", 2, "B", "問3", 10, "電気・変圧器", ["変圧器", "巻数比", "電圧", "交流"], "変圧器の一次・二次コイルの巻数比と電圧の関係を用いる。", 1, 3),
  q("2021_common_main_physics_basic_a11", "物理基礎", 2, "B", "問4", 11, "電気・送電", ["変圧器", "電流", "電力", "送電"], "電力が等しく保たれる条件で、電圧と電流の関係を判断する。", 4, 3),
  q("2021_common_main_physics_basic_a12", "物理基礎", 2, "B", "問5", 12, "電気・消費電力", ["消費電力", "抵抗率", "抵抗", "電流"], "図から必要な情報を読み取り、抵抗と消費電力を計算する。", 4, 3),
  q("2021_common_main_physics_basic_a13", "物理基礎", 3, "", "問1", 13, "力学・記録タイマー", ["記録タイマー", "平均の速さ", "台車", "実験"], "記録タイマーによる台車実験から平均の速さを求める。", 4, 3),
  q("2021_common_main_physics_basic_a14", "物理基礎", 3, "", "問2", 14, "力学・運動方程式", ["運動方程式", "台車", "加速度", "数値計算"], "運動方程式を立て、台車の加速度に関する数値を求める。", 0, null, "解答番号14〜16は全部正解の場合のみ3点。"),
  q("2021_common_main_physics_basic_a15", "物理基礎", 3, "", "問2", 15, "力学・運動方程式", ["運動方程式", "台車", "数値計算", "加速度"], "台車実験の数値計算で、加速度の桁を含む空欄を補う。", 3, null, "解答番号14〜16は全部正解の場合のみ3点。"),
  q("2021_common_main_physics_basic_a16", "物理基礎", 3, "", "問2", 16, "力学・運動方程式", ["運動方程式", "台車", "数値計算", "加速度"], "運動方程式に基づく計算結果の残りの空欄を補う。", 6, null, "解答番号14〜16は全部正解の場合のみ3点。"),
  q("2021_common_main_physics_basic_a17", "物理基礎", 3, "", "問3", 17, "力学・探究実験", ["記録タイマー", "運動方程式", "実験", "探究"], "計測データから、現象が生じた理由を運動方程式と実験条件の変化で判断する。", 2, 3),
  q("2021_common_main_physics_basic_a18", "物理基礎", 3, "", "問4", 18, "力学・実験データ処理", ["記録タイマー", "速さ", "距離", "数値計算"], "実験データを読み取り、指定された物理量を数値計算で求める。", 2, 3),
  q("2021_common_main_physics_basic_a19", "物理基礎", 3, "", "問5", 19, "力学・エネルギー", ["エネルギー", "台車", "仕事", "力学"], "エネルギーの基本知識を用いて、台車実験に関する記述を判断する。", 5, 4, "4を解答した場合は2点。")
];

const sourceEntries = [
  { year: 2021, exam_system: "common", session: "main", subject: "物理", kind: "question", url: physicsPdf, local_path: "data/pdf/2021_common_main_physics.pdf", source_name: "東進" },
  { year: 2021, exam_system: "common", session: "main", subject: "物理", kind: "answer", url: physicsAnswerPdf, local_path: "data/pdf/2021_common_main_physics_answer.pdf", source_name: "東進" },
  { year: 2021, exam_system: "common", session: "main", subject: "物理基礎", kind: "question", url: basicPdf, local_path: "data/pdf/2021_common_main_physics_basic.pdf", source_name: "東進" },
  { year: 2021, exam_system: "common", session: "main", subject: "物理基礎", kind: "answer", url: basicAnswerPdf, local_path: "data/pdf/2021_common_main_physics_basic_answer.pdf", source_name: "東進" }
];

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

const addedQuestions = appendUnique(questionsPath, [...physics, ...basic], (entry) => entry.id);
const addedSources = appendUnique(sourcesPath, sourceEntries, (entry) => `${entry.year}:${entry.session}:${entry.subject}:${entry.kind}:${entry.url}`);

console.log(`added questions: ${addedQuestions}`);
console.log(`added sources: ${addedSources}`);
