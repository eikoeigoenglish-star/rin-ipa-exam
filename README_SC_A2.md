# SC 科目A-2（旧午前Ⅱ）スクレイピング追加パック

**目的**: `rin-ipa-exam` リポジトリの SC A-2 予定ページに投入するためのデータを、情報処理安全確保支援士ドットコムの公開過去問から取得する。**本パックは収集ツールであり、500問の取得済みデータではありません。**

## 対象

- 2015年秋期〜2025年秋期の20回（2020年春期は中止）
- 旧午前Ⅱ、各回25問。合計500問
- 取得元URL例: `https://www.sc-siken.com/s/kakomon/07_aki/am2_1.html`
- 分類、問題本文、四択、正答ラベル、図表・画像の参照URLを収集
- サイト独自の解説文、広告などは収集しません

## 導入

`rin-ipa-exam` リポジトリのルートに、このZIPの `scripts/`、`tests/`、`data/sc-a2/` を**フォルダ階層を保ったまま**コピーしてください。既存のA-1コードやHTMLは上書きしません。

```bash
cd /path/to/rin-ipa-exam
python3 -m pip install -r requirements.txt
```

`requirements.txt` に既に `requests`, `beautifulsoup4`, `lxml` が含まれている前提です。足りない場合のみ以下を実行してください。

```bash
python3 -m pip install requests beautifulsoup4 lxml
```

## 最初の試行（2025年秋の問1〜2）

```bash
python3 scripts/fetch_sc_am2.py --session 07_aki --limit 2 --cache-dir data/sc-a2/html-cache
```

正常に取得できたら2025年秋期25問を試します。

```bash
python3 scripts/fetch_sc_am2.py --session 07_aki --cache-dir data/sc-a2/html-cache
```

**20回・500問の全件取得**:

```bash
python3 scripts/fetch_sc_am2.py --cache-dir data/sc-a2/html-cache
```

デフォルトでアクセス間隔を3秒以上空け、`robots.txt` を検査します。401/403/429ならアクセスを止めます。アクセス制限を回避したり、User-Agentを偽装したりしないでください。実サイトのDOMは未検証のため、取得後のデータ点検が必須です。ローカルのHTMLキャッシュは再実行時に利用されます。

### 出力ファイル

実行すると `data/sc-a2/` 内に、指定された実行範囲について以下ができます。

| ファイル | 役割 |
|---|---|
| `sc-am2.candidates.json` | 四択と正答を構造上抽出できた候補。**人手検証は未実施** |
| `sc-am2.review.json` | 画像、数式、欠落などで確認を要する問題 |
| `sc-am2.report.json` | 対象、収集、要確認、抽出不能、取得エラーの集計 |
| `sc-am2.manifest.json` | 今回実行した対象のURL一覧 |

`data/sc-a2/sc-am2.targets.json` は、このパックに**初めから入っている500問のURL一覧**です。問題本文・正答は含みません。

**重要:** 部分実行後に全件実行すると、上記3つの結果ファイルは全件版に上書きされます。部分実行の結果を保存する場合は先にコピーしてください。

## オフラインの抽出確認

既に手元にあるHTMLを使う場合、 `07_aki_am2_1.html`, `07_aki_am2_2.html` の形式でフォルダに置きます。

```bash
python3 scripts/fetch_sc_am2.py --session 07_aki --limit 2 --html-dir /path/to/html
```

ネット接続を使わずに検証できます。

## テスト

```bash
python3 -m pytest -q tests/test_fetch_sc_am2.py
```

## 今回は変更していないもの

- `a1/index.html`, `assets/app.js`、A-1の600問
- `sc/a2.html` の準備中画面
- `data/a1/questions.json`
- 学習履歴のLocalStorage

SC A-2の問題データを学習画面で配信するのは、500問の抽出・図表検証後の次工程です。元サイト独自の解説や加工画像の無断再配布は避け、公開利用条件を別途確認してください。
