/**
 * テスト用の localStorage の代わり。同じインスタンスを渡したストア同士は、
 * 同じ localStorage を読み書きする別のタブとして振る舞う。
 */
export class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  #data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#data.set(key, value);
  }
}

/** テスト用。読み書きのどちらも例外を投げる保存先（プライベートブラウズや容量超過を想定）。 */
export const failingStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem() {
    throw new Error("storage unavailable");
  },
  setItem() {
    throw new Error("storage unavailable");
  },
};
