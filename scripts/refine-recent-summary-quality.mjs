import fs from 'node:fs';

const questionsPath = 'data/questions.json';

const patches = {
  '2023_common_makeup_physics_basic_a03': {
    summary: '氷を加熱して水になり沸騰するまでの温度と加えた熱量の関係を、比熱と融解熱からグラフで判断する。',
  },
  '2022_common_main_physics_a21': {
    summary: '傾けた板を台車が通過する実験で、コイルを通る時間の変化から誘導起電力の時間変化グラフを判断する。',
  },
  '2022_common_main_physics_basic_a09': {
    summary: '抵抗値が与えられたドライヤーを一定時間動かしたときの電力量を、電力と時間から求める。',
  },
  '2020_center_main_physics_basic_a01': {
    summary: '3本の同じばねで支えた軽い棒に物体をつるし、全体の力のつり合いからばねの伸びを求める。',
  },
  '2020_center_main_physics_basic_a03': {
    summary: '交流送電で変圧器により電圧を高くすると、送電線で失われる電力がどう変わるかを判断する。',
  },
  '2020_center_main_physics_basic_a04': {
    summary: '振動数の異なる二つのおんさによるうなりについて、うなりの周期と波の重ね合わせの考え方を問う。',
  },
  '2020_center_main_physics_basic_a07': {
    summary: '互いに逆向きに進む二つのパルス波について、指定位置での変位の時間変化を重ね合わせで判断する。',
  },
  '2020_center_main_physics_basic_a09': {
    summary: 'スイッチで接続を切り替える抵抗回路について、合成抵抗と回路全体の消費電力の変化を判断する。',
  },
  '2020_center_main_physics_basic_a11': {
    summary: 'ゴムひもについた小球が最下点に達する状況で、重力による位置エネルギーと弾性エネルギーの関係を問う。',
  },
  '2019_center_main_physics_basic_a02': {
    summary: 'なめらかな面と摩擦のある面を通る小物体について、速度変化を等速運動と等加速度運動で表す。',
  },
  '2019_center_main_physics_basic_a03': {
    summary: '電磁波を周波数の小さい順に並べ、赤外線・可視光線・紫外線・X線などの分類を判断する。',
  },
  '2019_center_main_physics_basic_a05': {
    summary: '電熱器で水を温める実験について、消費電力・時間・水の温度上昇から比熱を求める。',
  },
  '2019_center_main_physics_basic_a06': {
    summary: '同じ長さの開管と閉管で起こる気柱共鳴について、共鳴音の振動数を比較する。',
  },
  '2019_center_main_physics_basic_a14': {
    summary: '斜面上をすべる小物体について、重力と垂直抗力がする仕事を運動方向との関係から判断する。',
  },
  '2018_center_main_physics_a16': {
    summary: 'ばねにつながれた小物体をあらい水平面上で静かに放し、静止したままでいられる最大位置を静止摩擦から求める。',
  },
  '2018_center_main_physics_a23': {
    summary: '太陽を焦点とする惑星の楕円軌道について、近日点と遠日点での力学的エネルギーと速さを比較する。',
  },
  '2018_center_main_physics_basic_a06': {
    summary: '二つの波の合成波の時間変化グラフとうなりの周期を、重ね合わせから判断する。',
  },
  '2018_center_main_physics_basic_a10': {
    summary: '台車から鉛直上向きに打ち出した小球について、最高点に達する時刻を鉛直方向の運動から求める。',
  },
  '2018_center_main_physics_basic_a11': {
    summary: '一定速度で動く台車から小球を打ち出したとき、最高点の高さと水平移動距離を運動の分解で判断する。',
  },
  '2018_center_main_physics_basic_a13': {
    summary: '糸でつながれた複数の物体を運動させ、物体を一体として見たときの加速度を運動方程式から求める。',
  },
  '2017_center_main_physics_a10': {
    summary: 'ダイオードを含むコイル回路で磁束密度を時間変化させ、整流作用を踏まえて電圧を求める。',
  },
  '2017_center_main_physics_a11': {
    summary: 'くさび形空気層で反射した二つの光の干渉について、明線間隔を波長とすき間の傾きから求める。',
  },
  '2017_center_main_physics_basic_a06': {
    summary: '弦にできる定常波について、波の速さと腹が二つの振動の振動数を波長との関係から求める。',
  },
  '2017_center_main_physics_basic_a07': {
    summary: '弦楽器とおんさのうなりから、うなりの回数と弦の張力変化を使っておんさの振動数を判断する。',
  },
  '2017_center_main_physics_basic_a09': {
    summary: '二つの抵抗を接続した直流回路について、短絡部分の有無を踏まえて各回路の電流を求める。',
  },
  '2017_center_main_physics_basic_a12': {
    summary: '糸でつながった物体A・Bの等加速度運動について、運動方程式から糸の張力を求める。',
  },
  '2017_center_main_physics_basic_a13': {
    summary: '同じ速さで運動する物体A・Bについて、質量の違いから運動エネルギーの比を求める。',
  },
  '2016_center_main_physics_a13': {
    summary: '薄膜内で反射した光が往復する時間を、膜厚・屈折率・光速から式で表す。',
  },
  '2016_center_main_physics_a14': {
    summary: '薄膜による反射光の干渉について、膜厚と単色光の波長の関係および色の違いを判断する。',
  },
  '2016_center_main_physics_a19': {
    summary: '二つの容器に入った理想気体について、状態方程式から開く前の圧力比を求める。',
  },
  '2016_center_main_physics_a20': {
    summary: 'コックを開いて二つの容器内の気体が混合した後の圧力を、全物質量と全体積から求める。',
  },
  '2016_center_main_physics_a22': {
    summary: '光電効果について、光子のエネルギーと仕事関数から放出電子の運動エネルギーを表す。',
  },
  '2016_center_main_physics_basic_a06': {
    summary: '縦波の変位分布から波長を読み取り、波の速さとの関係で振動数を求める。',
  },
  '2016_center_main_physics_basic_a08': {
    summary: '変圧器の一次・二次コイルの巻数比から、二次側に生じる交流電圧を求める。',
  },
  '2016_center_main_physics_basic_a10': {
    summary: 'ばねで押し出された小物体が水平面を離れて運動するとき、力学的エネルギー保存から速さを求める。',
  },
  '2016_center_main_physics_basic_a11': {
    summary: 'ばねで押し出された小物体が点Aに達する高さを、力学的エネルギー保存から求める。',
  },
  '2016_center_main_physics_basic_a12': {
    summary: '地面から鉛直上向きに投げ上げた小物体について、最高点に達する時刻を求める。',
  },
  '2016_center_main_physics_basic_a13': {
    summary: '鉛直投げ上げされた小物体の高さと時刻の関係を、等加速度運動のグラフとして判断する。',
  },
  '2015_center_main_physics_a06': {
    summary: 'ダイオードを含む交流回路について、整流後のCD間電圧の時間変化を判断する。',
  },
  '2015_center_main_physics_a11': {
    summary: '平面波が境界面で屈折するとき、境界上の山の間隔が共通になることから波長と角度の関係を導く。',
  },
  '2015_center_main_physics_a13': {
    summary: '二つの水面波源の一方をずらしたとき、強め合いの場所が弱め合いに変わる条件を経路差で判断する。',
  },
  '2015_center_main_physics_a18': {
    summary: '二つのばねにつながれた小球をゆっくり引き上げ、重力による位置エネルギーと弾性エネルギーの変化を求める。',
  },
  '2015_center_main_physics_a20': {
    summary: '気体の断熱・等温・定圧圧縮の各過程について、pVグラフの面積から外部がする仕事を比較する。',
  },
  '2015_center_main_physics_a21': {
    summary: '断熱・等温・定圧圧縮の各過程を、温度と体積の関係を表すグラフに対応させる。',
  },
  '2015_center_main_physics_a23': {
    summary: 'ラザフォード模型の問題点とボーア模型の仮定について、定常状態と光子の放出・吸収を判断する。',
  },
  '2015_center_main_physics_basic_a06': {
    summary: '実線と破線で示された正弦波のグラフから、波の進行方向と移動距離を読み取る。',
  },
  '2015_center_main_physics_basic_a08': {
    summary: '抵抗を直列・並列に接続した回路について、指定された抵抗を流れる電流を求める。',
  },
  '2015_center_main_physics_basic_a11': {
    summary: 'ばねを伸ばすときに両端から加えた力がした仕事を、弾性エネルギーの変化として求める。',
  },
  '2014_center_main_physics1_a13': {
    unit: '波動・ドップラー効果',
    keywords: ['物理I', '波動', 'ドップラー効果', '波長', '振動数', '波源'],
    common_summary: 'ベルトコンベア上の箱の間隔を波動に見立て、ドップラー効果との対応を扱う。',
    summary: '作業者と箱の運動を波源と観測者に対応させ、ドップラー効果で変化する波長・振動数を判断する。',
  },
  '2012_center_main_physics1_a15': {
    unit: '力学・ばねとエネルギー保存',
    keywords: ['物理I', '力学', 'ばね', '弾性エネルギー', '力学的エネルギー保存', '運動エネルギー'],
    summary: 'ばねでつながれた小物体が自然長の位置に達した瞬間の運動エネルギーを、力学的エネルギー保存から求める。',
  },
  '2012_center_main_physics1_a16': {
    unit: '力学・ばねと運動',
    keywords: ['物理I', '力学', 'ばね', '弾性力', '加速度', '運動方程式'],
    summary: 'ばねの弾性力を受けて動く小物体について、位置と加速度の大きさの関係グラフを判断する。',
  },
  '2012_center_main_physics1_a17': {
    unit: '力学・エネルギー保存',
    keywords: ['物理I', '力学', '力学的エネルギー保存', '速さ', '斜面'],
    summary: '小物体が点Pから出発して点Aを初めて通過するときの速さを、力学的エネルギー保存から求める。',
  },
  '2012_center_main_physics1_a18': {
    unit: '力学・仕事とエネルギー',
    keywords: ['物理I', '力学', '仕事', '摩擦', '力学的エネルギー', '斜面'],
    summary: '摩擦を受ける区間を通過した小物体が斜面を上るとき、到達する高さをエネルギー収支から求める。',
  },
  '2012_center_main_physics1_a19': {
    unit: '力学・仕事とエネルギー',
    keywords: ['物理I', '力学', '仕事', '摩擦', '力学的エネルギー', '往復運動'],
    summary: '摩擦で力学的エネルギーを失いながら往復する小物体について、静止するまでの通過回数を求める。',
  },
  '2012_center_main_physics1_a20': {
    unit: '力学・仕事とエネルギー',
    keywords: ['物理I', '力学', '仕事', '摩擦', '力学的エネルギー', '静止位置'],
    summary: '摩擦で力学的エネルギーを失いながら往復する小物体について、最終的に静止する位置を求める。',
  },
  '2012_center_main_physics1_a21': {
    unit: '熱・気体の状態方程式',
    keywords: ['物理I', '熱', '気体', '状態方程式', '圧力', '体積'],
    summary: '気体を閉じ込めた容器で栓が外れる直前の体積を、圧力条件と気体の状態方程式から求める。',
  },
  '2012_center_main_physics1_a22': {
    unit: '熱・気体の状態変化',
    keywords: ['物理I', '熱', '気体', '状態変化', '熱の移動', '温度'],
    summary: '気体容器に対する二つの操作について、容器内部と外部の間で熱がどちら向きに移動するかを判断する。',
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
