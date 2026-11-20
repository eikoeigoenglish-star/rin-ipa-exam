# IPA高度試験対策 | GitHub Pages 対応 V5.3

このリポジトリは、SCとプロフェッショナル（データ・AI）のA-1/A-2/B学習サイトです。**共通A-1のみ実装済み（600問）**で、残る4ページは「準備中」です。見た目・既存A-1学習ロジックはV5.2を基本的に維持しています。

## GitHub Pagesへの公開（リポジトリ `ipa-exam`）

ZIPの**`ipa-exam` フォルダの中身を**、GitHubリポジトリのルート（`main` ブランチ）に配置してください。`ipa-exam/ipa-exam/index.html` のように二重にしないでください。

GitHubの **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save** を選びます。

公開予定URL（GitHubユーザー名が `eikoeigoenglish-star` の場合）：

- トップ: `https://eikoeigoenglish-star.github.io/ipa-exam/`
- 共通A-1: `https://eikoeigoenglish-star.github.io/ipa-exam/a1/`
- SC A-2: `https://eikoeigoenglish-star.github.io/ipa-exam/sc/a2.html`（準備中）
- SC B: `https://eikoeigoenglish-star.github.io/ipa-exam/sc/b.html`（準備中）
- PD データ・AI A-2: `https://eikoeigoenglish-star.github.io/ipa-exam/pd/data-ai/a2.html`（準備中）
- PD データ・AI B: `https://eikoeigoenglish-star.github.io/ipa-exam/pd/data-ai/b.html`（準備中）

GitHub Pagesは静的配信のみ。PythonのスクレイパーはPagesでは動作せず、ローカルでのデータ整備用です。**URLを `/ipa-exam/` から始める絶対パスにせず相対パスで記述**しているため、開発時とPagesのサブディレクトリ配信で同じ構成が使えます。

## ディレクトリ構成

```text
ipa-exam/
├── index.html                 # 全試験へのトップ
├── a1/index.html              # 共通A-1（完成済み）
├── sc/a2.html                 # SC A-2（準備中）
├── sc/b.html                  # SC B（準備中）
├── pd/data-ai/a2.html         # PDデータ・AI A-2（準備中）
├── pd/data-ai/b.html          # PDデータ・AI B（準備中）
├── assets/
│   ├── app.js                 # 共通A-1出題エンジン（V5.2から継承）
│   ├── style.css              # A-1画面の既存デザイン
│   ├── portal.css             # ポータル・準備中ページ用
│   └── exam-config.js         # 科目設定、問題JSONと学習進捗キー
├── data/
│   ├── a1/questions.json      # A-1 20回×30問＝600件
│   ├── a1/source-manifest.json
│   ├── sc-a2/                 # 将来の問題置き場
│   ├── sc-b/
│   ├── pd-ai-a2/
│   └── pd-ai-b/
├── qa/                        # 600問点検表、要確認122問のリスト
├── scripts/                   # ローカルのデータ取得・再生成
├── tests/                     # テスト
├── start_local.py             # ローカルサーバー
├── .nojekyll                  # PagesでJekyll変換しない
└── README.md
```

## ローカルでの動作確認

```bash
cd /展開先/ipa-exam
python3 start_local.py
```

ターミナルに表示されたURLを開いてください。トップからA-1に移動すると進捗の分母が**600問**になり、2025年秋→2025年春→2024年秋…の並びになるはずです。

開発環境で単純に `python3 -m http.server 8000` を使う場合も、**リポジトリのルート**で起動してください。`file://` でHTMLを直接開くとJSONを取得できない場合があります。

問題JSONが表示できるかチェック: `http://localhost:8000/data/a1/questions.json`

## 学習履歴の扱い

- 進捗保存キーはV5.2と同じ `ipa-a1-common-progress-v1` に固定しました。
- ブラウザの `localStorage` は**オリジン（スキーム＋ドメイン＋ポート）ごと**です。
- ローカルで以前と同じ `http://localhost:8000` を利用する場合、移動先が `/a1/` になっても履歴を共有できます。
- 新しくGitHub Pages上で開く場合、ローカルの学習履歴は自動では移りません。

## 600問の品質状態

- 通常四択：478問
- 要出典照合：88問
- 出典参照型：34問（アプリの問題文・選択肢は未取得。出典サイトへ移動して回答）

図表・数式の全面的な検証はまだできていません。**600問登録済み ≠ 600問すべて問題文が完全再現済み**です。

## 問題データの再収集

`data/a1/sc-am1.review.json`（以前の収集結果）は**この公開用ZIPには入れていません**。サイト独自の説明などの混入を避けるためです。再処理が必要な場合は、手元にある元ファイルを `data/a1/` に置いてください。`.gitignore` でGitHubへ通常pushされないようにしています。

```bash
pip install -r requirements.txt
python scripts/build_600.py
python scripts/generate_manifest.py
python -m pytest -q
node --check assets/app.js
```

`build_600.py` は現在の `questions.json` を上書きします。再生成前にバックアップしてください。取得先の利用規約や第三者著作権を確認し、公開可能な範囲で利用してください。

## 外部ポータル Rin's Web Apps への追加

既存ポータル `rin-webapp-gallery` の CERTIFICATION 欄に、次の項目を追加します。

- 表示名：**IPA高度試験対策**
- URL：`https://eikoeigoenglish-star.github.io/ipa-exam/`

**本ZIPは既存ポータルのリポジトリを変更しません。**
