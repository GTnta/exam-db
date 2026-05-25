import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const questionsPath = path.join(root, "data", "questions.json");
const outDir = path.join(root, "worklogs");

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));

const domainRules = [
  {
    domain: "力学",
    patterns: [
      /運動方程式/, /加速度/, /速度/, /速さ/, /変位/, /放物運動/, /投げ上げ/, /水平投射/, /斜方投射/,
      /力のつり合い/, /つり合い/, /張力/, /垂直抗力/, /摩擦/, /仕事/, /運動エネルギー/,
      /位置エネルギー/, /力学的エネルギー/, /運動量/, /力積/, /衝突/, /円運動/, /向心力/,
      /中心力/, /単振動/, /単振り子/, /振り子/, /ばね/, /フック/, /慣性力/, /万有引力/,
      /力のモーメント/, /重心/, /浮力/,
    ],
  },
  {
    domain: "波動",
    patterns: [
      /波長/, /振動数/, /周期/, /波の速さ/, /波源/, /波形/, /変位/, /音波/, /音源/, /観測者/, /ドップラー/, /うなり/,
      /おんさ/, /気柱/, /共鳴/, /定常波/, /弦/, /腹/, /節/, /屈折/, /反射/, /全反射/,
      /干渉/, /経路差/, /明線/, /暗線/, /回折/, /回折格子/, /スリット/, /ニュートンリング/,
      /平凸レンズ/, /レンズ/, /焦点/, /光速/, /歯車/, /フィゾー/,
    ],
  },
  {
    domain: "電磁気",
    patterns: [
      /電荷/, /電場/, /電位/, /電圧/, /電流/, /抵抗/, /回路/, /導線/, /電力/, /ジュール熱/,
      /コンデンサ/, /コンデンサー/, /静電容量/, /電気容量/, /磁場/, /磁界/, /磁束/, /電磁誘導/,
      /誘導起電力/, /コイル/, /ローレンツ力/, /フレミング/, /交流/, /変圧器/, /送電/,
      /ダイオード/, /キルヒホッフ/, /ブリッジ/, /検流計/,
    ],
  },
  {
    domain: "熱",
    patterns: [
      /熱量/, /比熱/, /温度/, /熱容量/, /潜熱/, /融解/, /蒸発/, /気体/, /理想気体/, /状態方程式/,
      /内部エネルギー/, /熱力学/, /定圧/, /定積/, /等温/, /断熱/, /pVグラフ/, /PVグラフ/, /p-V/, /P-V/, /圧力/, /体積/,
      /ボイル/, /シャルル/,
    ],
  },
  {
    domain: "原子",
    patterns: [
      /原子/, /原子核/, /電子/, /光子/, /光電効果/, /仕事関数/, /阻止電圧/, /X線/, /放射線/,
      /半減期/, /質量欠損/, /結合エネルギー/, /核分裂/, /核融合/, /α線/, /β線/, /γ線/,
      /ドブロイ/, /ボーア/, /ラザフォード/, /ニホニウム/,
    ],
  },
];

const topicRules = [
  { topic: "単振り子", domain: "力学", patterns: [/単振り子/, /振り子.*周期/, /振り子.*振動/, /小振幅.*振り子/] },
  { topic: "慣性力", domain: "力学", patterns: [/慣性力/, /加速.*自動車/, /加速.*電車/, /非慣性/] },
  { topic: "比熱", domain: "熱", patterns: [/比熱/, /温度上昇/, /熱量.*温度/] },
  { topic: "熱力学", domain: "熱", patterns: [/熱力学/, /内部エネルギー/, /状態方程式/, /断熱/, /等温/, /pV/, /PV/] },
  { topic: "ドップラー効果", domain: "波動", patterns: [/ドップラー/, /音源.*観測/, /観測.*振動数/] },
  { topic: "音波の干渉", domain: "波動", patterns: [/音波.*干渉/, /クインケ/, /音.*経路差/] },
  { topic: "光の干渉", domain: "波動", patterns: [/光.*干渉/, /明線/, /暗線/, /経路差/, /スリット/, /回折格子/, /平凸レンズ/, /ニュートンリング/] },
  { topic: "凸レンズ", domain: "波動", patterns: [/凸レンズ/, /焦点距離/, /実像/, /虚像/] },
  { topic: "コンデンサー", domain: "電磁気", patterns: [/コンデンサ/, /コンデンサー/, /静電容量/, /電気容量/] },
  { topic: "電磁誘導", domain: "電磁気", patterns: [/電磁誘導/, /誘導起電力/, /磁束.*変化/, /レンツ/] },
  { topic: "ホイートストンブリッジ", domain: "電磁気", patterns: [/ホイートストン/, /ブリッジ/, /検流計.*電流/] },
  { topic: "弾性衝突", domain: "力学", patterns: [/弾性衝突/, /反発係数/, /速度交換/] },
  { topic: "円運動", domain: "力学", patterns: [/円運動/, /向心力/, /中心力/] },
  { topic: "単振動", domain: "力学", patterns: [/単振動/, /ばね振り子/, /復元力/] },
  { topic: "光速測定", domain: "波動", patterns: [/光速/, /歯車/, /フィゾー/] },
  { topic: "光電効果", domain: "原子", patterns: [/光電効果/, /仕事関数/, /阻止電圧/] },
  { topic: "X線", domain: "原子", patterns: [/X線/, /最短波長/] },
];

const broadDomains = new Set(["力学", "波動", "電磁気", "熱", "原子", "電気", "波"]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[‐‑‒–—−ー]/g, "-")
    .replace(/ド[・･\s-]*(?:ブ|プ)ロイ/g, "ドブロイ")
    .replace(/コンデンサ(?!ー)/g, "コンデンサー")
    .replace(/バネ/g, "ばね")
    .replace(/求心力|向心力/g, "向心力");
}

function compact(value) {
  return normalize(value).replace(/\s+/g, "");
}

function trimToLikelyQuestion(text) {
  const compacted = compact(text);
  if (!compacted) return "";
  let end = compacted.length;
  const nextMajor = compacted.slice(120).search(/第\d+問/);
  if (nextMajor >= 0) end = Math.min(end, nextMajor + 120);
  const nextMiddle = compacted.slice(120).search(/物理(?:基礎|I)?[ABC]/);
  if (nextMiddle >= 0) end = Math.min(end, nextMiddle + 120);
  const footer = compacted.search(/物理(?:基礎|I)?(?:解答番号|\(?\d{4}|-?\d+)/);
  if (footer > 80) end = Math.min(end, footer);
  return compacted.slice(0, end);
}

function registeredText(question) {
  return compact([
    question.unit,
    question.summary,
    ...(question.keywords ?? []),
  ].join(" "));
}

function unitDomains(question) {
  const unit = normalize([
    question.unit,
    question.summary,
    ...(question.keywords ?? []),
  ].join(" "));
  const result = new Set();
  if (/力学|運動|仕事|エネルギー|衝突|円運動|単振動|単振り子|ばね|摩擦|モーメント|浮力|力のつり合い|つり合い|重力|終端速度/.test(unit)) result.add("力学");
  if (/波動|波|音|光|干渉|屈折|反射|回折|共鳴|レンズ|ドップラー/.test(unit)) result.add("波動");
  if (/電磁気|電気|電場|電位|電流|電圧|抵抗|回路|磁|コンデンサー|誘導|交流/.test(unit)) result.add("電磁気");
  if (/熱|気体|比熱|温度|状態方程式|内部エネルギー|pV|PV/.test(unit)) result.add("熱");
  if (/原子|電子|光子|X線|放射線|原子核|核|光電効果|半減期/.test(unit)) result.add("原子");
  return result;
}

function scoreRules(text, rules) {
  return rules
    .map((rule) => {
      const matched = rule.patterns.filter((pattern) => pattern.test(text));
      return { ...rule, score: matched.length, matched: matched.map(String) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.domain?.localeCompare(b.domain ?? "", "ja"));
}

function unitParts(unit = "") {
  return normalize(unit)
    .split(/[・/／,、\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasSpecificUnit(question) {
  return unitParts(question.unit).some((part) => !broadDomains.has(part) && part.length >= 2);
}

const findings = [];

for (const question of questions) {
  const ownText = trimToLikelyQuestion(question.masked_problem_text || question.problem_text || "");
  const metaText = registeredText(question);
  const domains = scoreRules(ownText, domainRules);
  const topics = scoreRules(ownText, topicRules);
  const registeredDomains = unitDomains(question);
  const reasons = [];

  if (/単位|次元|物理量/.test(question.unit ?? "")) {
    continue;
  }

  const topDomain = domains[0];
  const registeredDomainScore = domains
    .filter((domain) => registeredDomains.has(domain.domain))
    .reduce((max, domain) => Math.max(max, domain.score), 0);
  if (topDomain && topDomain.score >= 2 && !registeredDomains.has(topDomain.domain) && topDomain.score >= registeredDomainScore + 2) {
    const registeredHasAnyDomain = registeredDomains.size > 0;
    reasons.push(registeredHasAnyDomain ? "domain_mismatch" : "missing_domain");
  }

  const strongTopics = topics.filter((topic) => topic.score >= 2 && !metaText.includes(compact(topic.topic)));
  if (strongTopics.length > 0 && (!hasSpecificUnit(question) || strongTopics.some((topic) => !registeredDomains.has(topic.domain)))) {
    reasons.push("topic_missing_from_metadata");
  }

  if (reasons.length === 0) continue;

  findings.push({
    id: question.id,
    year: question.year,
    exam_system: question.exam_system,
    session: question.session,
    subject: question.subject,
    number: `第${question.major_no}問${question.middle_no ? ` ${question.middle_no}` : ""} ${question.minor_no}`,
    answer_no: question.answer_no,
    unit: question.unit,
    keywords: question.keywords ?? [],
    summary: question.summary,
    reasons,
    registered_domains: [...registeredDomains],
    inferred_domains: domains.slice(0, 3).map(({ domain, score, matched }) => ({ domain, score, matched })),
    inferred_topics: topics.slice(0, 5).map(({ topic, domain, score, matched }) => ({ topic, domain, score, matched })),
    own_text_head: ownText.slice(0, 320),
  });
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = path.join(outDir, `topic-mismatch-audit-${stamp}.json`);
const mdPath = path.join(outDir, `topic-mismatch-audit-${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(findings, null, 2)}\n`, "utf8");
writeFileSync(
  mdPath,
  [
    `# Topic Mismatch Audit ${stamp}`,
    "",
    `findings: ${findings.length}`,
    "",
    ...findings.slice(0, 80).map((finding) => [
      `## ${finding.id} ${finding.year} ${finding.subject} ${finding.number}`,
      `- reasons: ${finding.reasons.join(", ")}`,
      `- unit: ${finding.unit}`,
      `- keywords: ${finding.keywords.join(", ")}`,
      `- summary: ${finding.summary}`,
      `- inferred domains: ${finding.inferred_domains.map((d) => `${d.domain}:${d.score}`).join(", ")}`,
      `- inferred topics: ${finding.inferred_topics.map((t) => `${t.topic}:${t.score}`).join(", ")}`,
      `- text: ${finding.own_text_head}`,
      "",
    ].join("\n")),
  ].join("\n"),
  "utf8",
);

console.log(`findings: ${findings.length}`);
console.log(jsonPath);
console.log(mdPath);
