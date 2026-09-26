# pomodoro 検証マップ

pomodoro のユーザー向け動作を確かめるための保守対象。操作前にここを読み、該当する機能ファイルを手順として使う。

## 前提

- `launch.sh` で起動し、`doctor.sh` が `OK` を返すこと。
- シナリオごとに新しいブラウザ context（localStorage 空、時計は 2026-09-26 10:01 JST で停止）。
- このランで起動していないインスタンスは操作しない。

## 操作の約束

- ARIA role と accessible name で要素を取る。座標や DOM 順は使わない。
- 時間は `page.clock.runFor` で進める。固定 sleep はしない。
- 記録は画面操作で作る（作業フェーズを完走させる）。

## 証明と報告

- 操作と結果の両方を撮る（png + aria.txt）。
- 永続化は `log.json` の `storage` で二重に確認する。
- 届かなかった経路は、試した操作と満たせなかった前提を書いて報告する。

## 機能

- [タイマー（開始・一時停止・再開）](./timer.md) — `drive.mjs timer`
- [フェーズ遷移と作業時間の記録](./phase.md) — `drive.mjs phase`
- [リセット](./reset.md) — `drive.mjs reset`
- [記録画面](./records.md) — `drive.mjs records`
