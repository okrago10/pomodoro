import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebPhaseFeedback } from "./webNotify.ts";

interface NotificationPayload {
  readonly body: string;
  readonly tag: string;
  readonly data: { readonly url: string };
}

interface ShownNotification {
  readonly title: string;
  readonly payload: NotificationPayload;
}

/** Replace the global Notification with a recording stub. */
function stubNotification(permission: NotificationPermission, throwOnConstruct = false) {
  const constructed: ShownNotification[] = [];
  class NotificationStub {
    onclick: (() => void) | null = null;
    static permission = permission;
    static requestPermission = vi.fn(async () => "granted");
    constructor(title: string, payload: NotificationPayload) {
      if (throwOnConstruct) {
        throw new Error("Notification is not allowed in this context");
      }
      constructed.push({ title, payload });
    }
    close(): void {}
  }
  vi.stubGlobal("Notification", NotificationStub);
  return { constructed, requestPermission: NotificationStub.requestPermission };
}

/** Replace the global navigator with one that has, or lacks, a service worker. */
function stubNavigator(serviceWorker?: { ready: Promise<{ showNotification: unknown }> }) {
  const vibrate = vi.fn(() => true);
  vi.stubGlobal("navigator", serviceWorker ? { vibrate, serviceWorker } : { vibrate });
  return { vibrate };
}

function readyServiceWorker(showNotification: (title: string, payload: unknown) => unknown) {
  return { ready: Promise.resolve({ showNotification }) };
}

function createAudioNodeStub() {
  return {
    frequency: { value: 0 },
    gain: { value: 0 },
    connect: vi.fn((target: unknown) => target),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };
}

/** Replace the global AudioContext so the beep and keep-alive paths can be observed. */
function stubAudioContext() {
  const oscillators: ReturnType<typeof createAudioNodeStub>[] = [];
  const gains: ReturnType<typeof createAudioNodeStub>[] = [];
  const ctx = {
    state: "running",
    currentTime: 0,
    destination: { id: "destination" },
    resume: vi.fn(async () => {}),
    createOscillator: vi.fn(() => {
      const node = createAudioNodeStub();
      oscillators.push(node);
      return node;
    }),
    createGain: vi.fn(() => {
      const node = createAudioNodeStub();
      gains.push(node);
      return node;
    }),
  };
  // An arrow function cannot be called with `new`, so the stub is a function declaration.
  function AudioContextStub(): unknown {
    return ctx;
  }
  vi.stubGlobal("AudioContext", AudioContextStub);
  return { ctx, oscillators, gains };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createWebPhaseFeedback announce", () => {
  it("vibrates on every announcement", () => {
    stubNotification("granted");
    const { vibrate } = stubNavigator();

    createWebPhaseFeedback().announce("Work", "ShortBreak");

    expect(vibrate).toHaveBeenCalledWith([80, 40, 80]);
  });

  it("stays silent when the browser has no Notification API", () => {
    vi.stubGlobal("Notification", undefined);
    const { vibrate } = stubNavigator();

    expect(() => createWebPhaseFeedback().announce("Work", "ShortBreak")).not.toThrow();
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it("does not notify while permission is still default", () => {
    const { constructed } = stubNotification("default");
    stubNavigator();

    createWebPhaseFeedback().announce("Work", "ShortBreak");

    expect(constructed).toEqual([]);
  });

  it("does not notify once permission is denied", () => {
    const { constructed } = stubNotification("denied");
    stubNavigator();

    createWebPhaseFeedback().announce("Work", "ShortBreak");

    expect(constructed).toEqual([]);
  });

  it("goes through the service worker when one is registered", async () => {
    stubNotification("granted");
    const showNotification = vi.fn();
    stubNavigator(readyServiceWorker(showNotification));

    createWebPhaseFeedback().announce("Work", "LongBreak");
    await vi.waitFor(() => expect(showNotification).toHaveBeenCalledOnce());

    expect(showNotification).toHaveBeenCalledWith(
      "作業が終わりました",
      expect.objectContaining({ body: "長い休憩が始まりました", tag: "pomodoro-phase" }),
    );
  });

  it("falls back to the constructor when the service worker rejects", async () => {
    const { constructed } = stubNotification("granted");
    const showNotification = vi.fn(() => {
      throw new Error("service worker refused");
    });
    stubNavigator(readyServiceWorker(showNotification));

    createWebPhaseFeedback().announce("ShortBreak", "Work");
    await vi.waitFor(() => expect(constructed).toHaveLength(1));

    expect(constructed[0].title).toBe("短い休憩が終わりました");
    expect(constructed[0].payload.body).toBe("作業が始まりました");
  });

  it("uses the constructor when there is no service worker", () => {
    const { constructed } = stubNotification("granted");
    stubNavigator();

    createWebPhaseFeedback().announce("LongBreak", "Work");

    expect(constructed).toHaveLength(1);
    expect(constructed[0].title).toBe("長い休憩が終わりました");
    expect(constructed[0].payload.tag).toBe("pomodoro-phase");
  });

  it("swallows a constructor that the browser rejects", () => {
    stubNotification("granted", true);
    stubNavigator();

    expect(() => createWebPhaseFeedback().announce("Work", "ShortBreak")).not.toThrow();
  });

  it("points a tapped notification at the current path", () => {
    vi.stubGlobal("location", { pathname: "/pomodoro/records" });
    const { constructed } = stubNotification("granted");
    stubNavigator();

    createWebPhaseFeedback().announce("Work", "ShortBreak");

    expect(constructed[0].payload.data).toEqual({ url: "/pomodoro/records" });
  });

  it("falls back to the deployed base path when location is unavailable", () => {
    vi.stubGlobal("location", undefined);
    const { constructed } = stubNotification("granted");
    stubNavigator();

    createWebPhaseFeedback().announce("Work", "ShortBreak");

    expect(constructed[0].payload.data).toEqual({ url: "/pomodoro/" });
  });

  it("beeps through the audio context when one is available", () => {
    const { oscillators } = stubAudioContext();
    stubNotification("granted");
    stubNavigator();

    createWebPhaseFeedback().announce("Work", "ShortBreak");

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].frequency.value).toBe(880);
    expect(oscillators[0].start).toHaveBeenCalledOnce();
    expect(oscillators[0].stop).toHaveBeenCalledWith(0.2);
  });

  it("still announces when the browser has no audio context", () => {
    vi.stubGlobal("AudioContext", undefined);
    const { constructed } = stubNotification("granted");
    stubNavigator();

    expect(() => createWebPhaseFeedback().announce("Work", "ShortBreak")).not.toThrow();
    expect(constructed).toHaveLength(1);
  });
});

describe("createWebPhaseFeedback keep alive", () => {
  it("runs a near-silent oscillator so the tab keeps counting", () => {
    const { oscillators, gains } = stubAudioContext();

    createWebPhaseFeedback().startKeepAlive();

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].frequency.value).toBe(24);
    expect(gains[0].gain.value).toBe(0.0005);
    expect(oscillators[0].start).toHaveBeenCalledOnce();
  });

  it("does not stack a second oscillator", () => {
    const { oscillators } = stubAudioContext();

    const feedback = createWebPhaseFeedback();
    feedback.startKeepAlive();
    feedback.startKeepAlive();

    expect(oscillators).toHaveLength(1);
  });

  it("stops and releases the oscillator, and can start again", () => {
    const { oscillators } = stubAudioContext();

    const feedback = createWebPhaseFeedback();
    feedback.startKeepAlive();
    feedback.stopKeepAlive();

    expect(oscillators[0].stop).toHaveBeenCalledOnce();
    expect(oscillators[0].disconnect).toHaveBeenCalledOnce();

    feedback.startKeepAlive();
    expect(oscillators).toHaveLength(2);
  });

  it("is a no-op when the browser has no audio context", () => {
    vi.stubGlobal("AudioContext", undefined);

    const feedback = createWebPhaseFeedback();

    expect(() => {
      feedback.startKeepAlive();
      feedback.stopKeepAlive();
    }).not.toThrow();
  });
});

describe("createWebPhaseFeedback prepare", () => {
  it("asks for permission while it is still default", async () => {
    const { requestPermission } = stubNotification("default");
    stubNavigator();

    await createWebPhaseFeedback().prepare();

    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it("does not ask again once permission is granted", async () => {
    const { requestPermission } = stubNotification("granted");
    stubNavigator();

    await createWebPhaseFeedback().prepare();

    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("resumes a suspended audio context", async () => {
    const { ctx } = stubAudioContext();
    ctx.state = "suspended";
    stubNotification("granted");
    stubNavigator();

    await createWebPhaseFeedback().prepare();

    expect(ctx.resume).toHaveBeenCalled();
  });
});
