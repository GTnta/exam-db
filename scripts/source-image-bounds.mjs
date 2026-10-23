const compact = (text) => String(text ?? '').normalize('NFKC').replace(/\s+/g, '');

function onlyRunningHeaders(lines) {
  const text = compact(lines.map((line) => line.text).join(''));
  return /^(?:(?:出題範囲:)?物理(?:基礎|II?|[12])?|第\d+問[・,、]第\d+問は[,、]?|いずれか1問を選択し[,、]?解答しなさい[。.]?|[0ロ口〇○]{2})*$/.test(text);
}

// OCR sometimes reads 問題 as 間題. The explicit scratch-paper heading is
// sufficient; never discard a diagram-only continuation for having little text.
export function isScratchPage(page) {
  const lines = (page?.lines ?? []).map((line) => compact(line.text));
  return lines.some((text) => /下書き用紙/.test(text)) &&
    !lines.some((text) => /^(?:問\d|第\d+問)/.test(text)) &&
    lines.join('').length < 250;
}

export function trimQuestionEnd(pages, start, end) {
  let trimmed = { ...end };
  while (trimmed.page > start.page) {
    const page = pages[trimmed.page - 1];
    const beforeEnd = (page?.lines ?? []).filter((line) => line.y > .055 && line.y < trimmed.y - .012)
      .sort((a,b) => Math.round(a.y*200)-Math.round(b.y*200) || (a.x ?? 0)-(b.x ?? 0));
    // A next-major heading can follow only the running subject header at the
    // top of a new page. Do not add that otherwise unrelated page to this item.
    const headerOnly = trimmed.y < .25 && onlyRunningHeaders(beforeEnd);
    if (!isScratchPage(page) && !headerOnly) break;
    trimmed = { page: trimmed.page - 1, y: .985 };
  }
  return trimmed;
}
