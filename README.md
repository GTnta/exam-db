# Physics Exam DB

センター試験・大学入学共通テストの物理系科目を、ローカルPCで検索するためのプロトタイプです。

## できること

- 年度、本試/追試、科目、単元、典型度で絞り込み
- 「ドップラー」「ドップラー 回転」のような語句検索
- 問題一覧から詳細を表示
- PDF、画像、正答番号、正答率の保存先を持てる

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
