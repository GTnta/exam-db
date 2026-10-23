/* Shared by the browser, metadata builder and retrieval regression tests. */
(function (root) {
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const normalize = (value) => String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/コンデンサ(?!ー)/g, 'コンデンサー').replace(/バネ/g, 'ばね')
    .replace(/ドップラー効果|doppler/g, 'ドップラー')
    .replace(/定常波/g, '定在波').replace(/求心力/g, '向心力')
    .replace(/電界/g, '電場').replace(/磁界/g, '磁場')
    .replace(/熱力学第1法則/g, '熱力学第一法則')
    .replace(/保存則/g, '保存').replace(/p\s*[-・]?\s*v/g, 'pv')
    .replace(/ド[・･\s-]*ブロイ/g, 'ドブロイ').replace(/\s+/g, '').trim();

  // These are spelling aliases only. Related concepts use the directional
  // parent links below; e.g. "円運動" must not mean "等速円運動".
  const aliases = [
    ['力学的エネルギー保存', '力学的エネルギー保存則'],
    ['気柱共鳴', '気柱の共鳴'], ['ヤングの実験', '二重スリット'],
    ['ホイートストンブリッジ', 'ブリッジ回路'],
    ['鉛直面内の円運動', '鉛直円運動'],
    ['電気容量', '静電容量'], ['電圧', '電位差'],
    ['物質波', 'ド・ブロイ波', 'ドブロイ波'],
    ['音速測定', '音速の測定'], ['つり合い', 'つりあい'],
    ['電磁気', '電磁気学'], ['熱', '熱力学'],
  ];
  function variants(term) {
    const value = normalize(term);
    const group = aliases.find((words) => words.some((word) => normalize(word) === value));
    return unique([value, ...(group ?? []).map(normalize)]);
  }
  // Topic, parent topics, explicit evidence patterns. Plain sibling presence
  // never promotes a contextual topic to a direct method.
  const topics = [
    ['鉛直面内の円運動', ['円運動'], /鉛直.{0,8}円運動|鉛直.{0,12}円(?:形|軌道)|円(?:形|軌道).{0,12}鉛直/],
    ['等速円運動', ['円運動'], /等速円運動/],
    ['円運動', [], /円運動|(?<!楕)円軌道|円形.{0,6}(?:レール|軌道)|向心力|円すい振り子|円錐振り子/],
    ['向心力', ['円運動'], /向心力|求心力/],
    ['万有引力', [], /万有引力/], ['ケプラーの法則', ['万有引力'], /ケプラー/],
    ['単振動', [], /単振動|ばね振り子/], ['単振り子', [], /単振り子/],
    ['力学的エネルギー保存', ['仕事とエネルギー'], /力学的エネルギー(?:保存|が保存)/],
    ['運動エネルギー', [], /運動エネルギー/], ['位置エネルギー', [], /位置エネルギー/],
    ['エネルギー保存', [], /エネルギー保存/],
    ['仕事とエネルギー', [], /仕事と(?:運動)?エネルギー|仕事.{0,10}運動エネルギー|運動エネルギー.{0,10}仕事/],
    ['運動量保存', [], /運動量保存/], ['衝突', [], /衝突|反発係数/],
    ['弾性衝突', ['衝突'], /弾性衝突/], ['反発係数', ['衝突'], /反発係数/],
    ['力積', [], /力積/], ['運動方程式', [], /運動方程式/],
    ['等加速度運動', [], /等加速度/], ['放物運動', [], /放物運動|斜方投射|水平投射/],
    ['斜方投射', ['放物運動'], /斜方投射/], ['水平投射', ['放物運動'], /水平投射/],
    ['鉛直投げ上げ', ['等加速度運動'], /鉛直投げ上げ|鉛直上向きに投げ/],
    ['自由落下', ['等加速度運動'], /自由落下/], ['慣性力', [], /慣性力/],
    ['力のつり合い', [], /力のつり[合あ]い|つり[合あ]い式/],
    ['力のモーメント', [], /モーメント/], ['剛体のつり合い', ['力のモーメント'], /剛体.{0,4}つり[合あ]い/],
    ['重心', [], /重心/], ['作用反作用', [], /作用.?反作用/],
    ['摩擦', [], /摩擦/], ['静止摩擦', ['摩擦'], /静止摩擦|すべり始め|滑りはじめ/],
    ['動摩擦', ['摩擦'], /動摩擦/], ['ばね', [], /ばね|バネ/], ['斜面', [], /斜面/],
    ['浮力', [], /浮力|アルキメデス/], ['垂直抗力', [], /垂直抗力/],
    ['波の重ね合わせ', [], /重ね合わせ/], ['定在波', [], /定常波|定在波/],
    ['正弦波', [], /正弦波(?!でない)|正弦進行波/],
    ['弦の振動', [], /(?<!正)弦.{0,5}(?:振動|波)|(?<!正)弦.{0,8}基本振動/],
    ['縦波', [], /縦波/], ['横波', [], /横波/], ['波の干渉', [], /波の干渉|水面波.{0,20}(?:強め|弱め)|波源.{0,20}経路差/],
    ['気柱共鳴', ['定在波'], /気柱.{0,3}共鳴|気柱.{0,3}振動|閉管|開管/],
    ['閉管', [], /閉管/], ['開管', [], /開管/],
    ['ドップラー効果', [], /ドップラー/], ['うなり', [], /うなり/],
    ['音速測定', [], /音速.{0,3}測定|音速測定/], ['音波', [], /音波|音速|太鼓|音源|おんさ/],
    ['波長', [], /波長/], ['振動数', [], /振動数/], ['周期', [], /周期/],
    ['反射', [], /反射/], ['自由端反射', ['反射'], /自由端/], ['固定端反射', ['反射'], /固定端/],
    ['屈折', [], /屈折|スネル/], ['全反射', ['屈折'], /全反射|臨界角/],
    ['光の干渉', [], /光.{0,8}干渉|薄膜|ヤング|ニュートンリング|回折格子/],
    ['薄膜干渉', ['光の干渉'], /薄膜|膜厚.{0,10}反射/],
    ['ヤングの実験', ['光の干渉'], /ヤング|二重スリット|2つのスリット/],
    ['ニュートンリング', ['光の干渉'], /ニュートンリング|平凸レンズ.{0,20}ガラス/],
    ['回折格子', ['光の干渉'], /回折格子/], ['回折', [], /回折/],
    ['音波の干渉', [], /音波の干渉|クインケ/], ['クインケ管', ['音波の干渉'], /クインケ/],
    ['レンズ', [], /レンズ/], ['凸レンズ', ['レンズ'], /凸レンズ/],
    ['理想気体', [], /理想気体/], ['状態方程式', ['理想気体'], /状態方程式/],
    ['気体分子運動論', ['理想気体'], /気体分子運動論|平均運動エネルギー/],
    ['熱力学第一法則', [], /熱力学第一法則|熱力学第1法則/],
    ['内部エネルギー', [], /内部エネルギー/], ['熱量保存', [], /熱量保存|熱収支/],
    ['熱平衡', [], /熱平衡|平衡温度/], ['比熱', [], /比熱/], ['熱容量', [], /熱容量/],
    ['圧力', [], /圧力|静水圧|水圧/], ['液体の圧力', ['圧力'], /静水圧|水圧|液柱|液面.{0,12}圧力/],
    ['ボイル・シャルルの法則', ['状態方程式'], /ボイル.{0,2}シャルル/],
    ['潜熱', [], /潜熱|融解熱|蒸発熱/], ['断熱変化', [], /断熱変化|断熱圧縮|断熱膨張/],
    ['等温変化', [], /等温変化|等温圧縮|等温膨張/], ['定圧変化', [], /定圧変化/],
    ['定積変化', [], /定積変化/], ['pVグラフ', [], /p[-・]?vグラフ/i],
    ['熱機関', [], /熱機関|熱効率/],
    ['静電気', [], /静電気|帯電|静電誘導|誘電分極/], ['静電誘導', ['静電気'], /静電誘導/],
    ['クーロンの法則', [], /クーロン/], ['電場', [], /電場|電界|電気力線|等電位/],
    ['電位', [], /電位/], ['コンデンサー', [], /コンデンサー?|電気容量|静電容量/],
    ['フレミング左手の法則', [], /フレミング.{0,3}左手/],
    ['電気量保存', [], /電気量保存|電荷保存/], ['ローレンツ力', [], /ローレンツ/],
    ['荷電粒子の運動', [], /荷電粒子|荷電した粒子/],
    ['直流回路', [], /直流回路|抵抗回路|豆電球回路/], ['オームの法則', [], /オーム/],
    ['直列回路', ['直流回路'], /直列/], ['並列回路', ['直流回路'], /並列/],
    ['電流', [], /電流/], ['電圧', [], /電圧/],
    ['抵抗', [], /抵抗(?:値|率|器|回路)|(?:電気|合成|内部|可変)抵抗/], ['電力', [], /電力/], ['電力量', [], /電力量/],
    ['キルヒホッフの法則', ['直流回路'], /キルヒホッフ/],
    ['ホイートストンブリッジ', ['直流回路'], /ホイートストン|ブリッジ回路/],
    ['磁場', [], /磁場|磁界/], ['電磁誘導', [], /電磁誘導|誘導起電力|誘導電流|レンツ/],
    ['交流', [], /交流/], ['変圧器', ['交流'], /変圧器/], ['半導体', [], /半導体|ダイオード/],
    ['光電効果', [], /光電効果|光電子|仕事関数/], ['光子', [], /光子/],
    ['物質波', [], /物質波|ド.?ブロイ/], ['X線', [], /x線/i],
    ['エネルギー準位', [], /エネルギー準位/], ['ボーア模型', [], /ボーア/],
    ['放射線', [], /放射線|α線|β線|γ線/], ['半減期', [], /半減期/],
    ['原子核', [], /原子核|核反応|核分裂|核融合|質量欠損|結合エネルギー/],
    ['核分裂', ['原子核'], /核分裂/], ['核融合', ['原子核'], /核融合/],
    ['エネルギー変換', [], /エネルギー変換/], ['測定誤差', [], /測定誤差|有効数字|誤差/],
  ];
  function withParents(tags) {
    const result = new Set(tags);
    for (const tag of result) {
      const topic = topics.find((row) => row[0] === tag);
      topic?.[1].forEach((parent) => result.add(parent));
    }
    return [...result];
  }
  function inferTopics(value) {
    const text = evidenceText(value);
    return withParents(topics.filter(([, , pattern]) => pattern.test(text)).map(([tag]) => tag));
  }
  function evidenceText(value) {
    return String(value ?? '').normalize('NFKC').replace(/\s+/g, '')
      .replace(/(?:空気抵抗|重力|摩擦|熱容量)(?:の影響|力)?(?:は|を|が)?(?:無視(?:できる|する|でき)|ない|働かない|はたらかない)/g, '')
      .replace(/(?:空気の抵抗|空気抵抗|摩擦力|摩擦)(?:は|を)?無視/g, '')
      .replace(/ばねはかり/g, 'はかり');
  }
  function splitTerms(query) {
    return unique(String(query ?? '').normalize('NFKC').trim().split(/[\s、,，+＋/／]+/).map(normalize));
  }
  function matchingTags(tags, term) {
    return tags.filter((tag) => variants(term).some((value) => normalize(tag).includes(value)));
  }
  const cache = new WeakMap();
  function fields(question) {
    if (cache.has(question)) return cache.get(question);
    const metadata = question.search_metadata;
    const direct = unique([...(metadata?.direct_tags ?? []), ...(metadata?.domains ?? [])]);
    const context = metadata?.context_tags ?? [];
    // Once migrated, the reviewed/bounded source text replaces old OCR slices
    // that may contain the following A/B section.
    const body = metadata?.body_text ?? question.problem_text ?? question.masked_problem_text ?? '';
    const result = {
      direct, context,
      contextText: normalize(metadata?.context_text ?? ''),
      summary: normalize(question.summary),
      title: normalize([question.year, question.subject, question.major_no, question.middle_no,
        question.minor_no, question.answer_no].join(' ')),
      legacy: normalize(metadata ? '' : [question.unit, question.summary, ...(question.keywords ?? [])].join(' ')),
      body: normalize(body),
    };
    cache.set(question, result);
    return result;
  }
  function termMatchInfo(question, term) {
    const f = fields(question);
    const direct = matchingTags(f.direct, term);
    if (direct.length) return { matched: true, tier: 3, score: 300, label: '直接', tags: direct };
    if (variants(term).some((v) => f.title.includes(v) || f.legacy.includes(v))) {
      return { matched: true, tier: 3, score: 300, label: '直接', tags: [term] };
    }
    const context = matchingTags(f.context, term);
    if (context.length) return { matched: true, tier: 2, score: 200, label: '文脈', tags: context };
    if (variants(term).some((v) => f.contextText.includes(v))) {
      return { matched: true, tier: 2, score: 200, label: '文脈', tags: [term] };
    }
    if (variants(term).some((v) => f.summary.includes(v))) {
      return { matched: true, tier: 2, score: 200, label: '要約', tags: [term] };
    }
    if (variants(term).some((v) => f.body.includes(v))) {
      return { matched: true, tier: 1, score: 100, label: '本文', tags: [term] };
    }
    return { matched: false, tier: 0, score: 0, label: '', tags: [] };
  }
  function matchQuestion(question, queryOrTerms, scope = 'all') {
    const terms = Array.isArray(queryOrTerms) ? queryOrTerms : splitTerms(queryOrTerms);
    const matches = terms.map((term) => ({ term, ...termMatchInfo(question, term) }));
    const matched = matches.every((m) => m.matched && (scope !== 'direct' || m.tier === 3));
    const tier = terms.length ? Math.min(...matches.map((m) => m.tier)) : 3;
    return { matched, tier, score: matched ? tier * 1000 + matches.reduce((sum, m) => sum + m.score, 0) : 0, matches };
  }
  root.PhysicsSearch = { normalize, variants, topics, withParents, inferTopics, evidenceText, splitTerms, termMatchInfo, matchQuestion };
  if (typeof module !== 'undefined') module.exports = root.PhysicsSearch;
})(globalThis);
