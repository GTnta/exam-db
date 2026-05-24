import fs from 'node:fs';

const questionsPath = 'data/questions.json';

const patches = {
  '2022_common_main_physics_basic_a13': {
    summary:
      '水中に入れたスプーンにはたらく重力と浮力を比較し、浮力の大小と物体の沈み方を判断する。',
  },
  '2016_center_main_physics_a18': {
    summary:
      '加速する台上の小物体がすべらない条件を、ばねの縮みから生じる加速度と最大静止摩擦力の関係で判断する。',
  },
  '2015_center_main_physics_a15': {
    summary:
      '水平に投げた小球が壁ではね返って床に落ちる運動について、鉛直方向の自由落下から時間を表す。',
  },
  '2014_center_main_physics1_a07': {
    summary:
      '交流電圧をオシロスコープで観測した波形から、電圧の最大値と周期を目盛りで読み取る。',
  },
  '2014_center_main_physics1_a15': {
    summary:
      '閉管の共鳴で次数を保ったまま管内の波長が変わるとき、音速・波長・振動数の関係から振動数の比を求める。',
  },
  '2014_center_main_physics1_a16': {
    summary:
      '軽い棒の両端に物体と容器をつるした装置で、棒の回転に伴う各物体の運動方程式から加速度を求める。',
  },
  '2014_center_main_physics1_a19': {
    summary:
      '容器と砂をつり下げた軽い棒が水平につりあう条件から、重心まわりの力のモーメントと張力の比を判断する。',
  },
  '2014_center_main_physics1_a20': {
    summary:
      '液体を追加して気体部分の長さと液面差が変化した状態で、液柱による圧力差から閉じ込められた気体の圧力を表す。',
  },
  '2013_center_main_physics1_a21': {
    summary:
      '小物体が複数の区間を進んで点Qに達するまでの距離を、各区間の等加速度運動に基づいて時間変化グラフで判断する。',
  },
  '2008_center_main_physics1_a17': {
    summary:
      '一定時間だけ走行して停止する救急車のサイレンについて、ドップラー効果により観測される振動数の時間幅を求める。',
    keywords: ['物理I', '波動', 'ドップラー効果', '音波', '振動数', '救急車'],
  },
};

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
let updated = 0;

for (const question of questions) {
  const patch = patches[question.id];
  if (!patch) continue;
  Object.assign(question, patch);
  updated += 1;
}

const missing = Object.keys(patches).filter(
  (id) => !questions.some((question) => question.id === id),
);
if (missing.length) {
  throw new Error(`Missing question ids: ${missing.join(', ')}`);
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
console.log(`Updated ${updated} question records.`);
