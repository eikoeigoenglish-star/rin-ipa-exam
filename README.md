# IPA高度試験対策 | GitHub Pages 対応 V5.10

このリポジトリは、SCとプロフェッショナル（データ・AI）のA-1/A-2/B学習サイトです。共通A-1（600問）、SC A-2（500問）、データ・AI A-2（230問）を実装済み。**SC科目Bはオリジナル模試第1回（12大問・20設問）を追加**しました。全10回・200設問は制作計画であり、第2〜10回の問題データは未収録です。データ・AI科目Bは準備中です。既存A-1/A-2の学習ロジック・データ・進捗キーは維持しています。

## GitHub Pagesへの公開（リポジトリ `rin-ipa-exam`）

ZIPを展開し、**`index.html` が直下にある展開後の中身を**GitHubリポジトリのルート（`main` ブランチ）に配置してください。フォルダ階層を二重にせず、ZIPファイルそのものではなく展開したファイルをアップロードしてください。

GitHubの **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save** を選びます。

公開予定URL（GitHubユーザー名が `eikoeigoenglish-star` の場合）：

- トップ: `https://eikoeigoenglish-star.github.io/rin-ipa-exam/`
- 共通A-1: `https://eikoeigoenglish-star.github.io/rin-ipa-exam/a1/`
- SC A-2: `https://eikoeigoenglish-star.github.io/rin-ipa-exam/sc/a2.html`（500問・利用可能）
- SC B: `https://eikoeigoenglish-star.github.io/rin-ipa-exam/sc/b.html`（オリジナル模試 第1回・20設問 利用可能）
- PD データ・AI A-2: `https://eikoeigoenglish-star.github.io/rin-ipa-exam/pd/data-ai/a2.html`（8分野選択・オリジナル230問（10回×23問））
- PD データ・AI B: `https://eikoeigoenglish-star.github.io/rin-ipa-exam/pd/data-ai/b.html`（準備中）

GitHub Pagesは静的配信のみ。PythonのスクレイパーはPagesでは動作せず、ローカルでのデータ整備用です。**URLを `/rin-ipa-exam/` から始める絶対パスにせず相対パスで記述**しているため、開発時とPagesのサブディレクトリ配信で同じ構成が使えます。

## ディレクトリ構成

```text
rin-ipa-exam/
├── index.html                 # 全試験へのトップ
├── a1/index.html              # 共通A-1（完成済み）
├── sc/a2.html                 # SC A-2（500問）
├── sc/b.html                  # SC B（第1回・20設問）
├── pd/data-ai/a2.html         # PDデータ・AI A-2（改修版230問・10回×23問）
├── pd/data-ai/b.html          # PDデータ・AI B（準備中）
├── assets/
│   ├── app.js                 # 共通A-1出題エンジン（V5.2から継承）
│   ├── style.css              # A-1画面の既存デザイン
│   ├── portal.css             # ポータル・準備中ページ用
│   ├── sc-b.js                # SC B専用の事例表示・出題・採点・進捗管理
│   ├── sc-b.css               # SC B専用のレスポンシブ表示
│   └── exam-config.js         # 科目設定、問題JSONと学習進捗キー
├── data/
│   ├── a1/questions.json      # A-1 20回×30問＝600件
│   ├── a1/source-manifest.json
│   ├── sc-a2/questions.json    # SC A-2 20回×25問＝500問
│   ├── sc-b/manifest.json     # 収録回の一覧（現在mock01のみ）
│   ├── sc-b/mock01/cases.json # 第1回の共通事例12本
│   ├── sc-b/mock01/questions.json # 第1回の独立設問20問
│   ├── pd-ai-a2/questions.json # 8分野・230問（10回×23問）
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
cd /展開先/rin-ipa-exam
python3 start_local.py
```

ターミナルに表示されたURLを開いてください。トップからA-1に移動すると進捗の分母が**600問**になり、2025年秋→2025年春→2024年秋…の並びになるはずです。

開発環境で単純に `python3 -m http.server 8000` を使う場合も、**リポジトリのルート**で起動してください。`file://` でHTMLを直接開くとJSONを取得できない場合があります。

問題JSONが表示できるかチェック: `http://localhost:8000/data/a1/questions.json`

## 学習履歴の扱い

- 共通A-1の進捗保存キーはV5.2と同じ `ipa-a1-common-progress-v1` に固定しました。SC Bは新しい専用キー `ipa-sc-b-progress-v1` を使用します。
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
- URL：`https://eikoeigoenglish-star.github.io/rin-ipa-exam/`

**本ZIPは既存ポータルのリポジトリを変更しません。**


詳細：`README_SC_A2_IMPORTED.md` と `README_PD_AI_A2.md` を参照。


## V5.6（2026-11-21）

- ポータルの固定A-1金色背景を廃止。カードにポインタを重ねたとき／キーボードフォーカス時に金色で強調。
- PD データ・AI A-2を23問から230問（模試10回×23問）へ拡張。8分野それぞれ28～29問を収録。
- 問題はすべてオリジナルの**ドラフト**です。正答・解説の技術的な独立査読は完了していません。
- 当時の確認用CSVはV5.7では廃止し、正本 `qa/pd-ai-a2/source-refined-230.csv` に置換しました。
- A-1（600問）・SC A-2（500問）と各進捗キーは変更しません。


## V5.7（2026-11-21）

- PD データ・AI A-2の問題JSONを、独立査読と再改修を経た `qa/pd-ai-a2/source-refined-230.csv` に完全置換（230問）。
- 制作側の難易度配分は高度138／応用92／基本0。16問の本文等を改修、50問の難易度表示を適正化。
- UIに残っていた「未検証ドラフト」表現を更新。ただし最終改修分の**第三者による再査読は未実施**で、問題の正確性を保証するものではありません。
- PD A-2のみlocalStorageキーをv2に変更。旧版で進捗を記録していた場合でも、書換え済みの問題を学習済みと誤表示しないよう初期状態から開始します。
- 旧ドラフトbankベースの再生成を廃止し、同梱CSVを正本とした `scripts/build_pd_ai_a2.py` に変更。
- A-1 600問、SC A-2 500問と両科目の既存進捗はそのまま維持。

**重要**：GitHubに配置する場合はZIPを解凍し、`index.html` がリポジトリ直下にくるよう**展開した中身**をアップロードしてください（ZIPファイル単体をアップロードしてもPagesには展開されません）。


## V5.8（2026-11-22） SC科目B 第1回

- SC Bを「準備中」から利用可能に更新。`sc/b.html` から模試第1回（1問1答8大問＋1問3答4大問、全20独立設問）を演習できます。
- 「1問1答」「1問3答」のチェックボックスは独立に選択可能。分野フィルターは設けていません。
- 1問3答の設問は独立採点・個別進捗管理。毎問、共通事例とその表・コード・図を再表示します。
- 進捗は未出題／ミス／ヒット／ダブル／トリプル、模試回ボタンの3秒長押しリセットに対応。
- 出題順は順番／ランダム、出題数は1・5・10・20・すべて。択一問題の選択肢は4〜9個で可変です。
- 表・コード・ネットワーク図はブラウザで再現。資料単位で折り畳み可能。横幅の広い表やコードはスマホでは資料内スクロールとなります。
- 事例・設問の出典は**非公式オリジナル問題**。IPAが公開した科目Bサンプルを構成上の参考にしましたが、IPA公式問題ではありません。
- `qa/sc-b/` に制作者の品質レポート、独立査読レポート、指摘一覧、局所修正内容を収録。指摘013（GitHub Actions）と014（pip）を局所修正済み。ただし**修正後の第三者による再査読は未実施**です。GitHub Actionsなどの仕様は変更されるため、公開前の再照合を推奨します。
- 第2〜10回は**未収録**。将来の追加は `data/sc-b/mockNN/` に事例・設問JSONを置き、`manifest.json` に追記する設計です。

`sc/b.html` はJavaScriptでJSONを取得するので、ファイルを直接ダブルクリックして `file://` で開かず、GitHub PagesやHTTPサーバ上でご利用ください。


## V5.9（2026-11-23） SC用語記述200問（旧仕様）

- `sc/vocab.html` に専門用語を入力して答える新モジュールを追加。当時は全4回・各50問。現在はV5.10で20問×10回に変更。
- 自動正答判定は設問ごとの acceptedAnswers に限定し、関連回答は自己判定に分離。
- 進捗は未出題／ミス／ヒット／ダブル／トリプル、3秒長押しのセット別リセットに対応。
- 既存A-1・SC A-2・SC B・PD A-2・PD Bの既存ファイル（トップとこのREADMEを除く）は変更なし。
- 仕様とデータの品質上の留意点は `README_SC_VOCAB.md` を参照。

## V5.10（2026-11-25） SC用語記述の出題回と採点方式を変更

- SC用語記述200問を**20問×10回**に再編（第1回 q001〜q020、…、第10回 q181〜q200）。問題ID・用語ID・問題文・正答・解説は変更せず、各回内の出題順 `order` だけ再採番。
- 1問回答するたびに採点する方式を廃止。**全問の回答後、解答一覧で見直して「全問採点する」を押した時点**で採点・正答・解説を表示。
- 採点前に前後の問題へ戻って回答を変更可能。未回答は一括採点時の確認後にミス扱い。
- 入力中の解答は `ipa-sc-vocab-draft-v2` に途中保存し、ページを閉じても再開可能。採点前は既存の学習進捗へ反映しない。
- 関連語は採点後の結果一覧で自己判定し、その時点で進捗と得点を更新。
- `ipa-sc-vocab-progress-v1` は変えず、以前の学習履歴は**問題ID単位でそのまま引き継ぐ**。3秒長押しの回次別リセットは新しい20問単位で作用。
- 変更箇所はSC用語画面・SC用語専用JS/CSS・同モジュールの10セットJSONとmanifest、トップページの表示、ドキュメント、テストのみ。A-1、SC A-2、SC B、PD A-2の実装・データは変更なし。

詳細は `README_SC_VOCAB.md` を参照してください。GitHub Pagesへ配置するときは、ZIPを展開した中身をリポジトリ直下へ配置してください。


### V5.11 追加：SC用語解説

- `sc/vocab-guide.html` で200語の定義・詳細解説・類似語との違いを閲覧（20語×10ページ）。
- 出題順はSC用語記述と一致。問題データ・採点・進捗はV5.10から変更しません。
- 詳細は `README_SC_VOCAB.md` を参照してください。
