export interface PhaseNotifyCopy {
  readonly title: string;
  readonly body: string;
}

export function phaseEndedCopy(endedTag: string, nextTag: string): PhaseNotifyCopy {
  if (endedTag === "Work") {
    const breakLabel = nextTag === "LongBreak" ? "長い休憩" : "短い休憩";
    return {
      title: "作業が終わりました",
      body: `${breakLabel}が始まりました`,
    };
  }

  const endedLabel = endedTag === "LongBreak" ? "長い休憩" : "短い休憩";
  return {
    title: `${endedLabel}が終わりました`,
    body: "作業が始まりました",
  };
}
