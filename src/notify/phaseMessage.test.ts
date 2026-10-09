import { describe, expect, it } from "vitest";
import { PomodoroPhase } from "../domain/cycle.ts";
import { phaseEndedCopy } from "./phaseMessage.ts";

describe("phaseEndedCopy", () => {
  it("distinguishes work end from break start", () => {
    expect(phaseEndedCopy(PomodoroPhase.Work(), PomodoroPhase.ShortBreak())).toEqual({
      title: "作業が終わりました",
      body: "短い休憩が始まりました",
    });
    expect(phaseEndedCopy(PomodoroPhase.Work(), PomodoroPhase.LongBreak())).toEqual({
      title: "作業が終わりました",
      body: "長い休憩が始まりました",
    });
  });

  it("distinguishes short and long break ends", () => {
    expect(phaseEndedCopy(PomodoroPhase.ShortBreak(), PomodoroPhase.Work())).toEqual({
      title: "短い休憩が終わりました",
      body: "作業が始まりました",
    });
    expect(phaseEndedCopy(PomodoroPhase.LongBreak(), PomodoroPhase.Work())).toEqual({
      title: "長い休憩が終わりました",
      body: "作業が始まりました",
    });
  });
});
