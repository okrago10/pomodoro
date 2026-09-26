# 記録画面

直近 7 日の作業時間を曜日ごとの棒グラフで表示し、棒を押すとその日の合計を上に出す。

## Sub-features

- `records-open` タイマー画面の `記録` で開く。
- `records-today` 初期選択は今日で、合計が `N分` で出る。
- `records-pick` 別の日の棒を押すと選択（`aria-pressed=true`）とラベル（`昨日` / `M/D`）が変わる。
- `records-back` `戻る` でタイマー画面に戻り、タイマー状態は保たれる。

## How to get to it (user POV)

- タイマー画面左上の `記録` ボタン。

## Driving it with drive.mjs

Preconditions:

- `doctor.sh` が OK。作業を 1 回完走して今日 25 分の記録を作る（drive.mjs が画面操作で作る）。

- **開く.** `記録` を押す。`戻る` が出る（`01-records`）。
- **今日.** button `今日 25分` が `aria-pressed=true`。
- **別の日.** `昨日 …` の棒を押す。そちらが `aria-pressed=true`（`02-yesterday`）。
- **戻る.** `戻る` → `今日 25分` が上部に出る。
- **実行.** `drive.mjs records`。

## Gotchas

- 1 分未満の作業は 0 分として扱われ、棒も最小高さになる。
- 日付は context の timezone（Asia/Tokyo）で決まる。timezone を変えると今日のキーがずれる。
