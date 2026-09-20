/**
 * フェーズ終了の知らせ方。呼び出し順序もこのインターフェースの一部で、
 * prepare を待ってから startKeepAlive、止めるときは stopKeepAlive を呼ぶ。
 */
export interface PhaseFeedback {
  /** 通知の許可と音の準備。ユーザー操作の中で呼ぶ必要がある。 */
  prepare(): Promise<void>;
  /** 画面が背面でも時間を数えられるように、無音に近い音を鳴らし続ける。 */
  startKeepAlive(): void;
  stopKeepAlive(): void;
  /** タグは PomodoroPhase の _tag。 */
  announce(endedTag: string, nextTag: string): void;
}

export interface RecordedAnnouncement {
  readonly endedTag: string;
  readonly nextTag: string;
}

export interface RecordingPhaseFeedback extends PhaseFeedback {
  /** 呼ばれたメソッド名を呼ばれた順に持つ。 */
  readonly calls: readonly string[];
  readonly announcements: readonly RecordedAnnouncement[];
}

/** テスト用のアダプター。何も鳴らさず、呼ばれ方だけを記録する。 */
export function createRecordingPhaseFeedback(): RecordingPhaseFeedback {
  const calls: string[] = [];
  const announcements: RecordedAnnouncement[] = [];

  return {
    calls,
    announcements,
    async prepare() {
      calls.push("prepare");
      await Promise.resolve();
    },
    startKeepAlive() {
      calls.push("startKeepAlive");
    },
    stopKeepAlive() {
      calls.push("stopKeepAlive");
    },
    announce(endedTag, nextTag) {
      calls.push("announce");
      announcements.push({ endedTag, nextTag });
    },
  };
}
