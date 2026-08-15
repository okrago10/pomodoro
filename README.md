# pomodoro

iPhone 16 の Safari 向けポモドーロタイマー。GitHub Pages で公開する。

## 開発の進め方

プロダクトバックログは [`BACKLOG.md`](./BACKLOG.md) と GitHub issue [#13](https://github.com/okrago10/pomodoro/issues/13)。

ループエンジニアリング用スキル: `.cursor/skills/loop-engineering/SKILL.md`

- 1 実行で **1 issue の選定 → 実装 → 動作確認（スクショ/動画）→ PR（最初から open）→ 自動レビュー対応** まで
- ユーザー判断が必要なら着手せず報告する
- 報告に気づかずオートメーションが再実行されても 2 回まで。3 回目は停止

## 開発コマンド

```bash
npm run lint
npm run fmt
npm run fmt:check
```

依存を足すときは、リリースから 7 日以上経った安定版の最新だけを使う（`.cursor/rules/npm-package-age.mdc`）。

```bash
node scripts/npm-stable-version.mjs <package-name>
```
