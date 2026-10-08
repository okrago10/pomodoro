/** 画面が前面に戻ったことを知らせる差し替え口。 */
export interface Visibility {
  /** 前面に戻るたびに listener を呼ぶ。返した関数を呼ぶと聞くのをやめる。 */
  onVisible(listener: () => void): () => void;
}

export const documentVisibility: Visibility = {
  onVisible(listener) {
    const onChange = (): void => {
      if (document.visibilityState === "visible") {
        listener();
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
    };
  },
};

export interface ManualVisibility extends Visibility {
  /** 前面に戻ったことにして、聞いているものをすべて呼ぶ。 */
  show(): void;
  /** いま聞いているものの数。 */
  listening(): number;
}

/** テスト用のアダプター。前面復帰を手で起こす。 */
export function createManualVisibility(): ManualVisibility {
  const listeners = new Set<() => void>();
  return {
    onVisible(listener) {
      // 同じ関数を 2 回登録しても別々に数えられるように包む。
      const entry = (): void => {
        listener();
      };
      listeners.add(entry);
      return () => {
        listeners.delete(entry);
      };
    },
    show() {
      for (const listener of listeners) {
        listener();
      }
    },
    listening: () => listeners.size,
  };
}
