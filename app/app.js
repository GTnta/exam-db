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
    ...(question.keywords ?? []),
  ].join(" "));
}

function scoreQuestion(question, terms) {
  if (terms.length === 0) return 1;

  const text = searchableText(question);
  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += 4;
    if (normalize(question.unit).includes(term)) score += 3;
    if ((question.keywords ?? []).some((keyword) => normalize(keyword).includes(term))) score += 5;
    if (normalize(question.summary).includes(term)) score += 2;
    if (normalize(question.problem_text).includes(term)) score += 3;
    if (normalize(question.masked_problem_text).includes(term)) score += 3;
  }
  return score;
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
      <dt>正答</dt><dd>${escapeHtml(question.answer || "未登録")}</dd>
      <dt>配点</dt><dd>${question.points == null ? "未登録" : `${question.points}点`}</dd>
      <dt>正答率</dt><dd>${correctRate}</dd>
      <dt>掲載ページ</dt><dd>${escapeHtml(question.page || "未登録")}</dd>
      <dt>要約</dt><dd>${escapeHtml(question.summary)}</dd>
      <dt>キーワード</dt>
      <dd class="keywords">${(question.keywords ?? []).map((keyword) => `<span class="pill">${escapeHtml(keyword)}</span>`).join("")}</dd>
    </dl>
    <div class="image-box${hasQuestionImages(question) ? " has-images" : ""}">${imageContent}</div>
    <div class="link-row">${pdfLink}</div>
    ${sourceLinks}
    ${question.notes ? `<div class="note">${escapeHtml(question.notes)}</div>` : ""}
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
