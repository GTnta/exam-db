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

const { splitTerms, matchQuestion } = PhysicsSearch;

function getFilteredQuestions() {
  const terms = splitTerms(elements.query.value);
  const filters = {
    subject: elements.subject.value,
    exam_system: elements.examSystem.value,
    session: elements.session.value,
    typicality: elements.typicality.value,
    year: elements.year.value ? Number(elements.year.value) : null,
  };
  return questions
    .filter((q) => Object.entries(filters).every(([key, value]) => !value || q[key] === value))
    .map((question) => ({ question, ...matchQuestion(question, terms) }))
    .filter((item) => item.matched)
    .sort((a, b) => compareResults(a, b, elements.sortOrder.value))
    .map(({ question }) => question);
}

function renderMatchReason(question) {
  if (!elements.query.value.trim()) return "";
  const result = matchQuestion(question, elements.query.value);
  return `<p class="match-reason">${result.matches.map((match) =>
    `<span class="pill match-${match.tier}">${escapeHtml(match.label)}：${escapeHtml(match.term)}</span>`
  ).join(" ")}</p>`;
}

function renderTags(tags, className = "") {
  return (tags ?? []).map((tag) => `<span class="pill ${className}">${escapeHtml(tag)}</span>`).join(" ");
}

function compareResults(a, b, sortOrder) {
  if (sortOrder === "year_asc") {
    return a.question.year - b.question.year || compareQuestionOrder(a.question, b.question);
  }

  if (sortOrder === "year_desc") {
    return b.question.year - a.question.year || compareQuestionOrder(a.question, b.question);
  }

  return b.tier - a.tier || b.score - a.score || b.question.year - a.question.year || compareQuestionOrder(a.question, b.question);
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
      ${renderMatchReason(question)}
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
  const pdfHref = resolveAssetPath(question.pdf_path) + (question.source_location ? `#page=${question.source_location.pdf_page}` : "");
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
      <dt>PDFページ</dt><dd>${escapeHtml(question.source_location?.pdf_page || "未登録")}</dd>
      <dt>要約</dt><dd>${escapeHtml(question.summary)}</dd>
      <dt>分野</dt><dd class="keywords">${renderTags(question.search_metadata?.domains)}</dd>
      <dt>直接の内容</dt><dd class="keywords">${renderTags(question.search_metadata?.direct_tags, "match-3")}</dd>
      <dt>状況・文脈</dt><dd class="keywords">${renderTags(question.search_metadata?.context_tags, "match-2") || "追加の文脈タグなし"}</dd>
    </dl>
    <div class="link-row">${pdfLink}</div>
    ${renderContextImages(question)}
    <section aria-label="選択した小問"><h3 class="image-heading">選択した小問</h3>
      <div class="image-box${hasQuestionImages(question) ? " has-images" : ""}">${imageContent}</div>
    </section>
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

function renderContextImages(question) {
  const images = question.context_images ?? [];
  if (!images.length) return "";
  return `<section class="context-section" aria-label="状況設定と前の設問">
    <h3 class="image-heading">状況設定・前の設問</h3>
    <p>この小問より前にある共通の条件や図を掲載しています。</p>
    <div class="image-box has-images">${images.map((asset) => `<figure>
      <img src="${escapeAttribute(resolveAssetPath(asset.path))}" alt="共通の状況設定・PDF ${asset.pdf_page}ページ" loading="lazy">
      <figcaption>PDF ${asset.pdf_page}ページ</figcaption>
    </figure>`).join("")}</div>
  </section>`;
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
