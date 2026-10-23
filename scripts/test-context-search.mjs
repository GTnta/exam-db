import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { isScratchPage, trimQuestionEnd } from './source-image-bounds.mjs';
const require=createRequire(import.meta.url);
const search=require('../app/search.js');
const root=path.resolve(import.meta.dirname,'..');
const read=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const questions=read('data/questions.json');
const contexts=new Map(read('data/contexts.json').map((c)=>[c.id,c]));
const questionCrops=new Map(read('data/question-image-crops.json').map((a)=>[a.path,a]));
const byId=new Map(questions.map((q)=>[q.id,q]));
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const query=(id,word)=>search.matchQuestion(byId.get(id),word);
const positives=[
  ['2016_center_main_physics_a15','円運動',2],
  ['2016_center_main_physics_a16','円運動',3],
  ['2016_center_main_physics_a15','力学的エネルギー保存則',3],
  ['2016_center_main_physics_a16','向心力',3],
  ['2023_common_main_physics_a18','ドップラー',3],
  ['2010_center_main_physics1_a14','全反射',3],
  ['2018_center_main_physics_a13','光の干渉',3],
  ['2011_center_main_physics1_a10','電磁誘導',3],
  ['2016_center_main_physics_basic_a07','縦波',3],
  ['2019_center_main_physics_a18','円運動',2],
  ['2017_center_main_physics_a18','円運動',2],
];
for (const [id,word,tier] of positives) check(query(id,word).tier===tier,`${id} must match ${word} at tier ${tier}`);
for (const [id,word] of [
  ['2016_center_main_physics_a17','円運動'],['2016_center_main_physics_a18','円運動'],
  ['2016_center_main_physics_a16','等速円運動'],['2018_center_main_physics_a13','弦の振動'],
  ['2010_center_main_physics1_a14','音波'],['2015_center_main_physics_a03','ばね'],
  ['2024_common_makeup_physics_basic_a07','投げ下ろす'],
]) check(!query(id,word).matched,`${id} must not match ${word}`);
check(query('2016_center_main_physics_a15','円運動 エネルギー保存').matched,'AND can combine method and context');
check(!query('2016_center_main_physics_a15','円運動 ドップラー').matched,'AND must keep every term');
check(!search.matchQuestion(byId.get('2016_center_main_physics_a15'),'円運動','direct').matched,'Direct-only excludes context');
check(search.matchQuestion(byId.get('2016_center_main_physics_a16'),'円運動','direct').matched,'Direct-only keeps direct match');
check(query('2016_center_main_physics_a16','円運動').score>query('2016_center_main_physics_a15','円運動').score,'Direct outranks context');
check(!search.inferTopics('正弦波でない音波の波形').includes('弦の振動'),'正弦 must not imply a string');
check(!search.inferTopics('惑星の楕円軌道').includes('円運動'),'An elliptical orbit is not a circular orbit');
check(!search.inferTopics('空気抵抗と摩擦は無視できるものとする').includes('抵抗'),'Air drag must not imply an electric resistor');
check(!search.inferTopics('摩擦を無視する').includes('摩擦'),'Ignored friction is not a topic');
check(search.normalize('ｐ－Ｖ グラフ')===search.normalize('pVグラフ'),'Graph spelling variants');
check(search.normalize('コンデンサ')===search.normalize('コンデンサー'),'Capacitor spelling variants');
check(questions.some((q)=>search.matchQuestion(q,'ドップラー 回転').matched),'Rotating sound source query must work');

const line=(text,y=.12)=>({text,y});
const scratch={lines:[line('(下書き用紙)'),line('物理の試験間題は次に続く。',.5)]};
const continuation={lines:[line('選択肢の続き',.3)]};
check(isScratchPage(scratch),'Scratch detection tolerates OCR 間題');
check(!isScratchPage({lines:[]}), 'A diagram-only page is not scratch paper');
check(!isScratchPage({lines:[line('下書き用紙'),line('問4 次の問い')]}),'A question marker prevents scratch removal');
const endOfContinuation=trimQuestionEnd([continuation,scratch,{lines:[line('物 理')]}],{page:1,y:.2},{page:3,y:.15});
check(endOfContinuation.page===1 && endOfContinuation.y===.985,'Remove following running-header strip and scratch paper');
check(trimQuestionEnd([continuation,{lines:[line('物',.07),line('理',.07),line('問4',.11)]}],{page:1,y:.2},{page:2,y:.11}).page===1,'Split subject letters do not create an extra page');
for (const text of ['出題範囲：物理基礎','0 ロ','物 理 1','物 理 第5問・第6問は，いずれか1問を選択し，解答しなさい。']) {
  check(trimQuestionEnd([continuation,{lines:[line(text,.07)]}],{page:1,y:.2},{page:2,y:.16}).page===1,`Exclude running-header-only strip: ${text}`);
}
check(trimQuestionEnd([continuation,continuation],{page:1,y:.2},{page:2,y:.7}).page===2,'Keep a genuine continuation page');
check(trimQuestionEnd([continuation,{lines:[]}],{page:1,y:.2},{page:2,y:.985}).page===2,'Do not discard diagrams based on absent OCR');

for (const q of questions) {
  const m=q.search_metadata, c=contexts.get(m?.context_id);
  check(c?.question_ids.includes(q.id),`${q.id} context membership`);
  check(m.domains.length>0,`${q.id} domain coverage`);
  check(m.direct_tags.length>0,`${q.id} direct-topic coverage`);
  check(!m.direct_tags.some((tag)=>m.context_tags.includes(tag)),`${q.id} tiers overlap`);
  check(m.body_text.length>5,`${q.id} bounded source text`);
  check(q.source_location.pdf_page>=c.start.page,`${q.id} source order`);
  const paths=new Set();
  for (const asset of q.context_images) {
    check(asset.source_pdf===q.pdf_path,`${q.id} crossed source PDF`);
    check(asset.pdf_page<=q.source_location.pdf_page,`${q.id} includes future page`);
    check(asset.pdf_page<q.source_location.pdf_page || asset.bottom<=q.source_location.y,`${q.id} includes current/future question`);
    check(!paths.has(asset.path),`${q.id} duplicate context image`);
    check(fs.existsSync(path.join(root,asset.path)),`${q.id} missing ${asset.path}`);
    paths.add(asset.path);
  }
  check(q.question_images.length>0,`${q.id} selected source images`);
  check(JSON.stringify(q.image_paths)===JSON.stringify(q.question_images.map((a)=>a.path)),`${q.id} displayed images must use bounded source ranges`);
  check(q.image_path===q.question_images[0].path,`${q.id} primary image must use bounded source range`);
  let previousPage=0;
  for (const asset of q.question_images) {
    check(asset.source_pdf===q.pdf_path,`${q.id} selected image crossed source PDF`);
    check(asset.pdf_page>=q.source_location.pdf_page && asset.pdf_page<=q.source_location.end_pdf_page,`${q.id} selected image outside source pages`);
    check(asset.pdf_page!==q.source_location.pdf_page || asset.top>=q.source_location.y-.013,`${q.id} selected image starts too early`);
    check(asset.pdf_page!==q.source_location.end_pdf_page || asset.bottom<=q.source_location.end_y,`${q.id} selected image includes later content`);
    check(asset.top>=0 && asset.bottom<=1 && asset.bottom>asset.top,`${q.id} invalid selected crop`);
    check(asset.pdf_page>previousPage,`${q.id} duplicate/reversed selected page`);
    check(JSON.stringify(questionCrops.get(asset.path))===JSON.stringify(asset),`${q.id} selected crop registry mismatch`);
    check(fs.existsSync(path.join(root,asset.path)),`${q.id} selected image missing`);
    previousPage=asset.pdf_page;
  }
}
const reported=byId.get('2019_center_main_physics_a19');
check(reported.source_location.pdf_page===27 && reported.source_location.end_pdf_page===27,'2019 Q4 B Q4 must stop on its actual page');
check(JSON.stringify(reported.question_images.map((a)=>a.pdf_page))==='[27]','2019 Q4 B Q4 excludes scratch page 28 and next-major page 29');
check(reported.context_images.some((a)=>a.pdf_page===25) && reported.context_images.some((a)=>a.pdf_page===26),'2019 Q4 B Q4 keeps its preceding setup');
check(!/下書き用紙|第\s*5\s*問/.test(reported.search_metadata.body_text),'2019 selected body excludes scratch paper and next-major instructions');
for (const [id,pages] of [
  ['2023_common_makeup_physics_a06',[10,11]],
  ['2023_common_main_physics_a21',[21,22]],
  ['2025_common_main_physics_a08',[9]],
  ['2024_common_main_physics_basic_a06',[7,8]],
  ['2021_common_main_physics_a20',[21,22,23]],
]) check(JSON.stringify(byId.get(id).question_images.map((a)=>a.pdf_page))===JSON.stringify(pages),`${id} keeps necessary figures/options and excludes later setup`);
const first=byId.get('2016_center_main_physics_a15');
const second=byId.get('2016_center_main_physics_a16');
check(first.source_location.pdf_page===25 && second.source_location.pdf_page===26,'2016 uses actual PDF pages');
check(first.context_images.some((asset)=>asset.pdf_page===25 && asset.top<.3 && asset.bottom>.7),'2016 Q1 includes setup and diagram');
check(second.context_images.some((asset)=>asset.pdf_page===25),'2016 Q2 includes setup and earlier Q1');
console.log(`PASS: ${checks} checks, ${questions.length} questions, ${contexts.size} contexts`);
