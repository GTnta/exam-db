import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { isScratchPage, trimQuestionEnd } from './source-image-bounds.mjs';
const require = createRequire(import.meta.url);
const search = require('../app/search.js');
const root = path.resolve(import.meta.dirname, '..');
fs.mkdirSync(path.join(root,'worklogs'),{recursive:true});
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const write = (file, data) => fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + '\n');
const questions = read('data/questions.json');
const compact = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, '');
const number = (v) => Number(compact(v).match(/\d+/)?.[0] ?? 0);
const unique = (values) => [...new Set(values.filter(Boolean))];
const position = (mark) => mark.page + mark.y;
const earlier = (a, b) => position(a) < position(b) - 0.001;
const groupKey = (q) => `${q.pdf_path}|${q.major_no}|${q.middle_no || ''}|${number(q.minor_no)}`;
const sectionKey = (q) => q.major_no === 1 ? groupKey(q) : `${q.pdf_path}|${q.major_no}|${q.middle_no || ''}`;
const overrides = read('data/search-overrides.json');
for (const q of questions) Object.assign(q, overrides.record_fixes?.[q.id]?.fields ?? {});

// Use original PDF page coordinates, never the recovered image-crops.json
// whose "pdf_page" values can actually be printed page labels.
const oldAssets = new Map();
for (const file of fs.readdirSync(path.join(root, 'worklogs')).filter((f) => /^(?:ocr|pdfium)-question-assets-.*\.json$/.test(f)).sort()) {
  for (const record of read(`worklogs/${file}`).records ?? []) {
    if (record.crop_rows?.length) oldAssets.set(record.id, { ...record, manifest: file });
  }
}
const recentManifest='worklogs/2025-main-physics-question-assets-manifest.json';
for (const record of (fs.existsSync(path.join(root,recentManifest)) ? read(recentManifest).records : []) ?? []) {
  if (record.crop_rows?.length) oldAssets.set(record.id, record);
}
// The committed locations keep future rebuilds independent of ignored historic
// worklogs. New rows still require a matching source marker or a review override.
for (const q of questions) if (q.source_location) oldAssets.set(q.id,{crop_rows:[{pdf_page:q.source_location.pdf_page}]});
const byPdf = Map.groupBy(questions, (q) => q.pdf_path);
const contexts = [];
const missing = [];
const anchorReport = [];
const segments = new Map();
const questionSegments = new Map();
const contextualHints=new Map();

function sliceLines(pages, start, end) {
  const lines = [];
  for (let p = start.page; p <= end.page; p++) {
    for (const line of [...(pages[p-1]?.lines ?? [])].sort((a,b) => Math.round(a.y*200)-Math.round(b.y*200) || a.x-b.x)) {
      const mark = { page: p, y: line.y };
      if (!earlier(mark, start) && earlier(mark, end) && line.y > 0.055 && line.y < 0.98) lines.push(line.text);
    }
  }
  return lines.join(' ').replace(/[\x00-\x08\x0B-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
}
function imageSegments(pdf, start, end, pages, kind = 'context') {
  const result = [];
  for (let p = start.page; p <= end.page; p++) {
    const top = p === start.page ? Math.max(0.04, start.y - 0.012) : 0.06;
    const bottom = p === end.page ? Math.min(0.985, end.y - 0.012) : 0.985;
    if (bottom - top < 0.025) continue;
    if (isScratchPage(pages[p-1])) continue;
    if (bottom < 0.15 && !(pages[p-1]?.lines ?? []).some((l) => l.y>=top && l.y<bottom && !/^物理(?:基礎|I|Ⅰ)?$/.test(compact(l.text)))) continue;
    const rel = `data/images/${kind === 'question' ? 'selected' : 'context'}/${path.basename(pdf, '.pdf')}-${p}-${Math.round(top*10000)}-${Math.round(bottom*10000)}.jpg`;
    const asset = { path: rel, source_pdf: pdf, pdf_page: p, top, bottom };
    (kind === 'question' ? questionSegments : segments).set(rel, asset);
    result.push(asset);
  }
  return result;
}

// Align the actual question-marker sequence to the expected question numbers.
// Skipped markers and missing markers are explicit, never silently shifted.
function align(groups, candidates) {
  const n = groups.length, m = candidates.length;
  const dp = Array.from({ length: n+1 }, () => Array(m+1).fill(Infinity));
  const prev = Array.from({ length: n+1 }, () => Array(m+1));
  dp[0][0] = 0;
  const update = (i, j, value, from) => { if (value < dp[i][j]) { dp[i][j] = value; prev[i][j] = from; } };
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const cost = dp[i][j];
    if (j < m) update(i, j+1, cost+4, [i,j,'skip']);
    if (i < n) update(i+1, j, cost+24, [i,j,'missing']);
    if (i < n && j < m && groups[i].no === candidates[j].no) {
      const crops = oldAssets.get(groups[i].records[0].id)?.crop_rows;
      const expected = crops?.[0]?.pdf_page;
      const distance = expected ? Math.abs(candidates[j].page - expected) : 0;
      update(i+1, j+1, cost + Math.min(18, distance*2), [i,j,'match']);
    }
  }
  let i=n, j=m;
  const result = new Map();
  while (i || j) {
    const [pi,pj,action] = prev[i][j];
    if (action === 'match') result.set(groups[pi].key, candidates[pj]);
    i=pi; j=pj;
  }
  return result;
}

for (const [pdf, records] of byPdf) {
  const stem = path.basename(pdf, '.pdf');
  const files = fs.readdirSync(path.join(root, 'data/_tmp/source-layout')).filter((f) => f.startsWith(`${stem}-`) && f.endsWith('.json'));
  const pages = files.map((file) => read(`data/_tmp/source-layout/${file}`)).sort((a,b) => a.page-b.page);
  if (!pages.length || pages.some((p,i) => p.page !== i+1)) throw new Error(`Incomplete source layout: ${pdf}`);
  const ordered = [...records].sort((a,b) => number(a.major_no)-number(b.major_no) || number(a.minor_no)-number(b.minor_no) || number(a.id.split('_a')[1])-number(b.id.split('_a')[1]));
  const groups = [...Map.groupBy(ordered, groupKey)].map(([key,records]) => ({key, records, no:number(records[0].minor_no)}));
  const markers = [], headers = [];
  for (const page of pages) for (const line of page.lines) {
    const text = compact(line.text);
    const mark = { page:page.page, y:line.y, x:line.x, text:line.text };
    const q = line.text.normalize('NFKC').match(/^問\s*[・.．]?\s*(\d+)/);
    if (q && line.x < 0.33 && line.y < 0.92) {
      // Native text can join "問1" directly to the first number, e.g. "20℃".
      let no=Number(q[1]);
      if (no > Math.max(...groups.map((g) => g.no))) no=Number(q[1][0]);
      markers.push({...mark, no});
    }
    const major = text.match(/^第(\d+)問/);
    if (major && line.x < 0.3) headers.push({...mark, major:Number(major[1]), middle:''});
    const middle = line.text.normalize('NFKC').match(/^([ABCabc])(?:\s+|(?=[^a-zA-Z]|$))/);
    if (middle && !/^[ABCabc]さん/.test(text) && line.x < 0.22 && (text.length > 5 || page.lines.some((other) => Math.abs(other.y-line.y)<0.035 && compact(other.text).length>15))) {
      headers.push({...mark, major:null, middle:middle[1].toUpperCase()});
    }
  }
  markers.sort((a,b) => position(a)-position(b));
  const aligned = align(groups, markers);
  for (const group of groups) {
    const manual = overrides.anchors?.[group.records[0].id];
    if (manual) aligned.set(group.key, manual);
    if (!aligned.has(group.key)) missing.push({id:group.records[0].id, key:group.key, reason:'missing-question-marker'});
  }
  if (groups.some((g) => !aligned.has(g.key))) continue;
  const sections = [...Map.groupBy(groups, (g) => sectionKey(g.records[0]))];
  const sectionStarts = new Map();
  for (const [key, section] of sections) {
    const first = section[0];
    const q = first.records[0];
    const mark = aligned.get(first.key);
    const groupIndex = groups.indexOf(first);
    const prevMark = groupIndex ? aligned.get(groups[groupIndex-1].key) : {page:1,y:0};
    const manual = overrides.sections?.[key]?.start;
    if (manual) { sectionStarts.set(key,manual); continue; }
    if (q.major_no === 1) { sectionStarts.set(key,mark); continue; }
    let between = headers.filter((h) => earlier(prevMark,h) && earlier(h,mark));
    const majorStart = between.find((h) => h.major === number(q.major_no));
    if (majorStart) between = between.filter((h) => !earlier(h,majorStart));
    const matching = between.filter((h) => q.middle_no ? h.middle===q.middle_no : h.major===number(q.major_no))
      .sort((a,b) => a.x-b.x || position(a)-position(b));
    const start = matching[0] ?? between.find((h) => h.major===number(q.major_no));
    if (!start) missing.push({id:q.id,key,reason:'missing-section-heading',marker:mark,headers:between});
    sectionStarts.set(key, start ?? mark);
  }
  for (const [key, section] of sections) {
    const start = sectionStarts.get(key);
    const firstMark = aligned.get(section[0].key);
    const firstRecord=section[0].records[0];
    const majorHeaders=headers.filter((h) => h.major===number(firstRecord.major_no) && earlier(h,start)).sort((a,b) => position(b)-position(a));
    const majorStart=majorHeaders[0];
    const firstBranch=majorStart && headers.filter((h) => h.middle==='A' && earlier(majorStart,h) && !earlier(start,h)).sort((a,b) => position(a)-position(b))[0];
    const sharedIntro=firstRecord.middle_no && majorStart && firstBranch ? {start:majorStart,end:firstBranch} : null;
    const sharedText=sharedIntro ? sliceLines(pages,sharedIntro.start,sharedIntro.end) : '';
    const leadText = [sharedText,sliceLines(pages,start,firstMark)].filter(Boolean).join(' ');
    const allRecords = section.flatMap((g) => g.records);
    const contextId = `${stem}-m${allRecords[0].major_no}-${allRecords[0].middle_no || (allRecords[0].major_no === 1 ? `q${number(allRecords[0].minor_no)}` : 'all')}`;
    const sectionOverride = overrides.sections?.[key] ?? {};
    for (const q of allRecords) {
      const summaryTags = search.inferTopics(q.summary);
      const nonDomains = (q.unit ?? '').split(/[・/／]/).slice(1).filter((t) => !['力学','熱','波動','波','電磁気','電気','原子','エネルギー'].includes(t));
      const manual = overrides.questions?.[q.id];
      let direct = search.withParents(manual?.direct_tags ?? unique([...summaryTags, ...search.inferTopics(nonDomains.join(' ')), ...nonDomains]));
      // Circular motion can be the setting for an energy/Doppler question.
      // Keep it below the actual method unless a centripetal equation is used.
      if (!manual && /円運動/.test(q.summary) && /エネルギー保存|ドップラー|観測振動数|観測される振動数|音速と波長/.test(q.summary) && !/向心|円運動方程式|円運動の運動方程式|角速度|周期/.test(q.summary)) {
        const hints=direct.filter((tag) => /円運動/.test(tag));
        contextualHints.set(q.id,hints);
        direct=direct.filter((tag) => !hints.includes(tag));
      }
      q.search_metadata = {version:1, direct_tags:direct, context_tags:[], domains:[], context_id:contextId,
        provenance: manual ? 'source-reviewed-override' : 'summary-and-unit-rules'};
      if (manual?.summary) q.summary=manual.summary;
    }
    const soundRotation = /音源/.test(compact(leadText)) && /等速円運動/.test(compact(leadText)) ? ['回転する音源', '音源の円運動'] : [];
    const contextual = search.withParents(unique([...search.inferTopics(leadText), ...soundRotation, ...(sectionOverride.tags ?? [])]));
    const domains = inferDomains(leadText, '');
    for (const group of section) {
      const mark = aligned.get(group.key);
      const index = groups.indexOf(group);
      const next = groups[index+1];
      const nextKey = next && sectionKey(next.records[0]);
      let end = next ? (nextKey !== key ? sectionStarts.get(nextKey) : aligned.get(next.key)) : {page:pages.length,y:0.985};
      if (next && next.records[0].major_no !== group.records[0].major_no) {
        const majorEnd=headers.filter((h) => h.major===number(next.records[0].major_no) && earlier(mark,h) && !earlier(end,h))
          .sort((a,b) => position(a)-position(b))[0];
        if (majorEnd) end=majorEnd;
      }
      end = trimQuestionEnd(pages, mark, end);
      const reviewedEnd = overrides.question_ends?.[group.records[0].id];
      if (reviewedEnd) {
        if (earlier(end,reviewedEnd)) throw new Error(`Reviewed end exceeds structural boundary: ${group.key}`);
        end = {page:reviewedEnd.page,y:reviewedEnd.y};
      }
      if (!earlier(mark,end)) throw new Error(`Reversed source bounds: ${group.key}`);
      const bodyText = sliceLines(pages,mark,end);
      const precedingText=[sharedText,sliceLines(pages,start,mark)].filter(Boolean).join(' ');
      const precedingTopics=search.inferTopics(precedingText);
      const contiguous=sharedIntro && Math.abs(position(sharedIntro.end)-position(start))<0.001;
      const assets = contiguous ? imageSegments(pdf,sharedIntro.start,mark,pages) :
        [...(sharedIntro ? imageSegments(pdf,sharedIntro.start,sharedIntro.end,pages) : []), ...imageSegments(pdf,start,mark,pages)];
      const selectedAssets = imageSegments(pdf,mark,end,pages,'question');
      if (!selectedAssets.length) throw new Error(`Empty question image range: ${group.key}`);
      for (const q of group.records) {
        const direct=q.search_metadata.direct_tags;
        q.search_metadata.context_tags=unique([...contextual,...precedingTopics,...(contextualHints.get(q.id)??[])]).filter((tag) => !direct.includes(tag));
        q.search_metadata.domains=unique([...inferDomains(q.summary,q.unit),...domains]);
        q.search_metadata.body_text=bodyText;
        q.search_metadata.context_text=precedingText;
        q.context_images=assets;
        q.question_images=selectedAssets;
        q.image_paths=selectedAssets.map((asset) => asset.path);
        q.image_path=q.image_paths[0];
        q.source_location={pdf_page:mark.page,y:mark.y,end_pdf_page:end.page,end_y:end.y};
        anchorReport.push({id:q.id,marker:mark,end,context_start:start});
      }
    }
    contexts.push({id:contextId,source_pdf:pdf,question_ids:allRecords.map((q) => q.id),start,shared_intro:sharedIntro,first_question:firstMark,lead_text:leadText,tags:contextual,
      provenance: sectionOverride.tags ? 'source-reviewed-and-section-rules' : 'source-lead-and-section-rules'});
  }
}
function inferDomains(text, fallback) {
  const s=search.evidenceText(text);
  const tests=[
    ['力学',/力学|運動方程式|等加速度|衝突|運動量|円運動|単振動|摩擦|モーメント|浮力|重心|力のつり|ばね|投射|投げ上げ|鉛直投げ|重力|万有引力/],
    ['波動',/波動|波長|音波|音速|ドップラー|うなり|干渉|回折|屈折|レンズ|定常波|定在波|縦波|横波|気柱|光速/],
    ['熱',/気体|温度|熱量|比熱|熱容量|潜熱|熱平衡|熱力学|熱機関|内部エネルギー|状態方程式|pVグラフ/],
    ['電磁気',/電流|電場|電位|電圧|電荷|電気|磁場|磁界|磁石|電磁|コンデンサ|抵抗|コイル|変圧器|電力|ローレンツ|静電/],
    ['原子',/原子核|放射線|半減期|光電効果|光子|仕事関数|核分裂|核融合|物質波|ド.?ブロイ|X線|エネルギー準位|クォーク/],
    ['エネルギー',/エネルギー変換|発電|エネルギー資源/],
    ['基礎事項',/次元|物理量|単位/],
  ];
  const found=tests.filter(([,regex]) => regex.test(s)).map(([name]) => name);
  if (found.length) return found;
  return unique(compact(fallback).split(/[・/]/).map((x) => x==='波'?'波動':x==='電気'?'電磁気':x).filter((x) => tests.some(([name]) => name===x)));
}
write('worklogs/context-metadata-audit.json',{questions:questions.length,contexts:contexts.length,segments:segments.size,question_segments:questionSegments.size,missing,anchors:anchorReport});
console.log(JSON.stringify({questions:questions.length,contexts:contexts.length,segments:segments.size,question_segments:questionSegments.size,missing},null,2));
if (missing.length) process.exitCode=1;
if (!process.argv.includes('--analyze') && !missing.length) {
  write('data/questions.json',questions);
  write('data/contexts.json',contexts);
  write('data/context-image-crops.json',[...segments.values()]);
  write('data/question-image-crops.json',[...questionSegments.values()]);
}
