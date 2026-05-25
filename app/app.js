const labels = {
  center: "センター",
  common: "共通テスト",
  main: "本試",
  makeup: "追試・再試",
};

const sourceKindLabels = {
  question: "問題PDF",
  answer: "正解PDF",
  question_page: "問題ページ",
  answer_page: "解答ページ",
  analysis: "分析ページ",
};

let questions = [];
let sources = [];
let selectedId = "";

const elements = {
  query: document.querySelector("#query"),
  subject: document.querySelector("#subject"),
  examSystem: document.querySelector("#examSystem"),
  session: document.querySelector("#session"),
  typicality: document.querySelector("#typicality"),
  year: document.querySelector("#year"),
  sortOrder: document.querySelector("#sortOrder"),
  results: document.querySelector("#results"),
  count: document.querySelector("#count"),
  detailPanel: document.querySelector("#detailPanel"),
};

async function loadQuestions() {
  const [questionsResponse, sourcesResponse] = await Promise.all([
    fetch("../data/questions.json"),
    fetch("../data/sources.json"),
  ]);
  if (!questionsResponse.ok) {
    throw new Error("questions.json を読み込めませんでした");
  }
  if (!sourcesResponse.ok) {
    throw new Error("sources.json を読み込めませんでした");
  }
  questions = await questionsResponse.json();
  sources = await sourcesResponse.json();
  populateSubjectOptions();
  populateYearOptions();
  render();
}

function populateSubjectOptions() {
  const subjects = [...new Set(questions.map((q) => q.subject))].sort();
  for (const subject of subjects) {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    elements.subject.append(option);
  }
}

function populateYearOptions() {
  const years = [...new Set(questions.map((q) => q.year).filter(Boolean))]
    .sort((a, b) => b - a);
  for (const year of years) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `${year}年度`;
    elements.year.append(option);
  }
}

function normalize(value) {
  return canonicalizeForSearch(String(value ?? ""))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeForSearch(value) {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—−ー]/g, "-")
    .replace(/p\s*-?\s*v/gi, "pv")
    .replace(/pv\s*グラフ/g, "pvグラフ")
    .replace(/p\s*-?\s*t/gi, "pt")
    .replace(/t\s*-?\s*v/gi, "tv")
    .replace(/コンデンサ(?!ー)/g, "コンデンサー")
    .replace(/バネ/g, "ばね")
    .replace(/ドップラー効果/g, "ドップラー")
    .replace(/doppler/gi, "ドップラー")
    .replace(/ド[・･\s-]*(?:ブ|プ)ロイ/g, "ドブロイ")
    .replace(/熱力学第\s*1\s*法則/g, "熱力学第一法則")
    .replace(/エネルギー保存則/g, "エネルギー保存")
    .replace(/力学的エネルギー保存則/g, "力学的エネルギー保存")
    .replace(/ボイル[・･\s-]*シャルル/g, "ボイルシャルル")
    .replace(/電位差/g, "電圧")
    .replace(/電気容量/g, "容量")
    .replace(/α/g, "アルファ")
    .replace(/β/g, "ベータ")
    .replace(/γ/g, "ガンマ")
    .replace(/x線/gi, "X線")
    .replace(/摩擦力/g, "摩擦")
    .replace(/向心力/g, "中心力")
    .replace(/求心力/g, "中心力");
}

function splitTerms(value) {
  return normalize(value)
    .replace(/[、,，+＋/／]/g, " ")
    .split(/\s+|と/)
    .filter(Boolean);
}

function searchableText(question) {
  return normalize([
    question.year,
    question.subject,
    question.unit,
    question.major_no,
    question.middle_no,
    question.minor_no,
    question.answer_no,
    question.typicality,
    question.summary,
    question.problem_text,
    question.masked_problem_text,
    ...trustedInferredSearchKeywords(question),
    ...(question.keywords ?? []),
  ].join(" "));
}

function compactSearchText(question) {
  return normalize([
    question.subject,
    question.unit,
    question.summary,
    question.problem_text,
    question.masked_problem_text,
    ...(question.keywords ?? []),
  ].join(" ")).replace(/\s+/g, "");
}

const inferredSearchKeywordRules = [
  {
    keywords: ["ニュートンリング", "等厚干渉", "薄膜干渉", "光の干渉"],
    patterns: [
      /平凸レンズ.*平面ガラス/,
      /平面ガラス.*平凸レンズ/,
      /暗環.*明環.*同心円/,
      /明環.*暗環.*同心円/,
      /同心円状.*しま模様/,
      /同心円状.*縞模様/,
    ],
  },
  {
    keywords: ["ヤングの実験", "二重スリット", "光の干渉", "干渉縞"],
    patterns: [
      /二重スリット/,
      /2つのスリット/,
      /二つのスリット/,
      /スリット.*スクリーン.*明線/,
      /スリット.*明線.*暗線/,
      /干渉縞.*スリット/,
    ],
  },
  {
    keywords: ["回折格子", "光の干渉", "明線"],
    patterns: [/回折格子/, /格子定数.*明線/, /一次回折光/],
  },
  {
    keywords: ["薄膜干渉", "光の干渉", "反射の位相変化"],
    patterns: [
      /薄膜.*ガラス.*反射/,
      /膜厚.*反射光.*干渉/,
      /境界面.*反射.*位相/,
      /反射.*位相.*ずれ/,
    ],
  },
  {
    keywords: ["くさび形空気層", "等厚干渉", "光の干渉"],
    patterns: [
      /くさび形空気層/,
      /ガラス板.*下面.*反射.*ガラス板.*上面.*反射/,
      /ガラス板.*明線.*間隔/,
    ],
  },
  {
    keywords: ["クインケ管", "音波の干渉", "経路差"],
    patterns: [/クインケ管/, /音.*経路差.*最小/, /管.*引き出.*経路差/],
  },
  {
    keywords: ["定常波", "弦の振動", "基本振動", "倍振動"],
    patterns: [/弦.*基本振動/, /弦.*倍振動/, /弦.*定常波/, /節.*腹.*弦/],
  },
  {
    keywords: ["気柱共鳴", "閉管", "開管", "定常波"],
    patterns: [/気柱.*共鳴/, /閉管/, /開管/, /空気柱.*定常波/],
  },
  {
    keywords: ["うなり", "おんさ", "振動数差"],
    patterns: [/うなり/, /おんさ.*振動数/, /振動数差/],
  },
  {
    keywords: ["全反射", "臨界角", "屈折"],
    patterns: [/全反射/, /臨界角/, /屈折率.*境界面.*反射/],
  },
  {
    keywords: ["ホイートストンブリッジ", "ブリッジ回路", "抵抗回路"],
    patterns: [/ブリッジ回路/, /検流計.*電流.*0/, /ホイートストン/],
  },
  {
    keywords: ["キルヒホッフの法則", "回路方程式", "電流"],
    patterns: [/キルヒホッフ/, /閉回路.*電圧/, /分岐点.*電流/],
  },
  {
    keywords: ["レンズの公式", "凸レンズ", "実像", "虚像"],
    patterns: [/凸レンズ.*実像/, /凸レンズ.*虚像/, /レンズ.*焦点距離/, /レンズの公式/],
  },
  {
    keywords: ["単振動", "ばね振り子", "周期"],
    patterns: [/ばね振り子/, /単振動/, /復元力.*変位/, /周期.*ばね/],
  },
  {
    keywords: ["単振り子", "振り子", "周期", "単振動"],
    patterns: [
      /単振り子/,
      /振り子.*周期/,
      /振り子.*振動/,
      /小振幅.*振り子/,
      /糸.*小球.*小振幅/,
    ],
  },
  {
    keywords: ["速度交換", "弾性衝突", "衝突", "運動量保存", "反発係数"],
    patterns: [
      /速度交換/,
      /同じ質量.*弾性衝突/,
      /同質量.*弾性衝突/,
      /質量.*等しい.*衝突/,
      /衝突.*速度.*入れ替/,
      /衝突.*速さ.*入れ替/,
    ],
  },
  {
    keywords: ["フィゾーの実験", "光速測定", "光速", "歯車"],
    patterns: [
      /フィゾー/,
      /光速.*歯車/,
      /歯車.*光速/,
      /歯車.*反射.*光/,
      /回転.*歯車.*光/,
    ],
  },
  {
    keywords: ["万有引力", "ケプラーの法則", "惑星運動"],
    patterns: [/ケプラー/, /惑星.*公転/, /万有引力.*円運動/],
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

function trustedInferredSearchKeywords(question) {
  return inferSearchKeywords(question).filter((keyword) => inferredKeywordIsReliable(question, keyword));
}

function inferredKeywordIsReliable(question, keyword) {
  const guard = guardedSearchConcepts.find((concept) => {
    const conceptTerms = concept.terms.map((term) => normalize(term));
    const normalizedKeyword = normalize(keyword);
    return conceptTerms.some((term) => term.includes(normalizedKeyword) || normalizedKeyword.includes(term));
  });
  if (!guard) return true;

  const metadataText = normalize([
    question.subject,
    question.unit,
    question.summary,
    ...(question.keywords ?? []),
  ].join(" "));
  return guard.support.some((support) => metadataText.includes(normalize(support)));
}

const fuzzyTermGroups = [
  ["回転", "円運動", "等速円運動", "鉛直円運動", "向心力"],
  ["音源", "波源"],
  ["観測者", "受信者"],
  ["ドップラー", "ドップラー効果"],
  ["ヤングの実験", "二重スリット"],
  ["薄膜干渉", "薄膜", "反射の位相変化"],
  ["クインケ管", "音波の干渉"],
  ["気柱共鳴", "気柱の共鳴", "閉管", "開管"],
  ["ホイートストンブリッジ", "ブリッジ回路"],
  ["単振り子", "振り子"],
  ["速度交換", "弾性衝突"],
  ["フィゾーの実験", "光速測定", "歯車"],
  ["ばね", "バネ", "弾性力", "フック"],
  ["コンデンサー", "コンデンサ", "電気容量", "静電容量"],
  ["電圧", "電位差"],
  ["運動量保存", "運動量保存則"],
  ["力学的エネルギー保存", "力学的エネルギー保存則", "エネルギー保存"],
];

const fuzzyNoiseWords = [
  "する",
  "した",
  "して",
  "される",
  "され",
  "場合",
  "問題",
  "設問",
  "もの",
  "こと",
  "について",
  "に関する",
  "の",
  "が",
  "を",
  "は",
  "に",
  "で",
];

function splitTerms(value) {
  const rawTerms = normalize(value)
    .replace(/[、。，．・,;；/]/g, " ")
    .split(/\s+|\u3068/)
    .filter(Boolean);

  const terms = [];
  for (const rawTerm of rawTerms) {
    terms.push(...decomposeFuzzyTerm(rawTerm));
  }
  return [...new Set(terms)];
}

function decomposeFuzzyTerm(rawTerm) {
  let term = rawTerm;
  for (const noiseWord of fuzzyNoiseWords) {
    term = term.replaceAll(noiseWord, " ");
  }

  const found = [];
  for (const group of fuzzyTermGroups) {
    if (group.some((alias) => rawTerm.includes(normalize(alias)))) {
      found.push(normalize(group[0]));
    }
  }
  if (found.length > 0) return [...new Set(found)].filter(Boolean);

  const pieces = term.split(/\s+/).filter(Boolean);
  return [...new Set(pieces)].filter(Boolean);
}

function scoreQuestion(question, terms) {
  if (terms.length === 0) return 1;

  let score = 0;
  for (const term of terms) {
    score += termMatchInfo(question, term).score;
  }
  return score;
}

function termMatchesQuestion(question, term) {
  return termMatchInfo(question, term).matched;
}

function expandTermVariants(term) {
  const normalizedTerm = normalize(term);
  const variants = new Set([normalizedTerm]);
  for (const group of fuzzyTermGroups) {
    const normalizedGroup = group.map((alias) => normalize(alias));
    if (normalizedGroup.some((alias) => alias.includes(normalizedTerm) || normalizedTerm.includes(alias))) {
      normalizedGroup.forEach((alias) => variants.add(alias));
    }
  }
  return [...variants];
}

const guardedSearchConcepts = [
  {
    terms: ["干渉", "ヤングの実験", "ニュートンリング", "薄膜干渉", "回折格子", "明線", "暗線"],
    support: ["波動", "光", "干渉", "回折", "スリット", "レンズ", "ニュートンリング", "ヤング"],
  },
  {
    terms: ["ドップラー", "ドップラー効果", "うなり", "音波の干渉", "クインケ管", "気柱共鳴"],
    support: ["波動", "音", "音波", "振動数", "波長", "共鳴", "気柱", "ドップラー"],
  },
  {
    terms: ["単振り子", "単振動", "ばね振り子"],
    support: ["力学", "単振動", "単振り子", "振り子", "周期", "ばね"],
  },
  {
    terms: ["速度交換", "弾性衝突", "衝突"],
    support: ["力学", "衝突", "運動量", "速度交換", "反発係数"],
  },
  {
    terms: ["フィゾーの実験", "光速測定"],
    support: ["波動", "光", "光速", "フィゾー", "歯車"],
  },
];

function structuredSearchText(question) {
  return normalize([
    question.year,
    question.subject,
    question.unit,
    question.major_no,
    question.middle_no,
    question.minor_no,
    question.answer_no,
    question.typicality,
    question.summary,
    ...trustedInferredSearchKeywords(question),
    ...(question.keywords ?? []),
  ].join(" "));
}

function bodySearchText(question) {
  return normalize([
    question.problem_text,
    question.masked_problem_text,
  ].join(" "));
}

function termMatchInfo(question, term) {
  let score = 0;
  let matched = false;
  const structuredText = structuredSearchText(question);
  const bodyText = bodySearchText(question);

  for (const variant of expandTermVariants(term)) {
    const structuredHit = structuredText.includes(variant);
    const unitHit = normalize(question.unit).includes(variant);
    const keywordHit = (question.keywords ?? []).some((keyword) => normalize(keyword).includes(variant));
    const summaryHit = normalize(question.summary).includes(variant);
    const bodyHit = bodyText.includes(variant);

    if (structuredHit) {
      matched = true;
      score += 4;
    }
    if (unitHit) score += 3;
    if (keywordHit) score += 5;
    if (summaryHit) score += 2;
    if (bodyHit && bodyMatchIsReliable(question, variant, structuredText)) {
      matched = true;
      score += 2;
    }
  }

  return { matched, score };
}

function bodyMatchIsReliable(question, variant, structuredText) {
  const guard = guardedSearchConcepts.find((concept) => {
    const conceptTerms = concept.terms.map((term) => normalize(term));
    return conceptTerms.some((term) => term.includes(variant) || variant.includes(term));
  });
  if (!guard) return true;

  const supportText = structuredText || structuredSearchText(question);
  return guard.support.some((support) => supportText.includes(normalize(support)));
}

function getFilteredQuestions() {
  const terms = splitTerms(elements.query.value);
  const sortOrder = elements.sortOrder.value;
  const filters = {
    subject: elements.subject.value,
    exam_system: elements.examSystem.value,
    session: elements.session.value,
    typicality: elements.typicality.value,
    year: elements.year.value ? Number(elements.year.value) : null,
  };

  return questions
    .map((question) => ({ question, score: scoreQuestion(question, terms) }))
    .filter(({ question, score }) => {
      if (terms.length > 0 && score === 0) return false;
      if (terms.length > 1 && terms.some((term) => !termMatchesQuestion(question, term))) return false;
      if (filters.subject && question.subject !== filters.subject) return false;
      if (filters.exam_system && question.exam_system !== filters.exam_system) return false;
      if (filters.session && question.session !== filters.session) return false;
      if (filters.typicality && question.typicality !== filters.typicality) return false;
      if (filters.year && question.year !== filters.year) return false;
      return true;
    })
    .sort((a, b) => compareResults(a, b, sortOrder))
    .map(({ question }) => question);
}

function compareResults(a, b, sortOrder) {
  if (sortOrder === "year_asc") {
    return a.question.year - b.question.year || compareQuestionOrder(a.question, b.question);
  }

  if (sortOrder === "year_desc") {
    return b.question.year - a.question.year || compareQuestionOrder(a.question, b.question);
  }

  return b.score - a.score || b.question.year - a.question.year || compareQuestionOrder(a.question, b.question);
}

function compareQuestionOrder(a, b) {
  return (
    numberPrefix(a.major_no) - numberPrefix(b.major_no) ||
    String(a.middle_no || "").localeCompare(String(b.middle_no || ""), "ja") ||
    numberPrefix(a.answer_no) - numberPrefix(b.answer_no) ||
    String(a.id).localeCompare(String(b.id), "ja")
  );
}

function numberPrefix(value) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function render() {
  const filtered = getFilteredQuestions();
  elements.count.textContent = `${filtered.length}件`;
  elements.results.innerHTML = "";

  for (const question of filtered) {
    const card = document.createElement("article");
    card.className = `card${question.id === selectedId ? " active" : ""}`;
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="meta">
        <span class="pill strong">${question.year}</span>
        <span class="pill">${labels[question.exam_system] ?? question.exam_system}</span>
        <span class="pill">${labels[question.session] ?? question.session}</span>
        <span class="pill">${question.subject}</span>
        <span class="pill">解答番号 ${question.answer_no || "-"}</span>
        <span class="pill">典型度 ${question.typicality}</span>
      </div>
      <h2 class="title">${escapeHtml(question.unit)} / 第${question.major_no}問 ${escapeHtml(question.middle_no)} ${escapeHtml(question.minor_no)}</h2>
      <p class="summary">${escapeHtml(question.summary)}</p>
    `;
    card.addEventListener("click", () => selectQuestion(question.id));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectQuestion(question.id);
      }
    });
    elements.results.append(card);
  }

  if (selectedId && !filtered.some((question) => question.id === selectedId)) {
    selectedId = "";
    showEmptyDetail();
  }
}

function selectQuestion(id) {
  selectedId = id;
  const question = questions.find((item) => item.id === id);
  if (!question) return;
  renderDetail(question);
  render();
}

function renderDetail(question) {
  const pdfHref = resolveAssetPath(question.pdf_path);
  const sourceLinks = renderSourceLinks(question);
  const correctRate = renderCorrectRate(question);
  const imageContent = renderQuestionImages(question);

  const pdfLink = question.pdf_path
    ? `<a href="${escapeAttribute(pdfHref)}" target="_blank" rel="noreferrer">PDFを開く</a>`
    : "";

  elements.detailPanel.className = "";
  elements.detailPanel.innerHTML = `
    <h2>${question.year} ${labels[question.exam_system] ?? question.exam_system} ${labels[question.session] ?? question.session} ${question.subject}</h2>
    <dl class="detail-grid">
      <dt>番号</dt><dd>第${question.major_no}問 ${escapeHtml(question.middle_no)} ${escapeHtml(question.minor_no)}</dd>
      <dt>解答番号</dt><dd>${escapeHtml(question.answer_no || "未登録")}</dd>
      <dt>単元</dt><dd>${escapeHtml(question.unit)}</dd>
      <dt>典型度</dt><dd>${escapeHtml(question.typicality)}</dd>
      <dt>正答</dt><dd>${renderAnswerReveal(question)}</dd>
      <dt>配点</dt><dd>${question.points == null ? "未登録" : `${question.points}点`}</dd>
      <dt>正答率</dt><dd>${correctRate}</dd>
      <dt>掲載ページ</dt><dd>${escapeHtml(question.page || "未登録")}</dd>
      <dt>要約</dt><dd>${escapeHtml(question.summary)}</dd>
      <dt>キーワード</dt>
      <dd class="keywords">${(question.keywords ?? []).map((keyword) => `<span class="pill">${escapeHtml(keyword)}</span>`).join("")}</dd>
    </dl>
    <div class="link-row">${pdfLink}</div>
    <div class="image-box${hasQuestionImages(question) ? " has-images" : ""}">${imageContent}</div>
    ${sourceLinks}
    ${question.notes ? `<div class="note">${escapeHtml(question.notes)}</div>` : ""}
  `;
}

function renderAnswerReveal(question) {
  const answer = escapeHtml(question.answer || "未登録");
  return `
    <details class="answer-reveal">
      <summary>正答を表示</summary>
      <span>${answer}</span>
    </details>
  `;
}

function hasQuestionImages(question) {
  return getQuestionImages(question).length > 0;
}

function getQuestionImages(question) {
  const images = [];
  if (Array.isArray(question.image_paths)) images.push(...question.image_paths);
  if (question.image_path) images.push(question.image_path);
  return [...new Set(images.filter(Boolean))];
}

function renderQuestionImages(question) {
  const images = getQuestionImages(question);
  if (images.length === 0) {
    return "図画像は未登録です。PDF保存後に切り出して登録します。";
  }

  return images.map((imagePath, index) => `
    <figure>
      <img src="${escapeAttribute(resolveAssetPath(imagePath))}" alt="問題画像${images.length > 1 ? ` ${index + 1}` : ""}" loading="lazy">
      ${images.length > 1 ? `<figcaption>${index + 1} / ${images.length}</figcaption>` : ""}
    </figure>
  `).join("");
}

function renderCorrectRate(question) {
  if (question.correct_rate == null) return "未登録";

  const rateText = `${escapeHtml(formatPercent(question.correct_rate))}%`;
  if (!question.correct_rate_source_url) return rateText;

  const sourceName = question.correct_rate_source_name || "出典";
  return `
    <span>${rateText}</span>
    <a class="inline-source-link" href="${escapeAttribute(question.correct_rate_source_url)}" target="_blank" rel="noreferrer">
      ${escapeHtml(sourceName)}
    </a>
  `;
}

function formatPercent(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function renderSourceLinks(question) {
  const matchedSources = getSourcesForQuestion(question);
  if (matchedSources.length === 0) return "";

  return `
    <section class="source-links" aria-label="出典リンク">
      <h3>出典リンク</h3>
      <div class="source-link-list">
        ${matchedSources.map((source) => `
          <a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">
            <span>${escapeHtml(sourceKindLabels[source.kind] ?? source.kind)}</span>
            <small>${escapeHtml(source.source_name || "source")}</small>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function getSourcesForQuestion(question) {
  const kindOrder = ["question_page", "question", "answer_page", "answer", "analysis"];
  return sources
    .filter((source) => {
      return (
        source.year === question.year &&
        source.exam_system === question.exam_system &&
        source.session === question.session &&
        source.subject === question.subject &&
        source.url
      );
    })
    .sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind));
}

function showEmptyDetail() {
  elements.detailPanel.className = "empty";
  elements.detailPanel.textContent = "問題を選択すると詳細が表示されます。";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function resolveAssetPath(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `../${path}`;
}

for (const element of [
  elements.query,
  elements.subject,
  elements.examSystem,
  elements.session,
  elements.typicality,
  elements.year,
  elements.sortOrder,
]) {
  element.addEventListener("input", render);
}

loadQuestions().catch((error) => {
  elements.results.innerHTML = `<div class="card">${escapeHtml(error.message)}</div>`;
});
