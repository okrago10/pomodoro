import { phaseEndedCopy } from "./phaseMessage.ts";

const KEEP_GAIN = 0.0005;
const BEEP_GAIN = 0.14;
const BEEP_SECONDS = 0.2;

let audioContext: AudioContext | null = null;
let keepOscillator: OscillatorNode | null = null;
let keepGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") {
    return null;
  }
  audioContext ??= new AudioContext();
  return audioContext;
}

export async function preparePhaseFeedback(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    await ctx.resume();
  }

  if (typeof Notification === "undefined") {
    return;
  }
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function startPhaseKeepAlive(): void {
  const ctx = getAudioContext();
  if (!ctx || keepOscillator) {
    return;
  }
  void ctx.resume();
  keepOscillator = ctx.createOscillator();
  keepGain = ctx.createGain();
  keepOscillator.frequency.value = 24;
  keepGain.gain.value = KEEP_GAIN;
  keepOscillator.connect(keepGain).connect(ctx.destination);
  keepOscillator.start();
}

export function stopPhaseKeepAlive(): void {
  keepOscillator?.stop();
  keepOscillator?.disconnect();
  keepGain?.disconnect();
  keepOscillator = null;
  keepGain = null;
}

function playBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  void ctx.resume();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = BEEP_GAIN;
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + BEEP_SECONDS);
}

function showPhaseNotification(title: string, body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  const openApp = (): void => {
    window.focus();
  };

  try {
    const notification = new Notification(title, {
      body,
      tag: "pomodoro-phase",
    });
    notification.onclick = () => {
      openApp();
      notification.close();
    };
  } catch {
    void navigator.serviceWorker?.ready.then((registration) => {
      void registration.showNotification(title, {
        body,
        tag: "pomodoro-phase",
        data: { url: `${globalThis.location?.pathname ?? "/pomodoro/"}` },
      });
    });
  }
}

export function announcePhaseEnd(endedTag: string, nextTag: string): void {
  const copy = phaseEndedCopy(endedTag, nextTag);
  navigator.vibrate?.([80, 40, 80]);
  playBeep();
  showPhaseNotification(copy.title, copy.body);
}
