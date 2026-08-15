export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export class FakeClock implements Clock {
  #ms: number;

  constructor(ms = 0) {
    this.#ms = ms;
  }

  now(): number {
    return this.#ms;
  }

  advance(ms: number): void {
    this.#ms += ms;
  }
}
