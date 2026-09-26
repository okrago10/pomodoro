---
name: verify-pomodoro
description: pomodoro（iPhone Safari 向け React/Vite の Web タイマー）を実ブラウザ（Playwright + Chromium、iPhone 相当 viewport）で起動・操作し、タイマー・フェーズ遷移・リセット・記録画面の動作をスクショと ARIA スナップショットで証明する。UI や timer/domain を変えたあと、単体テストでなく実アプリで動作確認したいときに使う。
---

# verify-pomodoro

対象は Web UI のみ（サーバなし、状態はブラウザの localStorage `pomodoro:daily-work-ms`）。ヘルパーはすべてリポジトリルートから実行する。

## Launch

```bash
.claude/skills/verify-pomodoro/scripts/launch.sh   # 空きポートで vite を起動。PORT=5173 で固定も可
```

- `node_modules` が無ければ `npm ci` する。
- `ready: http://127.0.0.1:<port>/pomodoro/ pid=<pid>` が出たら準備完了。base は `/pomodoro/`（ルート `/` は 404 相当なので使わない）。
- 状態は `.verify-artifacts/run/{pid,url,vite.log}`。既に自分の起動が生きていれば再利用する。
- 分離: ポートは毎回空きを取り、ブラウザは毎シナリオ新規 context（localStorage は空）。ユーザーの `npm run dev` には触れない。

## Doctor

```bash
.claude/skills/verify-pomodoro/scripts/doctor.sh
```

読み取り専用。自分の pid が生存・URL が応答・`<title>pomodoro</title>` を返すかを見て、`OK pid=… url=… head=<sha> dirty=<n>` を出す。何かおかしいときは最初にこれ。FAIL なら cleanup → launch し直す。

## Drive

```bash
node .claude/skills/verify-pomodoro/scripts/drive.mjs <timer|phase|reset|records|all>
```

- グローバルの `playwright`（`npm root -g`、このコンテナには導入済み。無ければ `npm i -g playwright`）と `/opt/pw-browsers` の Chromium を使う。`playwright install` はしない。
- viewport 393x852・isMobile・ja-JP・Asia/Tokyo・通知許可済み。
- 時間は `page.clock`（2026-09-26 10:01 JST で停止）で進める。`runFor(ms)` した分だけ進むので、25 分を実時間で待たない。アプリのコードやテスト専用口は使わない。
- ハンドル: ボタンは accessible name（`開始` / `一時停止` / `リセット` / `キャンセル` / `リセットする` / `記録` / `戻る`）、残り時間は `p[aria-live=polite]`、記録のバーは `今日 25分` のような aria-label と `aria-pressed`。
- 各チェックは `PASS/FAIL` を出し、1 つでも FAIL なら exit 1。
- 新しい確認を足すときは `drive.mjs` の `scenarios` に追加し、`features/` の該当ファイルも更新する。

## Evidence

- 置き場所: `.verify-artifacts/<scenario>-<ISO時刻>/`（gitignore 済み、cleanup で消さない）。
- 中身: 操作ごとの `NN-label.png`（1179x2556）と `NN-label.aria.txt`、`log.json`（URL・各チェック結果・pageerror・終了時の localStorage 値）。
- 証明の基準:
  - ユーザー操作（ボタン押下）で動かす。localStorage を直接書いて状態を作らない。
  - 操作前後の両方を撮る。最終画面だけで済ませない。
  - 副作用（localStorage の作業時間）を `log.json` の `storage` で確認する。
  - 通知・ビープ音は headless では目視できない。確認できなかったと報告し、確認済みと書かない。

## Cleanup

```bash
.claude/skills/verify-pomodoro/scripts/cleanup.sh
```

`run/pid` のプロセスグループだけを止め、`.verify-artifacts/run/` を消す。プロセス名で kill しない。証跡ディレクトリは残る。失敗した試行のあとも必ず実行する。

## 機能マップ

[`features/README.md`](features/README.md) を読んでから操作する。
