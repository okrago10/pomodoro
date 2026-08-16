# pomodoro

iPhone 16 の Safari 向けポモドーロタイマー。GitHub Pages で公開する。

## 使用技術

確定スタックは次のとおり。サーバ、Expo、React Native、HeroUI Native は使わない。

| 用途                  | 技術                                    |
| --------------------- | --------------------------------------- |
| UI                    | React 19 + TypeScript + Vite            |
| スタイル              | Tailwind CSS v4 + HeroUI React v3       |
| ドメイン              | Effect                                  |
| テスト                | Vitest                                  |
| リンタ / フォーマッタ | oxlint / oxfmt                          |
| 公開                  | GitHub Pages（Actions で `vite build`） |

依存の exact 版は `package.json` を正とする。追加・更新はリリースから 7 日以上経った安定版の最新だけを使う（`.cursor/rules/npm-package-age.mdc`）。

## 開発の進め方

プロダクトバックログは [`BACKLOG.md`](./BACKLOG.md) と GitHub issue [#13](https://github.com/okrago10/pomodoro/issues/13)。

ループエンジニアリング用スキル: `.cursor/skills/loop-engineering/SKILL.md`

- 1 実行で **1 issue の選定 → 実装 → 動作確認（スクショ/動画）→ PR（最初から open）→ 自動レビュー対応** まで
- ユーザー判断が必要なら着手せず報告する
- 報告に気づかずオートメーションが再実行されても 2 回まで。3 回目は停止

## ローカル起動

```bash
npm install
npm run dev
```

`npm install` の `postinstall` で、HeroUI React v3 のエージェント向けドキュメントを gitignored の `.heroui-docs/react` へ取得する（GitHub Actions の `CI=true` ではスキップ）。配置は `heroui-cli` の `agents-md --react` と同じ（`heroui` リポジトリの `v3` ブランチを sparse clone）。クローン直後に docs が無いとき、または手動で取り直すときは:

```bash
npm run docs:heroui
```

公式 CLI でも同じツリーを作れるが、このリポジトリのスクリプトは git を直接使う（CLI は失敗理由を出さず終わることがある）:

```bash
npx heroui-cli@3.0.4 agents-md --react --output AGENTS.md
```

`AGENTS.md` はこのツリーを必読としている。ドキュメント本体はコミットしない。`SKIP_HEROUI_DOCS=1` で取得を省略できる。

開発サーバは `http://localhost:5173/pomodoro/` を開く（`vite.config.ts` の `base` が GitHub Pages のプロジェクトサイト向け `/pomodoro/` のため）。

```bash
npm run build
npm run preview
```

## 公開（GitHub Pages）

公開 URL: https://okrago10.github.io/pomodoro/

デフォルトブランチ `main` への push（および Actions タブからの手動実行）で、Vite の静的ビルドを GitHub Pages に出します。カスタムサーバ、Vercel、Netlify は使いません。

まだ Pages が有効でない場合:

1. リポジトリの **Settings → Pages**
2. **Build and deployment → Source** を **GitHub Actions** にする
3. `main` へマージしたあとに Actions の **Deploy static content to Pages** が成功することを確認する
4. iPhone の Safari で上記 URL を開き、初期画面が出ることを確認する

プロジェクトサイトのため `vite.config.ts` の `base` は `/pomodoro/` です。ビルド後に `dist/404.html`（`index.html` のコピー）と `dist/.nojekyll` を置き、GitHub Pages で SPA の直接アクセスと Jekyll 処理を避けます。

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
