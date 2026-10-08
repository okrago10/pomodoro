import { afterEach, describe, expect, it, vi } from "vitest";
import { createManualVisibility, documentVisibility } from "./visibility.ts";

/** visibilityState を切り替えられる document の代わり。 */
function stubDocument() {
  const target = new EventTarget();
  const doc = {
    visibilityState: "hidden" as DocumentVisibilityState,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  vi.stubGlobal("document", doc);
  return {
    change(state: DocumentVisibilityState): void {
      doc.visibilityState = state;
      target.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

describe("documentVisibility", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("前面に戻ったときだけ呼び、背面に回ったときは呼ばない", () => {
    const doc = stubDocument();
    const listener = vi.fn();
    documentVisibility.onVisible(listener);

    doc.change("hidden");
    expect(listener).not.toHaveBeenCalled();

    doc.change("visible");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("やめたあとは呼ばない", () => {
    const doc = stubDocument();
    const listener = vi.fn();
    const stop = documentVisibility.onVisible(listener);

    stop();
    doc.change("visible");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("createManualVisibility", () => {
  it("show で聞いているものを呼び、やめたものは数えない", () => {
    const visibility = createManualVisibility();
    const listener = vi.fn();
    const stop = visibility.onVisible(listener);

    visibility.show();
    expect(listener).toHaveBeenCalledOnce();
    expect(visibility.listening()).toBe(1);

    stop();
    visibility.show();
    expect(listener).toHaveBeenCalledOnce();
    expect(visibility.listening()).toBe(0);
  });
});
