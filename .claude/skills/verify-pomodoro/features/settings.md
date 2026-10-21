# 設定

作業・短い休憩・長い休憩の長さ（分）と、長い休憩までの作業回数を変える。変更はすぐ localStorage `pomodoro:timer-settings` に保存される。保存ボタンはない。

## Sub-features

- `settings-idle` 待機中に作業の長さを変えると、タイマー画面の残り時間がすぐその長さになる。
- `settings-preview` 画面下に 1 サイクルの並び（`作業 25分 → 短い休憩 5分 → 作業 25分 → 長い休憩 15分`）が出て、変更に追従する。
- `settings-running` 動いている間は注記が出る。進行中のフェーズの残り時間は変わらず、次のフェーズから新しい長さになる。
- `settings-reset-copy` リセットの確認文が今の作業の長さを言う（`1回目の作業（3分）に戻ります。`）。
- `settings-persist` 再読み込みしても設定が残る。

## How to get to it (user POV)

- タイマー画面左上の `記録` の隣にある `設定` ボタン。

## Driving it with drive.mjs

Preconditions:

- `doctor.sh` が OK。

- **開く.** `設定` を押す。並びが初期値で出る（`01-settings-default`）。
- **待機中に変える.** textbox `作業（分）` に `1` を入れて Enter。並びが `作業 1分 → …` になり、`pomodoro:timer-settings` の `workMinutes` が 1（`02-settings-work-1min`）。`戻る` で残り時間 `01:00`（`03-timer-1min`）。
- **動いている間に変える.** `開始` → `runFor(1000)` → `設定`。注記 `進行中の1回目の作業は今の長さのまま続きます。…` が出る。`作業（分）` を `3`、`短い休憩（分）` を `2` にする（`04-settings-running`）。`戻る` で残り `00:59` のまま。進行中の作業の長さを変えても締切は動かない。
- **次のフェーズ.** `runFor(60000)` で短い休憩に入り、残り `01:59`（`05-short-break-2min`）。さらに `runFor(120000)` で次の作業に入り、残り `02:59`。
- **リセット.** ダイアログに `1回目の作業（3分）に戻ります。`。確定後 `03:00`。
- **再読み込み.** `page.reload()` 後も `03:00`（`06-after-reload`）。
- **実行.** `drive.mjs settings`。

## Gotchas

- NumberField の値は Enter かフォーカスが外れたときに確定する。入力中の 1 文字ごとには反映されない。
- 範囲外の値は確定時に範囲の端へ丸められる（作業は 1〜90）。空にして確定すると元の値に戻る。
- 増減ボタンの accessible name は React Aria の日本語訳で `を縮小 作業（分）` / `を拡大 作業（分）` になる。値は textbox で入れるほうが安定する。
