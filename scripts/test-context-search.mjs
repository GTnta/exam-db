import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const search=require('../app/search.js');
const root=path.resolve(import.meta.dirname,'..');
const read=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const questions=read('data/questions.json');
const contexts=new Map(read('data/contexts.json').map((c)=>[c.id,c]));
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
  for (const image of new Set([q.image_path,...(q.image_paths??[])])) {
    check(fs.existsSync(path.join(root,image)),`${q.id} existing image missing`);
  }
}
const first=byId.get('2016_center_main_physics_a15');
const second=byId.get('2016_center_main_physics_a16');
check(first.source_location.pdf_page===25 && second.source_location.pdf_page===26,'2016 uses actual PDF pages');
check(first.context_images.some((asset)=>asset.pdf_page===25 && asset.top<.3 && asset.bottom>.7),'2016 Q1 includes setup and diagram');
check(second.context_images.some((asset)=>asset.pdf_page===25),'2016 Q2 includes setup and earlier Q1');
console.log(`PASS: ${checks} checks, ${questions.length} questions, ${contexts.size} contexts`);
