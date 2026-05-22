import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const questionsPath = path.join(root, 'data', 'questions.json');
const outDir = path.join(root, 'worklogs');

const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

const domainWords = new Set(['力学', '波動', '波', '電磁気', '電気', '熱', '原子']);
const weakKeywords = new Set(['物理', '物理I', '物理Ⅰ', '物理基礎', '探究', '選択問題', '小問集合']);

const topicRules = [
  [/気体の仕事/, ['pVグラフ', 'グラフ', '仕事', '熱力学', '状態変化']],
  [/内部エネルギー/, ['内部エネルギー', '単原子分子', '熱力学']],
  [/理想気体/, ['理想気体', '状態方程式', 'ピストン', 'ばね']],
  [/熱力学第一法則/, ['熱力学第一法則', '仕事', '内部エネルギー', '熱量']],
  [/状態変化/, ['状態変化', 'ボイル・シャルルの法則', 'ボイルシャルルの法則', 'pVグラフ']],
  [/コンデンサー/, ['コンデンサー', '電気容量', '静電エネルギー', '金属板', '極板間距離', '充電', '過渡現象']],
  [/電磁誘導/, ['電磁誘導', 'コイル', '磁束', '誘導起電力', 'レンツの法則', '力のつり合い']],
  [/ダイオード/, ['ダイオード', '整流', '電力', '交流']],
  [/光の干渉/, ['光の干渉', '干渉', '経路差', '位相', '屈折', '屈折率', 'くさび形空気層']],
  [/弦の振動/, ['弦の振動', '基本振動', '定常波', '合成波', '倍振動']],
  [/正弦波/, ['正弦波', '周期', '波長', '波のグラフ', 'グラフ']],
  [/反射と重ね合わせ/, ['反射', '重ね合わせ', '合成波', '節', '腹', '波のグラフ']],
  [/うなり/, ['うなり', '振動数', '周期', '合成波', '振幅']],
  [/音波の速さ|音波/, ['音波', '音速', '波長', '振動数', 'うなり', 'ドップラー効果']],
  [/超音波/, ['超音波', '音速', '波長', '振動数']],
  [/水平投射/, ['水平投射', '自由落下', '等速直線運動', '放物運動', '速度']],
  [/鉛直投げ上げ/, ['鉛直投げ上げ', '投げ上げ', '最高点', '速度']],
  [/滑車/, ['滑車', '張力', '力のつり合い', '運動方程式']],
  [/等加速度運動/, ['等加速度運動', '加速度', '運動方程式']],
  [/円運動/, ['円運動', '向心力', '回転', '運動方程式']],
  [/慣性力/, ['慣性力', 'エレベーター', 'ばね', '運動方程式']],
  [/惑星運動/, ['惑星運動', '万有引力', '面積速度', '近日点', '遠日点']],
  [/エネルギー保存|エネルギー/, ['エネルギー保存', '力学的エネルギー', '運動エネルギー', '位置エネルギー']],
  [/素粒子/, ['素粒子', '原子核', '質量欠損']],
  [/崩壊系列/, ['崩壊系列', 'アルファ崩壊', 'ベータ崩壊', '原子核']],
  [/半減期/, ['半減期', '崩壊', '模擬実験', '原子核']],
  [/放射線/, ['放射線', '原子核', '性質']],
  [/質量欠損/, ['質量欠損', 'エネルギー等価', '原子核']],
  [/原子核反応/, ['原子核反応', '結合エネルギー', '保存則']],
  [/光電効果/, ['光電効果', '仕事関数', '阻止電圧', '光電流']],
];

function unitParts(unit = '') {
  return unit
    .split(/[・／\/、\s]+|と/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function topic(unit = '') {
  const details = unitParts(unit).filter((part) => !domainWords.has(part));
  return details.length ? details.join('・') : unit || 'この小問';
}

function isBroadUnit(unit = '') {
  const details = unitParts(unit).filter((part) => !domainWords.has(part));
  return details.length === 0 || unit === '力学・熱';
}

function allowedByTopic(unit = '') {
  const text = unit;
  const allowed = new Set();
  for (const [pattern, words] of topicRules) {
    if (pattern.test(text)) {
      words.forEach((word) => allowed.add(word));
    }
  }
  return allowed;
}

function keywordAllowed(keyword, question) {
  if (!keyword || weakKeywords.has(keyword)) return false;
  const unit = question.unit ?? '';
  if (domainWords.has(keyword)) return unitParts(unit).includes(keyword);
  if (unit.includes(keyword) || keyword.includes(unit)) return true;
  const allowed = allowedByTopic(unit);
  if (allowed.has(keyword)) return true;
  return unitParts(unit)
    .filter((part) => !domainWords.has(part))
    .some((part) => part.length >= 2 && (keyword.includes(part) || part.includes(keyword)));
}

function rebuildSummary(question, keywords) {
  const unit = question.unit ?? '';
  if (isBroadUnit(unit)) {
    return `${unit}分野の条件や基本法則の関係を判断する。`;
  }
  const detail = topic(unit);
  const extras = keywords
    .filter((keyword) => !domainWords.has(keyword))
    .filter((keyword) => !unit.includes(keyword))
    .slice(0, 3);
  if (extras.length) return `${detail}について、${extras.join('・')}を手がかりに判断する。`;
  return `${detail}について、条件や基本法則の関係を判断する。`;
}

const genericPattern = /^(.*?)を扱う大問。?\s*問|力学、エネルギー、熱に関する総合大問。?\s*問/;
const generatedPattern = /について、.*を手がかりに判断する。|分野の条件や基本法則の関係を判断する。/;

const changes = [];
for (const question of questions) {
  const oldSummary = question.summary ?? '';
  const oldKeywords = Array.isArray(question.keywords) ? question.keywords : [];

  if (genericPattern.test(oldSummary) && !question.common_summary) {
    question.common_summary = oldSummary.split(/\s*問\d/)[0].trim();
    if (question.common_summary && !/[。！？]$/.test(question.common_summary)) {
      question.common_summary += '。';
    }
  }

  const keywords = [...new Set([...unitParts(question.unit ?? ''), ...oldKeywords])]
    .filter((keyword) => keywordAllowed(keyword, question))
    .slice(0, 8);

  const shouldRebuild =
    generatedPattern.test(oldSummary) ||
    genericPattern.test(oldSummary) ||
    oldKeywords.some((keyword) => weakKeywords.has(keyword));

  if (shouldRebuild) {
    question.summary = rebuildSummary(question, keywords);
  }
  question.keywords = keywords;

  if (
    question.summary !== oldSummary ||
    JSON.stringify(question.keywords) !== JSON.stringify(oldKeywords)
  ) {
    changes.push({
      id: question.id,
      year: question.year,
      subject: question.subject,
      unit: question.unit,
      old_summary: oldSummary,
      new_summary: question.summary,
      old_keywords: oldKeywords,
      new_keywords: question.keywords,
      common_summary: question.common_summary ?? '',
    });
  }
}

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(outDir, `summary-precision-stabilize-${stamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify({ created_at: new Date().toISOString(), changes }, null, 2)}\n`);

console.log(`changed=${changes.length}`);
console.log(`report=${path.relative(root, reportPath)}`);
