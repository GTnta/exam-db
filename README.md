# Physics Exam DB

センター試験・大学入学共通テストの物理系科目を、ローカルPCで検索するためのプロトタイプです。

## できること

- 年度、本試/追試、科目、単元、典型度で絞り込み
- 「ドップラー」「ドップラー 回転」のような語句検索
- 既存の検索欄で、直接の内容・状況の文脈・本文を分けた関連度順の検索
- 問題一覧から詳細を表示
- PDF、画像、正答番号、正答率の保存先を持てる
- 小問の前にある共通条件・図・同じA/B内の先行設問を画像で確認

## 検索の関連度と文脈

検索はスペースなどで区切った語をすべて含むAND検索です。関連度順では、直接扱う解法・考え方、共通設定や先行設問の文脈、問題本文の順に並びます。結果の「直接」「文脈」「本文」「要約」が一致理由です。

検索不足を補うために検索欄や絞り込み項目を増やしません。分野や文脈の分類と関連度の判定は、既存の検索欄の内部で処理します。

例: 2016年度センター物理本試の第4問Aは、問1が力学的エネルギー保存を直接用い、円運動は文脈として登録されています。問2は円運動・向心力を直接扱います。「円運動」で両方が見つかり、問2が先に並びます。同じ第4問Bのばねの問題にはAのタグを引き継ぎません。

`search_metadata` が検索用の正本です。旧 `keywords` と大問全体の `common_summary` は既存情報として残していますが、検索タグの階層には混ぜません。

- `domains`: 力学・熱・波動・電磁気・原子などの分野。横断問題は複数を持てます。
- `direct_tags`: 小問で直接扱う考え方や解法。
- `context_tags`: 共通設定・先行設問から得られる関連項目。
- `context_text` / `body_text`: 原本から範囲を区切った前提部分と小問本文。
- `provenance`: 要約・単元に基づく規則で分類したものか、原本を確認して個別補正したものか。

`data/contexts.json` は共通設定のまとまり、`data/search-overrides.json` は確認済みの補正と根拠を管理します。全757件に階層を付けていますが、全件の解法を人手で再解答・精査したという意味ではありません。原本との矛盾や不足が見つかったら、個別補正と回帰テストへ追加してください。

## 前提の画像

562件に共通条件・図・先行設問の画像を追加しています。A/B/Cの別のまとまりは含めず、その小問より後の設問も含めません。A/B共通の条件は大問冒頭から補います。共通部分が不要な独立小問は、小問画像を表示します。前提の最小範囲を人手で選び切ったものではないため、同じまとまりの先行設問が多めに表示される場合があります。

`context_images` と `data/context-image-crops.json` に、PDFの実際のページ番号・切り出し上下位置を記録しています。小問画像も全件を `question_images` と `data/question-image-crops.json` の原本位置から生成し、表示用の `image_path` / `image_paths` を揃えています。小問本文の終端は次の小問・A/B/C・大問の手前とし、末尾の下書き用紙や次の大問のページ上端だけの画像は除きます。途中の続きのページや、図だけのページは文字数を理由に除きません。

例: 2019年度センター物理本試の第4問B問4は、原本PDFの27ページだけが小問画像です。後ろの28ページ（下書き用紙）と29ページ（第5問）は表示せず、25〜26ページの状況設定・先行設問は前提画像に残します。

次の問番号より前に次問用の説明が始まる場合は、確認済みの終端を `search-overrides.json` の `question_ends` に根拠とともに記録します。小問より後ろにあっても、その小問が参照する図や選択肢は残します。全件の意味上の終端を人手で精査済みではないため、番号や見出しだけで切れない境界は、原本で確認して補正してください。

旧 `page` や復元された `image-crops.json` のページは原本とずれる場合があるため、新しい画像の位置には使いません。画面の「PDFページ」とPDFリンクの開始位置は `source_location` を使います。

## 再分類と確認

既存データを閲覧するだけなら追加ツールは不要です。再生成時は、PyMuPDFを使えるPythonで `scripts/extract-source-layout.py` を実行し、スキャンPDFのOCRを Windows PowerShell 5.1 で `scripts/read-source-ocr.ps1` により補います。日本語のWindows OCRが必要です。結果は `data/_tmp/source-layout/` にキャッシュします。

```powershell
node scripts/build-context-metadata.mjs --analyze
node scripts/build-context-metadata.mjs
python scripts/render-context-images.py
python scripts/render-context-images.py --kind question
node scripts/test-context-search.mjs
node scripts/check-db.mjs
```

問題番号や共通設定の開始位置を検出できない場合は、監査結果を `worklogs/context-metadata-audit.json` へ出力し、問題データの書き換えを止めます。既存の `source_location` を再生成の手掛かりに使うため、過去の一時的な作業ログがなくても再分類できます。

検索の実装は `app/search.js` を画面・分類処理・回帰テストで共有します。旧監査は検索ロジックが別実装で、取りこぼしを検査していませんでした。`audit-search-consistency.mjs` は現在、画面と同じ実装による回帰テストを実行します。テストは検索の正例・負例・順位・AND検索と全件の画像参照・文脈の所属を確認します。件数やテスト成功だけを、すべての教育的分類が正しい証拠にしないでください。

## 起動

PowerShellでこのフォルダに移動して、次を実行します。Node.jsが入っている環境ならこちらで起動できます。

```powershell
node scripts/serve.mjs
```

Pythonが入っている環境では、次でも起動できます。

```powershell
python -m http.server 8765
```

ブラウザで次を開きます。

```text
http://localhost:8765/app/
```

## データ形式

問題データは `data/questions.json` にあります。1レコードが1小問または1設問です。

主な項目:

- `year`: 年度
- `exam_system`: `center` または `common`
- `session`: `main` または `makeup`
- `subject`: `物理`, `物理基礎`, `物理I`, `物理II`
- `major_no`: 大問番号
- `minor_no`: 小問番号
- `unit`: 単元
- `keywords`: 検索用キーワード
- `typicality`: `低`, `中`, `高`
- `summary`: 問題要約
- `answer`: 正答番号
- `correct_rate`: 正答率。未入手なら `null`
- `correct_rate_source_name`: 正答率の出典名。未入手なら未設定
- `correct_rate_source_url`: 正答率の出典URL。未入手なら未設定
- `pdf_path`: ローカルPDFまたはWeb上のPDF
- `image_path`: 切り出し画像。未作成なら空
- `image_paths`: 複数ページ・複数画像の切り出し画像。未作成なら未設定

## PDFの保存

公式に確認できた直近年度のPDFリンクは `data/sources.json` に置いています。
一括ダウンロード用の雛形は `scripts/download-public-pdfs.ps1` です。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-public-pdfs.ps1
```

## SQLite

`scripts/make-sqlite.py` はPythonが入っている環境向けの任意スクリプトです。
このプロトタイプの検索画面自体は `data/questions.json` だけで動きます。

## 今後の拡張

1. `data/sources.json` に2000年以降のPDF URLを追加する。
2. PDFを `data/pdf/` に保存する。
3. PDFページを画像化し、必要なら設問ごとにトリミングして `data/images/` に保存する。
4. `data/questions.json` に設問メタデータを増やす。
5. 正答率データがある年度だけ `correct_rate` を埋める。

完全自動で設問分割するより、AI補助で候補を作り、最後に人間が確認する運用が現実的です。

## 設問画像の作成

現在の設問画像は `data/question-image-crops.json` の原本PDFページと上下位置で管理し、`data/images/selected/` に生成します。GitHub Actionsの `Build question images` は、登録済みの範囲から前提画像・小問画像を生成し、検索・画像範囲の回帰テストを実行します。再分類や範囲の変更は上記「再分類と確認」の手順で行います。

以下は旧形式の記録です。`data/image-crops.json` と `build-question-images.mjs` は過去の作業用に残していますが、現在の画像参照を更新する目的には使いません。旧形式では `box` が `null` の行はページ全体の仮画像になります。

```json
{
  "question_id": "2024_common_main_physics_a01",
  "source_pdf": "data/pdf/2024_common_main_physics.pdf",
  "page": 4,
  "pdf_page": 1,
  "box": { "x": 0.08, "y": 0.12, "width": 0.84, "height": 0.28 },
  "output": "data/images/questions/2024_common_main_physics_a01.webp"
}
```

手元にあるPDFから仮の切り出し行を作るには次を実行します。

```powershell
node scripts/init-full-page-crops.mjs
```

旧形式の画像生成には `pdftoppm`, ImageMagick, `cwebp` が必要です。
