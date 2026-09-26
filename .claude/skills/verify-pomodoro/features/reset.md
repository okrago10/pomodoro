# リセット

進行中のサイクルを確認ダイアログ経由で破棄し、1 回目の作業 25:00 に戻す。

## Sub-features

- `reset-disabled` 未開始（idle）では `リセット` が無効。
- `reset-cancel` ダイアログの `キャンセル` で何も変わらない。
- `reset-confirm` `リセットする` で 25:00・`開始` 表示に戻る。

## How to get to it (user POV)

- タイマー画面下部の赤い `リセット` ボタン → alertdialog「最初からやり直しますか？」。

## Driving it with drive.mjs

Preconditions:

- `doctor.sh` が OK。

- **無効状態.** 起動直後 `リセット` が disabled。
- **ダイアログ.** `開始` → `runFor(60000)` → `リセット`。role `alertdialog` が出る（`01-dialog`）。
- **キャンセル.** `キャンセル` を押す。表示は `24:00` のまま。
- **確定.** 再度 `リセット` → `リセットする`。表示 `25:00`、ボタン `開始`（`02-after-reset`）。
- **実行.** `drive.mjs reset`。

## Gotchas

- `リセット` は複数ある（ボタンと確定ボタン `リセットする`）。`exact: true` で名前を取る。
