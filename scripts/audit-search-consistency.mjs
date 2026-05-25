import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const outDir = path.join(root, 'worklogs');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

var domainSignals = {
  力学: ['力学', '運動', '力', '加速度', '速度', '仕事', 'エネルギー', '運動量', '衝突', '円運動', '単振動', '単振り子', 'ばね', '摩擦', 'モーメント', '浮力', '万有引力', '慣性力'],
  波動: ['波動', '波', '音', '光', '干渉', '屈折', '反射', '回折', '共鳴', 'レンズ', 'ドップラー', '気柱', '弦', 'ニュートンリング', 'ヤング'],
  電磁気: ['電磁気', '電気', '電荷', '電場', '電位', '電圧', '電流', '抵抗', '回路', '磁', 'コンデンサー', '誘導', '交流', '電力', '電力量'],
  熱: ['熱', '気体', '比熱', '温度', '状態方程式', '内部エネルギー', '熱力学', '断熱', '等温', 'pV', 'p-V', '熱機関', '熱効率'],
  原子: ['原子', '電子', '光子', 'X線', '放射線', '半減期', '原子核', '核', '光電効果', '物質波', 'ド・ブロイ', 'ボーア', 'エネルギー準位'],
};

const querySpecs = [
  domain('力学', ['力学', '運動', '力', 'つり合い', '運動方程式', '等加速度運動', '落下運動', '放物運動', '斜方投射', '水平投射', '慣性力', '遠心力', '円運動', '向心力', '万有引力', 'ケプラーの法則', '仕事', '仕事率', '力学的エネルギー保存', '運動量保存', '反発係数', '弾性衝突', '速度交換', '重心', '力のモーメント', '剛体', '浮力', 'アルキメデスの原理', '摩擦', '静止摩擦', '動摩擦', 'ばね', 'フックの法則', '単振動', '単振り子', 'ばね振り子']),
  domain('波動', ['波動', '波', '波長', '振動数', '周期', '波の速さ', '定常波', '定在波', '弦の振動', '気柱共鳴', '開管', '閉管', 'うなり', '音波', 'ドップラー', 'ドップラー効果', 'クインケ管', '干渉', 'ヤングの実験', '二重スリット', 'ニュートンリング', '薄膜干渉', '回折格子', '明線', '暗線', '光の屈折', '屈折', '全反射', '臨界角', '凸レンズ', 'レンズの公式', 'フィゾーの実験', '光速測定']),
  domain('電磁気', ['電磁気', '電気', '電荷', '静電気', '電場', '電界', '電位', '電圧', 'コンデンサー', '静電容量', '回路', '直流回路', '抵抗', 'オームの法則', 'ジュール熱', '電力', '電力量', 'キルヒホッフの法則', 'ブリッジ回路', 'ホイートストンブリッジ', '磁場', '磁界', 'ローレンツ力', '電磁誘導', '誘導起電力', 'レンツの法則', '交流', '変圧器', 'ダイオード']),
  domain('熱', ['熱', '熱量', '比熱', '熱容量', '温度', '熱平衡', '潜熱', '状態変化', '理想気体', '状態方程式', 'ボイルの法則', 'シャルルの法則', '気体分子運動論', '内部エネルギー', '熱力学第一法則', '断熱変化', '等温変化', '定圧変化', '定積変化', 'pVグラフ', 'p-Vグラフ', '熱機関', '熱効率']),
  domain('原子', ['原子', '電子', '原子核', '放射線', '半減期', 'α線', 'β線', 'γ線', 'X線', '光電効果', '光電子', '仕事関数', '物質波', 'ド・ブロイ波', 'ブラッグ反射', 'ボーア模型', 'エネルギー準位', '核反応', '核分裂', '核融合', '質量欠損', '結合エネルギー', '蛍光灯']),
  situation('力学', ['滑車', '斜面をすべる', 'なめらかな斜面', 'あらい斜面', '台車を押す', 'ばねでつながれた小球', '糸でつるした小球', '水中の物体', '潜水艇', '棒のつり合い', '壁に立てかけた棒', '円すい振り子']),
  situation('波動', ['音源が動く', '回転する音源', '救急車のサイレン', '弦を張る', '管の長さを変える', 'スリットとスクリーン', '薄い膜', '平凸レンズとガラス板', 'ダイヤモンドが光る', '水面波の屈折']),
  situation('電磁気', ['導体棒がレール上を動く', '磁石がコイルを通過', 'コイルに電流を流す', 'コンデンサーを充電', '導体紙の等電位線', '電球の明るさ', '豆電球の回路']),
  situation('熱', ['ピストン付き容器', '気体を圧縮', '水を加熱', '水を冷却', '火力発電所', 'お茶が冷める']),
  situation('原子', ['金属板に光を当てる', '電子線を結晶に当てる', '水銀原子に衝突', '放射性物質が崩壊', '太陽の核融合']),
].flat();

for (const spec of querySpecs) {
  if (['周期', '振動数'].includes(spec.query)) {
    spec.expectedDomains = ['波動', '力学'];
  }
  if (spec.query === 'ジュール熱') {
    spec.expectedDomains = ['電磁気', '熱'];
  }
}

function domain(expectedDomain, queries) {
  return queries.map((query) => ({
    query,
    expectedDomains: [expectedDomain],
    type: 'domain',
  }));
}

function situation(expectedDomain, queries) {
  return queries.map((query) => ({
    query,
    expectedDomains: [expectedDomain],
    type: 'situation',
  }));
}

function search(query) {
  const terms = splitTerms(query);
  const spec = querySpecs.find((item) => item.query === query);
  return questions
    .map((question) => {
      const match = matchQuestion(question, terms, spec);
      return { question, ...match };
    })
    .filter((item) => item.score > 0 && terms.every((term) => termMatchesQuestion(item.question, term)));
}

function matchQuestion(question, terms, spec) {
  let score = 0;
  const matchedIn = new Set();
  for (const term of terms) {
    for (const variant of expandTermVariants(term)) {
      const checks = [
        ['unit', question.unit, 5],
        ['keywords', (question.keywords ?? []).join(' '), 5],
        ['summary', question.summary, 3],
        ['problem_text', question.problem_text, 2],
        ['masked_problem_text', question.masked_problem_text, 2],
        ['inferred_keywords', inferSearchKeywords(question).join(' '), 4],
      ];
      for (const [field, value, weight] of checks) {
        if ((field === 'problem_text' || field === 'masked_problem_text') && spec && !matchesExpected(question, spec)) {
          continue;
        }
        if (normalize(value).includes(variant)) {
          score += weight;
          matchedIn.add(field);
        }
      }
    }
  }
  return { score, matchedIn: [...matchedIn] };
}

function termMatchesQuestion(question, term) {
  return expandTermVariants(term).some((variant) => [
    question.unit,
    question.summary,
    question.problem_text,
    question.masked_problem_text,
    ...(question.keywords ?? []),
    ...inferSearchKeywords(question),
  ].some((value) => normalize(value).includes(variant)));
}

function matchesExpected(question, spec) {
  const metadata = normalize([
    question.subject,
    question.unit,
    question.summary,
    ...(question.keywords ?? []),
  ].join(' '));
  return spec.expectedDomains.some((domainName) => domainSignals[domainName].some((signal) => metadata.includes(normalize(signal))));
}

domainSignals = {
  力学: ['力学', '運動', '力', '加速度', '速度', '仕事', 'エネルギー', '運動量', '衝突', '円運動', '単振動', '単振り子', 'ばね', '摩擦', 'モーメント', '浮力', '万有引力', '慣性力'],
  波動: ['波動', '波', '音', '光', '干渉', '屈折', '反射', '回折', '共鳴', 'レンズ', 'ドップラー', '気柱', '弦', 'ニュートンリング', 'ヤング'],
  電磁気: ['電磁気', '電気', '電荷', '電場', '電位', '電圧', '電流', '抵抗', '回路', '磁', 'コンデンサー', '誘導', '交流', '電力', '電力量'],
  熱: ['熱', '気体', '比熱', '温度', '状態方程式', '内部エネルギー', '熱力学', '断熱', '等温', 'pV', 'p-V', '熱機関', '熱効率'],
  原子: ['原子', '電子', '光子', 'X線', '放射線', '半減期', '原子核', '核', '光電効果', '物質波', 'ド・ブロイ', 'ボーア', 'エネルギー準位'],
};

function normalize(value) {
  return canonicalizeForSearch(String(value ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeForSearch(value) {
  return value
    .normalize('NFKC')
    .replace(/[‐‑‒–—−ー]/g, '-')
    .replace(/p\s*-?\s*v/gi, 'pv')
    .replace(/p\s*-?\s*t/gi, 'pt')
    .replace(/t\s*-?\s*v/gi, 'tv')
    .replace(/コンデンサ(?!ー)/g, 'コンデンサー')
    .replace(/ドップラー効果/g, 'ドップラー')
    .replace(/doppler/gi, 'ドップラー')
    .replace(/ド[・･\s-]*ブロイ/g, 'ド・ブロイ')
    .replace(/電位差/g, '電圧')
    .replace(/x線/gi, 'X線');
}

function splitTerms(value) {
  const rawTerms = normalize(value)
    .replace(/[、。，,;・]/g, ' ')
    .split(/\s+|と/)
    .filter(Boolean);
  return [...new Set(rawTerms.flatMap((term) => decomposeFuzzyTerm(term)))];
}

const fuzzyTermGroups = [
  ['円運動', '等速円運動', '鉛直面内の円運動', '向心力'],
  ['音源', '波源'],
  ['観測者', '受信者'],
  ['ドップラー', 'ドップラー効果'],
  ['ヤングの実験', '二重スリット'],
  ['薄膜干渉', '薄膜', '反射の位相変化'],
  ['クインケ管', '音波の干渉', '経路差'],
  ['気柱共鳴', '気柱の共鳴', '開管', '閉管'],
  ['ホイートストンブリッジ', 'ブリッジ回路'],
  ['キルヒホッフの法則', '回路方程式'],
  ['単振り子', '振り子'],
  ['速度交換', '弾性衝突'],
  ['フィゾーの実験', '光速測定', '歯車'],
  ['ばね', 'フックの法則', '弾性力'],
  ['コンデンサー', 'コンデンサ', '静電容量', '電気容量'],
  ['電圧', '電位差'],
  ['運動量保存', '運動量保存則'],
  ['力学的エネルギー保存', '力学的エネルギー保存則', 'エネルギー保存'],
];

const fuzzyPhraseRules = [
  {
    patterns: [/回転.*音源/, /音源.*回転/],
    terms: ['ドップラー'],
  },
];

function decomposeFuzzyTerm(rawTerm) {
  for (const rule of fuzzyPhraseRules) {
    if (rule.patterns.some((pattern) => pattern.test(rawTerm))) {
      return rule.terms.map((term) => normalize(term));
    }
  }
  return [rawTerm];
}

function expandTermVariants(term) {
  const normalizedTerm = normalize(term);
  const variants = new Set([normalizedTerm]);
  for (const group of fuzzyTermGroups) {
    const normalizedGroup = group.map((alias) => normalize(alias));
    if (normalizedGroup.some((alias) => alias === normalizedTerm || (normalizedTerm.length >= 4 && (alias.includes(normalizedTerm) || normalizedTerm.includes(alias))))) {
      normalizedGroup.forEach((alias) => variants.add(alias));
    }
  }
  return [...variants];
}

function compactSearchText(question) {
  return normalize([
    question.subject,
    question.unit,
    question.summary,
    question.problem_text,
    question.masked_problem_text,
    ...(question.keywords ?? []),
  ].join('')).replace(/\s+/g, '');
}

const inferredSearchKeywordRules = [
  {
    keywords: ['ニュートンリング', '等厚干渉', '薄膜干渉', '光の干渉'],
    patterns: [/平凸レンズ.*平面ガラス/, /平面ガラス.*平凸レンズ/, /明線.*暗線.*同心円/, /同心円.*しま模様/],
  },
  {
    keywords: ['ヤングの実験', '二重スリット', '光の干渉', '干渉縞'],
    patterns: [/二重スリット/, /2つのスリット/, /二つのスリット/, /スリット.*スクリーン.*明線/, /スリット.*明線.*暗線/],
  },
  {
    keywords: ['回折格子', '光の干渉', '明線'],
    patterns: [/回折格子/, /格子定数.*明線/, /一次回折光/],
  },
  {
    keywords: ['単振り子', '振り子', '周期'],
    patterns: [/単振り子/, /振り子.*周期/, /小球.*糸.*小振幅/],
  },
  {
    keywords: ['速度交換', '弾性衝突', '衝突'],
    patterns: [/速度交換/, /同じ質量.*弾性衝突/, /質量.*等しい.*衝突/],
  },
  {
    keywords: ['フィゾーの実験', '光速測定', '光速', '歯車'],
    patterns: [/フィゾー/, /光速.*歯車/, /歯車.*光速/, /歯車.*反射.*光/],
  },
  {
    keywords: ['ドップラー', 'ドップラー効果'],
    patterns: [/ドップラー/, /音源.*観測/, /観測者.*(音|音源|波源).*振動数/],
  },
];

function inferSearchKeywords(question) {
  const text = compactSearchText(question);
  const keywords = [];
  for (const rule of inferredSearchKeywordRules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      keywords.push(...rule.keywords);
    }
  }
  return [...new Set(keywords)];
}

function runAudit() {
  const findings = [];
  const summaries = [];

  for (const spec of querySpecs) {
    const hits = search(spec.query);
    const noisy = hits.filter((hit) => !matchesExpected(hit.question, spec));
    summaries.push({
      query: spec.query,
      expected_domains: spec.expectedDomains,
      hits: hits.length,
      noisy: noisy.length,
    });
    for (const hit of noisy) {
      findings.push({
        query: spec.query,
        expected_domains: spec.expectedDomains,
        id: hit.question.id,
        year: hit.question.year,
        subject: hit.question.subject,
        number: `第${hit.question.major_no}問${hit.question.middle_no ? ` ${hit.question.middle_no}` : ''} ${hit.question.minor_no}`,
        unit: hit.question.unit,
        keywords: hit.question.keywords ?? [],
        summary: hit.question.summary,
        matched_in: hit.matchedIn,
        score: hit.score,
      });
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `search-consistency-audit-${stamp}.json`);
  const mdPath = path.join(outDir, `search-consistency-audit-${stamp}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify({
    created_at: new Date().toISOString(),
    query_count: querySpecs.length,
    findings_count: findings.length,
    summaries,
    findings,
  }, null, 2)}\n`);

  fs.writeFileSync(mdPath, [
    `# Search Consistency Audit ${stamp}`,
    '',
    `queries: ${querySpecs.length}`,
    `findings: ${findings.length}`,
    '',
    '## Query Summary',
    '',
    ...summaries
      .filter((item) => item.hits || item.noisy)
      .map((item) => `- ${item.query}: hits=${item.hits}, noisy=${item.noisy}, expected=${item.expected_domains.join('/')}`),
    '',
    '## Findings',
    '',
    ...findings.slice(0, 200).map((finding) => [
      `### ${finding.query} -> ${finding.id}`,
      `- expected: ${finding.expected_domains.join('/')}`,
      `- unit: ${finding.unit}`,
      `- number: ${finding.year} ${finding.subject} ${finding.number}`,
      `- matched_in: ${finding.matched_in.join(', ')}`,
      `- summary: ${finding.summary}`,
      '',
    ].join('\n')),
  ].join('\n'));

  console.log(`queries=${querySpecs.length}`);
  console.log(`findings=${findings.length}`);
  console.log(`report=${path.relative(root, jsonPath)}`);
  console.log(`summary=${path.relative(root, mdPath)}`);
}

runAudit();
