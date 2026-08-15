# プロダクトバックログ

進捗の正（GitHub）: [#13](https://github.com/okrago10/pomodoro/issues/13)  
ループスキル: `.cursor/skills/loop-engineering/SKILL.md`  
1 ループ = 未完了の先頭を 1 つ実装して PR まで（未マージ PR があっても、依存ならそのブランチから、独立なら main から進む）。

確定技術: Vite + React + TypeScript + Tailwind CSS v4 + HeroUI React v3 + Effect。リンタ oxlint、フォーマッタ oxfmt。公開は GitHub Pages。サーバなし。依存はリリースから 7 日以上経った安定版の最新。

サイクル: 作業 25 分 → 短い休憩 5 分 → 作業 25 分 → 長い休憩 15 分（自動遷移）。

## 実装順

- [x] ~~#2 Expo / Native 初期構築~~（キャンセル。GitHub Pages のため使わない）
- [x] [#14](https://github.com/okrago10/pomodoro/issues/14) ループエンジニアリング用 Cursor Skill
- [x] [#16](https://github.com/okrago10/pomodoro/issues/16) oxlint / oxfmt と依存パッケージの 7 日ルール
- [x] [#11](https://github.com/okrago10/pomodoro/issues/11) 【#2代替】Vite + HeroUI React v3 初期構築
- [x] [#12](https://github.com/okrago10/pomodoro/issues/12) GitHub Pages で静的デプロイ
- [ ] [#3](https://github.com/okrago10/pomodoro/issues/3) ポモドーロサイクルのドメインモデル（Effect）
- [ ] [#4](https://github.com/okrago10/pomodoro/issues/4) タイマー実行とフェーズ自動遷移
- [ ] [#5](https://github.com/okrago10/pomodoro/issues/5) iPhone 16 向け最小 UI
- [ ] [#6](https://github.com/okrago10/pomodoro/issues/6) フェーズ終了の通知（Web / Safari 前提）
- [ ] [#7](https://github.com/okrago10/pomodoro/issues/7) 今日の作業時間合計
- [ ] [#8](https://github.com/okrago10/pomodoro/issues/8) 日別作業時間のローカル永続化
- [ ] [#9](https://github.com/okrago10/pomodoro/issues/9) 日別記録のチャートまたはカレンダー

## 運用

- 次に着手するのは上の未チェック先頭。
- 未マージ PR があっても次へ進む。依存するならその PR ブランチから、独立なら `main` からブランチを切る。
- 未対応の自動レビュー指摘（Major/Minor）がある実行は、指摘対応を先にする。
- PR がマージされたら該当行を `[x]` にする（ループスキルが次実行の冒頭でも同期する）。
- ユーザー判断待ちは `[loop-report]` issue。未回答が 3 回目になったら `[loop-halt]` で止める。
