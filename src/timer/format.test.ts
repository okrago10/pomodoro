import { describe, expect, it } from "vitest";
import { formatRemaining } from "./format.ts";

describe("formatRemaining", () => {
  it("renders mm:ss", () => {
    expect(formatRemaining(25 * 60_000)).toBe("25:00");
    expect(formatRemaining(5 * 60_000 - 1_000)).toBe("04:59");
    expect(formatRemaining(0)).toBe("00:00");
  });
});
