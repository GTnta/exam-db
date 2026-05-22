import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const qPath = 'data/questions.json';
const cPath = 'data/image-crops.json';
const qs = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const crops = JSON.parse(fs.readFileSync(cPath, 'utf8'));
const byId = new Map(qs.map((q) => [q.id, q]));

function copyIfExists(srcRel, dstRel) {
  const srcAbs = path.join(root, srcRel);
  const dstAbs = path.join(root, dstRel);
  if (!fs.existsSync(srcAbs)) return false;
  fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
  if (srcAbs !== dstAbs) fs.copyFileSync(srcAbs, dstAbs);
  return true;
}

function cloneAssets(targetId, sourceId, opts = {}) {
  const tq = byId.get(targetId);
  const sq = byId.get(sourceId);
  if (!tq || !sq) throw new Error(`missing ${targetId} ${sourceId}`);
  const sourcePaths = (sq.image_paths?.length ? sq.image_paths : [sq.image_path]).filter(Boolean);
  const newPaths = [];
  for (const srcRel of sourcePaths) {
    const dstRel = srcRel.replace(sourceId, targetId);
    copyIfExists(srcRel, dstRel);
    newPaths.push(dstRel);
  }
  tq.image_paths = newPaths;
  tq.image_path = newPaths[0] || tq.image_path;
  if (opts.copyText !== false) {
    tq.masked_problem_text = sq.masked_problem_text;
    tq.problem_text_status = 'manual-aligned-shared-question';
    tq.problem_text_source = `aligned-from:${sourceId}`;
  }
  const sourceRows = crops.filter((r) => r.question_id === sourceId);
  for (let i = crops.length - 1; i >= 0; i--) {
    if (crops[i].question_id === targetId) crops.splice(i, 1);
  }
  for (const row of sourceRows) {
    const nr = JSON.parse(JSON.stringify(row));
    nr.question_id = targetId;
    nr.output = String(nr.output || '').replace(sourceId, targetId);
    if (nr.image_path) nr.image_path = String(nr.image_path).replace(sourceId, targetId);
    nr.note = `${nr.note ? `${nr.note} ` : ''}Manually aligned from ${sourceId}.`;
    crops.push(nr);
  }
}

function update(id, fields) {
  const q = byId.get(id);
  if (!q) throw new Error(`missing ${id}`);
  Object.assign(q, fields);
}

// 2024 追試 物理基礎 第2問: 問4 is answers 8/9, 問5 is answer 10.
const q2024a09 = { ...byId.get('2024_common_makeup_physics_basic_a09') };
cloneAssets('2024_common_makeup_physics_basic_a09', '2024_common_makeup_physics_basic_a08');
update('2024_common_makeup_physics_basic_a09', {
  minor_no: '問4',
  unit: '力学・摩擦力',
  page: '11',
  summary: '斜面角を大きくするとき、静止摩擦力と動摩擦力の大きさが角度にどう依存するかを判断する。'
});
update('2024_common_makeup_physics_basic_a10', {
  minor_no: '問5',
  unit: '力学・仕事とエネルギー',
  page: '12-13',
  summary: '斜面をすべり下りる物体について、重力と動摩擦力の仕事および速さの角度依存を判断する。',
  masked_problem_text: q2024a09.masked_problem_text,
  problem_text_status: 'manual-aligned-shared-question',
  problem_text_source: 'aligned-from:2024_common_makeup_physics_basic_a09'
});
{
  const q = byId.get('2024_common_makeup_physics_basic_a10');
  const srcs = q2024a09.image_paths?.length ? q2024a09.image_paths : [q2024a09.image_path];
  q.image_paths = srcs.filter(Boolean).map((src) => {
    const dst = src.replace('2024_common_makeup_physics_basic_a09', q.id);
    copyIfExists(src, dst);
    return dst;
  });
  q.image_path = q.image_paths[0];
  for (let i = crops.length - 1; i >= 0; i--) if (crops[i].question_id === q.id) crops.splice(i, 1);
  for (const row of crops.filter((r) => r.question_id === '2024_common_makeup_physics_basic_a09')) {
    const nr = JSON.parse(JSON.stringify(row));
    nr.question_id = q.id;
    nr.output = String(q.image_path);
    nr.status = 'manual-aligned-question-crop';
    nr.note = 'Manually aligned to 問5 / answer 10.';
    crops.push(nr);
  }
}

// 2024 追試 物理基礎 第3問: 問3 is answers 13/14, 問4 is 15, 問5 is 16/17.
const q2024a14 = { ...byId.get('2024_common_makeup_physics_basic_a14') };
const q2024a15 = { ...byId.get('2024_common_makeup_physics_basic_a15') };
cloneAssets('2024_common_makeup_physics_basic_a14', '2024_common_makeup_physics_basic_a13');
update('2024_common_makeup_physics_basic_a14', {
  minor_no: '問3',
  unit: '電気・電力量',
  page: '17-18',
  summary: '電圧・電力・時間の関係から、充電時の電流と電力量を求める。'
});
update('2024_common_makeup_physics_basic_a15', {
  minor_no: '問4',
  unit: '電気・電力量とグラフ',
  page: '18',
  summary: '電力と時間のグラフの面積から充電電力量を読み取り、充電率の時間変化を判断する。',
  masked_problem_text: q2024a14.masked_problem_text,
  problem_text_status: 'manual-aligned-shared-question',
  problem_text_source: 'aligned-from:2024_common_makeup_physics_basic_a14'
});
{
  const q = byId.get('2024_common_makeup_physics_basic_a15');
  const srcs = q2024a14.image_paths?.length ? q2024a14.image_paths : [q2024a14.image_path];
  q.image_paths = srcs.filter(Boolean).map((src) => {
    const dst = src.replace('2024_common_makeup_physics_basic_a14', q.id);
    copyIfExists(src, dst);
    return dst;
  });
  q.image_path = q.image_paths[0];
}
update('2024_common_makeup_physics_basic_a16', {
  minor_no: '問5',
  unit: '電気・回生ブレーキ',
  page: '19',
  summary: '坂道を下る電気自動車の力学的エネルギー減少から、回生ブレーキで変換された電気エネルギーを求める。',
  masked_problem_text: q2024a15.masked_problem_text,
  problem_text_status: 'manual-aligned-shared-question',
  problem_text_source: 'aligned-from:2024_common_makeup_physics_basic_a15'
});
{
  const q = byId.get('2024_common_makeup_physics_basic_a16');
  const srcs = q2024a15.image_paths?.length ? q2024a15.image_paths : [q2024a15.image_path];
  q.image_paths = srcs.filter(Boolean).map((src) => {
    const dst = src.replace('2024_common_makeup_physics_basic_a15', q.id);
    copyIfExists(src, dst);
    return dst;
  });
  q.image_path = q.image_paths[0];
}
cloneAssets('2024_common_makeup_physics_basic_a17', '2024_common_makeup_physics_basic_a16');
update('2024_common_makeup_physics_basic_a17', {
  minor_no: '問5',
  unit: '電気・回生ブレーキ',
  page: '19',
  summary: '回生ブレーキで変換された電気エネルギーを科学的記数法で表し、係数の各桁を選ぶ。'
});

// 2023 追試 物理 第2問: 問1 is answers 6/7, 問2 is 8, 問3 is 9/10.
const q2023a07 = { ...byId.get('2023_common_makeup_physics_a07') };
const q2023a08 = { ...byId.get('2023_common_makeup_physics_a08') };
cloneAssets('2023_common_makeup_physics_a07', '2023_common_makeup_physics_a06');
update('2023_common_makeup_physics_a07', {
  minor_no: '問1',
  unit: '電磁気・相互誘導',
  page: '9-13',
  summary: '送電コイルと受電コイルの配置や電流条件を変えたとき、受電コイルの誘導起電力がどう変化するかを判断する。'
});
update('2023_common_makeup_physics_a08', {
  minor_no: '問2',
  unit: '電磁気・ダイオード回路',
  page: '11',
  summary: 'ダイオードを直列に入れた受電回路で、交流電圧が整流される波形を判断する。',
  masked_problem_text: q2023a07.masked_problem_text,
  problem_text_status: 'manual-aligned-shared-question',
  problem_text_source: 'aligned-from:2023_common_makeup_physics_a07'
});
{
  const q = byId.get('2023_common_makeup_physics_a08');
  const srcs = q2023a07.image_paths?.length ? q2023a07.image_paths : [q2023a07.image_path];
  q.image_paths = srcs.filter(Boolean).map((src) => {
    const dst = src.replace('2023_common_makeup_physics_a07', q.id);
    copyIfExists(src, dst);
    return dst;
  });
  q.image_path = q.image_paths[0];
}
update('2023_common_makeup_physics_a09', {
  minor_no: '問3',
  unit: '電磁気・整流回路',
  page: '12-13',
  summary: '複数のダイオードを用いた整流回路で電流の経路と抵抗で消費される電力の時間変化を判断する。',
  masked_problem_text: q2023a08.masked_problem_text,
  problem_text_status: 'manual-aligned-shared-question',
  problem_text_source: 'aligned-from:2023_common_makeup_physics_a08'
});
{
  const q = byId.get('2023_common_makeup_physics_a09');
  const srcs = q2023a08.image_paths?.length ? q2023a08.image_paths : [q2023a08.image_path];
  q.image_paths = srcs.filter(Boolean).map((src) => {
    const dst = src.replace('2023_common_makeup_physics_a08', q.id);
    copyIfExists(src, dst);
    return dst;
  });
  q.image_path = q.image_paths[0];
}
cloneAssets('2023_common_makeup_physics_a10', '2023_common_makeup_physics_a09');
update('2023_common_makeup_physics_a10', {
  minor_no: '問3',
  unit: '電磁気・整流回路',
  page: '12-13',
  summary: 'ダイオード整流回路で、入力交流に対する電力波形を選ぶ。'
});

// 2023 追試 物理 第4問: 問4 is answers 18/19, 問5 is 20.
const q2023a19 = { ...byId.get('2023_common_makeup_physics_a19') };
cloneAssets('2023_common_makeup_physics_a19', '2023_common_makeup_physics_a18');
update('2023_common_makeup_physics_a19', {
  minor_no: '問4',
  unit: '波動・干渉条件',
  page: '26-27',
  summary: '二つの波源からの波の重ね合わせについて、常に変位が0となる条件を式で判断する。'
});
update('2023_common_makeup_physics_a20', {
  minor_no: '問5',
  unit: '波動・干渉',
  page: '27',
  summary: '二つの波源から広がる波について、図上の点が常に弱め合うかを山・谷の重なりから判断する。',
  masked_problem_text: q2023a19.masked_problem_text,
  problem_text_status: 'manual-aligned-shared-question',
  problem_text_source: 'aligned-from:2023_common_makeup_physics_a19'
});
{
  const q = byId.get('2023_common_makeup_physics_a20');
  const srcs = q2023a19.image_paths?.length ? q2023a19.image_paths : [q2023a19.image_path];
  q.image_paths = srcs.filter(Boolean).map((src) => {
    const dst = src.replace('2023_common_makeup_physics_a19', q.id);
    copyIfExists(src, dst);
    return dst;
  });
  q.image_path = q.image_paths[0];
}

// 2016 センター 物理基礎 問2.
update('2016_center_main_physics_basic_a02', {
  unit: 'エネルギー・エネルギー変換',
  summary: '火力発電と風力発電について、燃料や空気がもつエネルギーがどの形のエネルギーとして利用されるかを判断する。',
  masked_problem_text: '問 2 火力発電では化石燃料のもつエネルギーを燃焼によって取り出し、発電機のタービンを回して電気エネルギーを得る。風力発電では空気のエネルギーを利用して風車を回し、電気エネルギーを得る。空欄ア・イに入るエネルギーの種類を判断する。',
  problem_text_status: 'manual-summary-search-text',
  problem_text_source: 'manual-from-image'
});
{
  const q = byId.get('2016_center_main_physics_basic_a02');
  const dst = 'data/images/questions/2016_center_main_physics_basic_a02_p1.jpg';
  copyIfExists('data/images/questions/2016_center_main_physics_basic_a01_p2.jpg', dst);
  q.image_path = dst;
  q.image_paths = [dst];
  for (let i = crops.length - 1; i >= 0; i--) if (crops[i].question_id === q.id) crops.splice(i, 1);
  crops.push({
    question_id: q.id,
    source_pdf: q.pdf_path,
    page: 2,
    pdf_page: 5,
    box: { x: 0.055, y: 0.42, width: 0.89, height: 0.53 },
    output: q.image_path,
    label: '',
    status: 'manual-aligned-question-crop',
    note: 'Manual crop source from adjacent OCR page; includes 問2.'
  });
}

// 2015 センター 物理 第4問A 問1.
update('2015_center_main_physics_a14', {
  unit: '力学・水平投射と反発',
  summary: '水平投射された小球が壁で反発して床に落ちる運動について、壁に当たるまでの時間を求める。',
  masked_problem_text: '問 1 小球を点Oから水平に速さv0で投げ、鉛直な壁面上の点Pではね返って床上の点Qに落ちる。壁までの距離Lから、投げてから点Pに当たるまでの時間を表す式を選ぶ。',
  problem_text_status: 'manual-summary-search-text',
  problem_text_source: 'manual-from-image'
});
{
  const q = byId.get('2015_center_main_physics_a14');
  const dst = 'data/images/questions/2015_center_main_physics_a14_p1.jpg';
  copyIfExists('data/images/questions/2015_center_main_physics_a15_p1.jpg', dst);
  q.image_path = dst;
  q.image_paths = [dst];
  for (let i = crops.length - 1; i >= 0; i--) if (crops[i].question_id === q.id) crops.splice(i, 1);
  crops.push({
    question_id: q.id,
    source_pdf: q.pdf_path,
    page: 17,
    pdf_page: 18,
    box: { x: 0.055, y: 0.035, width: 0.89, height: 0.91 },
    output: q.image_path,
    label: '',
    status: 'manual-aligned-question-crop',
    note: 'Manual crop source from adjacent OCR page; includes 問1.'
  });
}

fs.writeFileSync(qPath, `${JSON.stringify(qs, null, 2)}\n`);
fs.writeFileSync(cPath, `${JSON.stringify(crops, null, 2)}\n`);
console.log('manual alignment applied');
