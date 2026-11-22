# SC科目B mock01 独立査読報告書

- 査読日：2026-11-22（JST）
- 対象：`01_current/sc-b-mock01-cases.json`（12事例）、`sc-b-mock01-questions.json`（20設問）
- 原本の整合性：`SHA256SUMS.txt` の全17ファイルが一致。原本JSONは変更していない。
- 方法：正答・解説・誤答理由を除いた作業用データ（`scripts/make_blind.py`）で20設問を先に解き、解答を固定（`work/blind_answers.json`、SHA-256 `8257e460…a76f6`）してから作問者の正答・解説と照合した。その後、コード実行・独立計算・一次資料で各設問を検証した。

---

## 1. 判定

**現状のままでは公開不可。** 設問013（GitHub Actions）を修正すれば、条件付きで公開可。

| 区分 | 件数 | 対象 |
|---|---|---|
| BLOCKER | 1 | 013 |
| HIGH | 0 | — |
| MEDIUM | 1 | 014（誤答肢イの解説の技術的誤り） |
| LOW | 7 | 001、003、009／011、014、018、構造、テーマ配分 |

- ブラインド再解答の結果は、20問すべてで作問者の正答と一致した。
- ただし、設問013の正答オ（WF2・WF3）は、2026年7月以降のGitHubの仕様変更によって成立しなくなっている。現時点の正答はア（WF2のみ）である。2026年12月2日以降は、事例の前提（設定は既定値のまま）のもとで正答が存在しない。
- 作問者の品質レポートは、013について「公式文書に基づく規則判定であり、実リポジトリでは再現していない」「出題前に公式文書を再確認することを推奨」と記載している。今回の欠陥は、この未検証部分から生じている。

**公開の条件**：ISS-01（013）を修正し、ISS-02（014の誤答肢イ）を修正すること。LOWは公開後の改訂でもよい。

---

## 2. 20設問の評価概要

| 設問 | 事例 | テーマ | 再解答 | 作問者 | 一意性 | 技術的正確性 | 重大度 | 判定 |
|---|---|---|---|---|---|---|---|---|
| 001 | c01 | OAuth/PKCE | エ | エ | OK | OK | LOW | 公開可 |
| 002 | c02 | FW・DNSトンネル | ウ | ウ | OK | OK | — | 公開可 |
| 003 | c03 | S3/IAM/KMS/SCP | イ | イ | OK | OK | LOW | 公開可 |
| 004 | c04 | AD（Kerberoast/DCSync） | キ | キ | OK | OK | — | 公開可 |
| 005 | c05 | SPF/DKIM/DMARC | オ | オ | OK | OK | — | 公開可 |
| 006 | c06 | SSRF/IMDS | キ | キ | OK | OK（実行確認） | — | 公開可 |
| 007 | c07 | バックアップ世代 | エ | エ | OK | OK | — | 公開可 |
| 008 | c08 | 脆弱性対応基準 | オ | オ | OK | OK | — | 公開可 |
| 009 | c09-1 | BOLA | イ | イ | OK | OK（実行確認） | LOW | 公開可 |
| 010 | c09-2 | マスアサインメント | オ | オ | OK | OK（実行確認） | — | 公開可 |
| 011 | c09-3 | 認可の修正 | エ | エ | OK | OK（実行確認） | LOW | 公開可 |
| 012 | c10-1 | pip依存関係かく乱 | ア | ア | OK | OK（pip 24.3で再現） | — | 公開可 |
| **013** | c10-2 | **GitHub Actions** | オ | オ | **NG** | **NG（現行仕様と不一致）** | **BLOCKER** | **修正まで公開不可** |
| 014 | c10-3 | 再発防止策 | ウ | ウ | OK | 解説に誤り | MEDIUM | 条件付き公開可 |
| 015 | c11-1 | CAA/CT | ク | ク | OK | OK | — | 公開可 |
| 016 | c11-2 | TLS前方秘匿性 | ウ | ウ | OK | OK（OpenSSLで再現） | — | 公開可 |
| 017 | c11-3 | 全数探索時間 | オ | オ | OK | OK | — | 公開可 |
| 018 | c12-1 | タイムライン・TZ | キ | キ | OK | OK | LOW | 公開可 |
| 019 | c12-2 | 永続化・ctime | ア | ア | OK | OK | — | 公開可 |
| 020 | c12-3 | SIEMルール | エ | エ | OK | OK（ログで評価） | — | 公開可 |

013のブラインド解答もオだったが、これは査読者の手元の知識（2026年6月時点）が作問者と同じだったためである。一次資料を確認した結果、仕様が変わっていた。**「再解答と正答が一致した」ことは正しさの根拠にならない**という依頼者の注意が当てはまる例である。

設問ごとの詳細は `sc-b-mock01-question-audit.csv` に記録した。

---

## 3. 発見した問題点

### ISS-01【BLOCKER】設問013：GitHubの現行仕様では正答オが成立しない

**事例の前提**：wco-sdkは公開リポジトリで、GitHub Actionsの設定は既定値のまま。WF3は `pull_request_target` で `actions/checkout@v4` に `ref: ${{ github.event.pull_request.head.sha }}` を指定し、続けて `pip install` と `pytest` を実行する。

**仕様変更1：WF3は窃取できない（2026-07-20以降）**
- `actions/checkout` v7（2026-06-18）は、`pull_request_target` においてフォークPRのhead／mergeコミットのcheckoutを既定で拒否する。拒否は警告ではなく失敗である。
- この保護は、v4.4.0・v5.1.0・v6.1.0などに「[BREAKING] backport `allow-unsafe-pr-checkout`」として2026-07-20にバックポートされた。
- `@v4` のような浮動タグは、この変更を自動的に取り込む。
- 拒否対象には、`ref:` がフォークPRのheadコミットSHAに解決される場合が明記されている。
- したがって、WF3はcheckoutの段階で失敗し、DEPLOY_TOKENを渡すステップは実行されない。

**仕様変更2：WF2も実行されなくなる（2026-12-02以降）**
- GitHubは、公開リポジトリで `pull_request_target` を既定のイベントポリシーでブロックする。
- ブロックが外れるのは、適用されるActionsイベントポリシーで明示的に許可した場合だけである。
- 2026-11-02時点では評価モードで運用されており、11月9日と16日にブラウンアウト（一時的な強制）を実施した。強制開始は2026-12-02である。

**正答への影響**
- 2026-11-22時点：正答はア（WF2のみ）。
- 2026-12-02以降：WF2とWF3はどちらも実行されない。全選択肢がWF2又はWF3を含むため、正答が存在しない。
- 2027年度向けの学習アプリでは、後者の状態で出題されることになる。

**変わらない点**
- WF1：フォークからの `pull_request` には、GITHUB_TOKEN以外のシークレットが渡されない。
- WF4：攻撃者はベースリポジトリにタグをpushできない。
- WF2：イベントが実行されれば、タイトルによるスクリプトインジェクションは成立する。

**最小修正案**（正答オを維持する場合）
1. 事例の「wco-sdkのGitHub Actionsの設定は既定値のままであり」を、「wco-sdkでは，ActionsイベントポリシーでWF2・WF3のpull_request_targetを明示的に許可しているほかは，GitHub Actionsの設定を既定値のままとしており」に変更する。
2. WF3のcheckoutに次を追加する。
   ```yaml
   with:
     ref: ${{ github.event.pull_request.head.sha }}
     allow-unsafe-pr-checkout: true
   ```
   - 代替案：checkoutを使わず、`run: git fetch origin pull/${{ github.event.pull_request.number }}/head && git checkout FETCH_HEAD` に変える。checkoutの保護は `git fetch` を対象外としている。
3. 解説に、上記2つの仕様変更を学習ポイントとして追記する。「既定値なら窃取されないが、明示的に許可・オプトアウトすると危険になる」という観点である。

### ISS-02【MEDIUM】設問014：誤答肢イの解説がpipの実際の挙動と異なる

**選択肢イの内容**：requirements.txtの先頭行に `--index-url 社内` を記述し、コマンドラインに `--extra-index-url https://pypi.org/simple` を追加する。

**解説の主張**：「両方が検索されることに変わりはなく、9.0.0が選ばれる」。

**実際の挙動（pip 24.3）**
- requirements.txt中の `--index-url` は、検索先リストを置き換える（`pip/_internal/req/req_file.py` 232〜240行の `index_urls = [opts.index_url]`）。
- このとき、コマンドラインの `--extra-index-url` も破棄される。
- 結果として、9.0.0は選ばれない。代わりに、公開PyPIのパッケージを取得できなくなる。

**再現結果**（`results_q012_pip.txt`）

| ケース | 結果 |
|---|---|
| Q14_i（選択肢イの文言どおり） | 2.4.1が入る |
| Q14_i_pubonly（公開専用パッケージを要求） | `No matching distribution` |
| Q14_i_cli_only（両URLをコマンドラインで指定） | 9.0.0が入り、setup.pyが実行される |

**正答への影響**：なし。イは条件3（公開PyPIのパッケージを引き続き利用する）に反するので、誤りのままである。ただし、学習者が誤ったpipの挙動を覚える。

**修正案**：イを「各サービスのpipコマンドを `--index-url https://pypi.internal.example/simple --extra-index-url https://pypi.org/simple` に変更し，社内インデックスを最初に検索させる」に改める。こうすれば、現行の解説がそのまま成立する。

### LOW（7件、詳細はissues.csv）

- **ISS-03（018）**：表1では「auditdでexecveを記録」としているが、図3に17:03:40の `id` の実行記録がない。最初の実行時刻の根拠が、応答サイズの増加（412→468バイト）からの推論だけになっている。図3に1行追加するか、キャプションに「攻撃者の操作に関係する記録の一部」と明記する。
- **ISS-04（009／011）**：011の選択肢アの文言から、(1)にテナント照合がないことが読める。3設問を同時に表示する運用では、009のヒントになる。
- **ISS-05（003）**：VPCエンドポイントポリシーの記載がない。既定（フルアクセス）を前提として明記する。
- **ISS-06（001）**：解説に「不正アプリの削除」と、PKCEの限界（RFC 8252 §8.6のクライアントなりすまし）を補足する。
- **ISS-07（014）**：正答ウを適用すると、社内インデックスだけを使っていたS3にも公開PyPIのキャッシュが開放される。解説でこの点に触れる。また、「除外ルールは設定していない」という記述があるため、消去法で選びやすい。
- **ISS-08（構造）**：001〜008にproblemNo・partNo・partCountがなく、choices[].textの書式も設問間で不統一である。
- **ISS-09（配分）**：c02とc12の題材が重複している（公開WebサーバのOSコマンドインジェクション）。c11は無関係な3テーマを束ねている。マネジメント系の設問が少ない。

---

## 4. 重要な技術的検証結果

再現スクリプトと出力はすべて `scripts/` と `results_*.txt` に収めた。外部サービスへの試行は行っていない。

| 設問 | 検証内容 | 結果 |
|---|---|---|
| 002 | 先頭一致のFW評価器と、同一セグメント・プロキシ制限のモデル | 到達するのは①④だけ |
| 003 | IAM／バケットポリシー／KMS／SCPの評価モデル。否定形演算子はキー欠落時に真 | ①⑤だけ成功 |
| 005 | SPFのCIDR判定とDMARCアラインメント（aspf=r、adkim=s） | M1・M2・M5がpass |
| 006 | 図1のコードを requests 2.32.3 で実行。DNS・接続先はローカルの模擬サーバに置換 | P4だけが302追従でIMDS応答を取得。(B)をis_globalにしても防げない。HttpTokens=requiredで401 |
| 007 | 2026年の暦でバックアップの世代と削除時刻を模擬 | 残存スナップショットは11/11〜11/17。最新の健全時点は11/4（水）22:00 |
| 009–011 | 図1のExpressコードを、表4のデータとjsonwebtoken（RS256）で実行 | R3・R5だけが他テナントのデータを返す。PATCH直後は旧トークンで影響なし、更新後にadmin化・T-Bの名簿取得。選択肢エの実装は他テナント=404、管理外=403 |
| 012/014 | pip 24.3と、ローカルの模擬インデックス（社内／公開／統合） | S1・S4で9.0.0がインストールされ、setup.pyが実行される。014のイは文言どおりだと公開パッケージを取得できない |
| 015 | RFC 8659のツリークライミングとissuewildのモデル | C2・C4・C6が不許可 |
| 016 | OpenSSL 3.0.13のs_server（-serverpref、RSA証明書）／s_client | K3・K4がRSA鍵交換（前方秘匿性なし）。それ以外はECDHE |
| 017 | 文字種^文字数÷試行回数 | G1は約36分、G4は約8.2日でともに対象。G5は約4.48年で対象外 |
| 020 | 図1のログをURLデコードし、スライディングウィンドウで評価 | 17:09:05（UTC）に発報。17:03:40〜17:08:41は301秒で窓外 |
| 構造 | ID参照、正答と選択肢、誤答理由の網羅性、事例と設問の対応、baselineとの比較 | 重大な不整合なし。001〜008と2事例のbaselineは完全一致（ヘッダーのpart説明だけ変更）。誤答理由は全設問で正答以外の全選択肢を網羅 |

---

## 5. 作問品質の評価（IPAサンプル9枚との比較）

**形式**
- 1問1答8問・1問3答4問の構成、「解答群のうち，最も適切なものを選べ」の問い方、組合せ型の解答群は、サンプルと整合している。
- 1問3答の12設問は、いずれも共通事例だけで単独に解答できる（他設問の正答を前提とする構造はない）。例外はISS-04の軽微なヒントだけである。

**専門性**
- サンプル問1（情報資産台帳）・問2（Web診断）よりも技術的に深い。ログ、ポリシーJSON、コード、設定ファイルといった一次データを読み解かせる問題が中心で、科目Bの趣旨には合っている。
- 単純暗記で解ける設問はない。
- ほとんどの誤答肢は「事例中の1つの条件を見落とすと選ぶ」設計になっている。例：002のルールのシャドウイング、007のスナップショット、015の複数SAN、020の301秒。誤答肢の質は高い。

**負荷**
- サンプルより資料量が明らかに多い。特に003（JSON5本・操作6件）、004、010の事例（ワークフロー4本＋pip設定5件）が重い。
- 1問あたりの読解量が本試験より重い可能性はあるが、学習用模試としては許容範囲である。
- 選択肢の多さ（最大9択）は難度の根拠にしていない。

**消去法で解ける余地**
- 011と014は、正答以外の選択肢の欠陥が見えやすく、やや易しい（LOW）。

**テーマ配分**
- 技術系に偏っている（ISS-09）。mock01の公開可否には影響しない。

---

## 6. 修正優先順位

1. **ISS-01（013、BLOCKER）**：イベントポリシーによる許可と `allow-unsafe-pr-checkout: true` を明記し、解説に仕様変更を追記する。公開前に必須。
2. **ISS-02（014、MEDIUM）**：選択肢イの文言をコマンドライン指定に改める。公開前に推奨。
3. **ISS-03〜07（LOW）**：解説の補足と前提の明記。
4. **ISS-08・09（LOW）**：データ構造の統一と、次回以降のテーマ配分。

GitHub Actions、AWS、pipは仕様変更が速い。公開直前と年度ごとに、013・006・003・012の前提を一次資料で再確認する運用を推奨する。

---

## 7. 参照した一次資料

- GitHub Changelog「Safer pull_request_target defaults for GitHub Actions checkout」2026-06-18 — https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout
- actions/checkout Releases（v4.4.0、v5.1.0、v6.1.0：2026-07-20 backport） — https://github.com/actions/checkout/releases
- GitHub Changelog「pull_request_target blocked by default December 2」2026-11-02 — https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2
- GitHub Changelog「Actions pull_request_target and environment branch protections changes」2025-11-07 — https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/
- GitHub Docs「Securely using pull_request_target」 — https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
- GitHub Docs「Events that trigger workflows」 — https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Docs（GHES 3.12）「Approving workflow runs from public forks」（pull_request_targetは承認設定に関係なく実行） — https://docs.github.com/en/enterprise-server@3.12/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/approving-workflow-runs-from-public-forks
- AWS IAM「Condition operators」 — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS KMS「Allowing users in other accounts to use a KMS key」 — https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS EC2「Configure IMDS for existing instances」／IMDSv2のトークン要件（401） — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html
- pip「pip install」（インデックスに優先順位がないこと、dependency confusionの警告） — https://pip.pypa.io/en/stable/cli/pip_install/
- PyPA Version specifiers（PEP 440、`~=`） — https://packaging.python.org/en/latest/specifications/version-specifiers/
- RFC 8659（CAA） — https://www.rfc-editor.org/rfc/rfc8659.html
- RFC 7636（PKCE）、RFC 8252（OAuth for Native Apps） — https://www.rfc-editor.org/rfc/rfc7636.html ／ https://www.rfc-editor.org/rfc/rfc8252.html
- pipのソースコード（24.3、`pip/_internal/req/req_file.py`） — 検証用のvenvで直接確認

---

## 8. 未検証事項

1. 実際のAWS、Active Directory、GitHub、SMTPの受信サーバでは実行していない。これらはモデルによる評価と、一次資料との照合で検証した。
2. 013のブロックと拒否は、公式Changelog・Docs・Releasesで確認した。公開リポジトリでの実地再現はしていない。
3. 004のWindowsイベント（4769の暗号化種別、4662のGUID）の意味は、事例の表3の定義に従った。Microsoftの文書との個別照合は行っていない。
4. 005は、2026年5月発行のRFC 9989（作問者の申告）との個別照合をしていない。ただし、事例の注記2で組織ドメインを明示しているため、結論は規格に依存しない。
5. 016はOpenSSL 3.0.13で再現した。実際のnginxのビルドや、OpenSSLの既定セキュリティレベルによっては、AES256-SHAなどが無効化される場合がある。事例は「ハンドシェイクに成功している」と前提しているので、結論は変わらない。
6. 006の模擬では、xpcdn.exampleをhttpで代用した。https→httpのリダイレクト追従は、requestsの仕様上許容されることを前提とした。
7. 017の試行速度は、事例が与えた仮定値である。
