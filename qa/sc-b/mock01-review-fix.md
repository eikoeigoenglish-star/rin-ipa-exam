# sc-b-mock01 独立査読後の局所修正（2026-11-22）

対象：作者の最新版mock01（12事例・20設問）。このZIPは **修正版の候補** であり、再査読前に公開確定したものではありません。

## 変更点

1. **ISS-01／013（BLOCKER）**：c10の事例に `pull_request_target` イベントの明示的許可を追記し、WF3のcheckoutに `allow-unsafe-pr-checkout: true` を追加。Q013の解説と誤答理由も2026年の保護仕様に対応させた。正答は **オ** のまま。
2. **ISS-02／014（MEDIUM）**：誤答肢 **イ** の条件を、両方のインデックスをコマンドライン引数で指定する形へ変更。誤答理由も対応。正答は **ウ** のまま。

## 機械的な検査

- JSON形式、事例12件、設問20件、ID参照、全設問の正答選択肢、各誤答肢の理由を検査して合格。
- 変更はc10、Q013、Q014および品質レポートに限定。
- 既存001〜008は変更なし。正答20件はすべて変更なし。
- GitHub実環境での再現は未実施。pipの元の査読結果も独立して再実行していない。

## 再査読時の論点

- GitHubの公開リポジトリで、イベントポリシーによる明示的許可＋checkout側の危険なオプトアウトをした場合にのみ、WF2／WF3が成立する設定になっているか。
- Q014の新しい選択肢イが「意図した誤答」となり、ウが唯一の正答であるか。
- mock01の他の18問、他の事例、正答位置に変更がないか。

参考資料：
- https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/
- https://github.com/actions/checkout/releases
- https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/
- https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
