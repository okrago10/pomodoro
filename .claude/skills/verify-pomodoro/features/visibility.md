# 前面復帰の追いつき

背面にいる間に止まっていたタイマーが、画面が前面に戻ったとき（`visibilitychange`）に時計へ追いつく。iPhone Safari では背面でタイマーが止まりやすいため、この追いつきで残り時間とフェーズを正す。

## Sub-features

- `visibility-catch-up` 前面に戻ると、背面にいた時間ぶん残り時間が減る。

## How to get to it (user POV)

- タイマーを `開始` したままアプリを背面に回し、しばらくして前面に戻す。

## Driving it with drive.mjs

Preconditions:

- `doctor.sh` が OK。

- **開始.** `開始` を押し `runFor(1000)`。表示は `24:59`。
- **背面の再現.** `page.clock.setSystemTime` で時刻だけ 10 分進める。タイマーは発火しないので表示は `24:59` のまま。
- **前面復帰.** `document` に `visibilitychange` を投げる。表示は `14:59`。
- **証跡.** `node .claude/skills/verify-pomodoro/scripts/drive.mjs visibility` → `01-before-visible` と `02-after-visible`。

## Gotchas

- headless の `visibilityState` は常に `visible`。背面への切り替えは再現せず、時刻を進めてから前面復帰のイベントだけを投げる。
- `runFor` で時刻を進めるとタイマーが発火して追いついてしまい、前面復帰の確認にならない。`setSystemTime` を使う。
