# タイマー（開始・一時停止・再開）

大きな残り時間表示が 25:00 から 1 秒ずつ減り、一時停止中は止まり、再開で続きから減る。

## Sub-features

- `timer-start` `開始` でカウントダウンが始まり、ボタンが `一時停止` に変わる。
- `timer-pause` `一時停止` で残り時間が止まる。
- `timer-resume` `開始` で止めた値から再開する。

## How to get to it (user POV)

- アプリを開くと最初の画面がタイマー。画面下部の `開始` / `一時停止` ボタン。

## Driving it with drive.mjs

Preconditions:

- `doctor.sh` が OK。

- **初期表示.** `p[aria-live=polite]` が `25:00`。
- **開始.** `開始` を押し `runFor(3000)`。表示は `24:57`。
- **一時停止.** `一時停止` を押し `runFor(10000)`。表示は `24:57` のまま。
- **再開.** `開始` を押し `runFor(2000)`。表示は `24:55`。
- **証跡.** `node .claude/skills/verify-pomodoro/scripts/drive.mjs timer` → `01-idle` と `02-paused`。

## Gotchas

- `clock.install` だけでは実時間でも時計が進み、値がずれる。`pauseAt` で止めてから操作する（drive.mjs は対応済み）。
- 初回の `開始` で通知許可を求める。context で `notifications` を許可していないとダイアログ待ちになる可能性がある。
