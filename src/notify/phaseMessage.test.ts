import { describe, expect, it } from "vitest";
import { phaseEndedCopy } from "./phaseMessage.ts";

describe("phaseEndedCopy", () => {
  it("distinguishes work end from break start", () => {
    expect(phaseEndedCopy("Work", "ShortBreak")).toEqual({
      title: "作業が終わりました",
      body: "短い休憩が始まりました",
    });
    expect(phaseEndedCopy("Work", "LongBreak")).toEqual({
      title: "作業が終わりました",
      body: "長い休憩が始まりました",
    });
  });

  it("distinguishes short and long break ends", () => {
    expect(phaseEndedCopy("ShortBreak", "Work")).toEqual({
      title: "短い休憩が終わりました",
      body: "作業が始まりました",
    });
    expect(phaseEndedCopy("LongBreak", "Work")).toEqual({
      title: "長い休憩が終わりました",
      body: "作業が始まりました",
    });
  });
});
