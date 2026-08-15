# GitHub 上のループ用 issue 命名

エージェントはタイトル接頭辞だけで機械判定する。本文の自然文に頼らない。

| 接頭辞          | 意味                                         | オープン時の効果                      |
| --------------- | -------------------------------------------- | ------------------------------------- |
| `[loop-report]` | ユーザーへの報告（判断待ち or リトライ尽き） | 件数を数える。2 件オープンで次は halt |
| `[loop-halt]`   | オートメーション停止中                       | 実装禁止。報告のみ                    |
| `[進捗]`        | バックログ全体                               | 実装対象にしない                      |

## Pull Request

PR は **最初から open（Ready for review）** で作る。Draft 禁止。Create 時は `draft: false` を明示する。

open にしたあと `## コードレビュー結果` / `## セキュリティレビュー結果` が付く。対応手順は `references/pr-review.md`。

検索例:

```bash
gh issue list --state open --limit 50 --json number,title,url
```

`[loop-report]` / `[loop-halt]` で filter する。

## レポート本文テンプレ

```markdown
## なぜ止まったか

## ユーザーに決めてほしいこと

-

## 試したこと

-

## 回数

このレポートは未回答シリーズの N/2 回目（3 回目は halt）。

## 対象

- 進捗: #13
- 着手予定だった issue:
```

## 解除

ユーザーが判断・修正したら:

1. 関連 `[loop-report]` を close
2. `[loop-halt]` を close
3. `.cursor/loop/HALT` があれば削除してマージ
4. Cursor Automation を再度有効化
