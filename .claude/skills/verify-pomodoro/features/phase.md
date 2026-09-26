# フェーズ遷移と作業時間の記録

作業 25 分 → 短い休憩 5 分 → 作業 25 分 → 長い休憩 15 分を繰り返す。作業時間は日ごとに localStorage へ積まれ、上部に `今日 N分` と出る。

## Sub-features

- `phase-work-to-short` 作業終了で短い休憩に移り、背景とチップが変わる。
- `phase-today-total` 上部の `今日 N分` が作業分だけ増える。
- `phase-persist` localStorage `pomodoro:daily-work-ms` の今日のキーに ms が積まれる。
- `phase-feedback` フェーズ終了時に通知とビープ音（headless では観測不可）。

## How to get to it (user POV)

- タイマー画面で `開始` を押し、フェーズ終了まで待つ。

## Driving it with drive.mjs

Preconditions:

- `doctor.sh` が OK。localStorage は空。

- **作業完走.** `開始` を押し `runFor(25*60000+1000)`。`短い休憩` が表示される。
- **今日の合計.** `今日 25分` が表示される。
- **永続化.** `log.json` の `storage` が `{"2026-09-26":1500000}`。
- **証跡.** `drive.mjs phase` → `01-short-break`。

## Gotchas

- 長い休憩までの確認は `runFor` を 4 回分（25+5+25 分）進める必要がある。現状の drive.mjs は短い休憩まで。
- 通知・音は headless で確認できない。確認済みと報告しない。
