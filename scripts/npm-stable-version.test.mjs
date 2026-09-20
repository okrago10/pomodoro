import { describe, expect, it } from "vitest";
import {
  compareSemver,
  fetchPackageTimes,
  parseArgs,
  pickStableVersion,
  stableReleases,
} from "./npm-stable-version.mjs";

describe("compareSemver", () => {
  it("orders parts numerically, not as strings", () => {
    expect(compareSemver("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareSemver("1.2.9", "1.2.10")).toBeLessThan(0);
  });

  it("returns 0 for the same version", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("ranks a new major above any older minor or patch", () => {
    expect(compareSemver("2.0.0", "1.99.99")).toBeGreaterThan(0);
  });

  it("treats a missing part as 0", () => {
    expect(compareSemver("1.2", "1.2.0")).toBe(0);
    expect(compareSemver("1.2.1", "1.2")).toBeGreaterThan(0);
  });

  it("treats a non-numeric part as 0", () => {
    expect(compareSemver("1.x.0", "1.0.0")).toBe(0);
  });
});

describe("stableReleases", () => {
  const times = {
    created: "2020-01-01T00:00:00.000Z",
    modified: "2026-01-01T00:00:00.000Z",
    "1.0.0": "2026-01-01T00:00:00.000Z",
    "1.10.0": "2026-03-01T00:00:00.000Z",
    "1.9.0": "2026-02-01T00:00:00.000Z",
    "2.0.0-beta.1": "2026-04-01T00:00:00.000Z",
    "0.0.1": "not a date",
  };

  it("drops the created and modified keys", () => {
    const versions = stableReleases(times).map((row) => row.version);
    expect(versions).not.toContain("created");
    expect(versions).not.toContain("modified");
  });

  it("drops prereleases", () => {
    expect(stableReleases(times).map((row) => row.version)).not.toContain("2.0.0-beta.1");
  });

  it("drops entries whose publish date cannot be parsed", () => {
    expect(stableReleases(times).map((row) => row.version)).not.toContain("0.0.1");
  });

  it("sorts by semver, so 1.10.0 comes after 1.9.0", () => {
    expect(stableReleases(times).map((row) => row.version)).toEqual(["1.0.0", "1.9.0", "1.10.0"]);
  });
});

describe("pickStableVersion", () => {
  const now = Date.parse("2026-09-20T00:00:00.000Z");
  const times = {
    "1.0.0": "2026-09-01T00:00:00.000Z",
    "1.1.0": "2026-09-11T00:00:00.000Z",
    "1.2.0": "2026-09-18T00:00:00.000Z",
  };

  it("picks the highest version old enough, and reports the one it skipped", () => {
    expect(pickStableVersion(times, { days: 7, now })).toEqual({
      version: "1.1.0",
      published: "2026-09-11T00:00:00.000Z",
      skippedNewer: { version: "1.2.0", published: "2026-09-18T00:00:00.000Z" },
    });
  });

  it("counts a version published exactly N days ago as old enough", () => {
    expect(pickStableVersion(times, { days: 2, now })?.version).toBe("1.2.0");
  });

  it("reports no skipped version when the newest one qualifies", () => {
    expect(pickStableVersion(times, { days: 1, now })?.skippedNewer).toBeNull();
  });

  it("returns null when nothing is old enough", () => {
    expect(pickStableVersion(times, { days: 365, now })).toBeNull();
  });

  it("returns null for an empty time map", () => {
    expect(pickStableVersion({}, { days: 7, now })).toBeNull();
  });
});

describe("parseArgs", () => {
  it("reads the package name and day count", () => {
    expect(parseArgs(["node", "script", "effect", "14"])).toEqual({ pkg: "effect", days: 14 });
  });

  it("defaults to the repository's 7-day rule", () => {
    expect(parseArgs(["node", "script", "effect"])).toEqual({ pkg: "effect", days: 7 });
  });

  it("rejects a missing package name", () => {
    expect(parseArgs(["node", "script"])).toBeNull();
  });

  it("rejects a day count that is not a number", () => {
    expect(parseArgs(["node", "script", "effect", "soon"])).toBeNull();
  });

  it("rejects a negative day count", () => {
    expect(parseArgs(["node", "script", "effect", "-1"])).toBeNull();
  });
});

describe("fetchPackageTimes", () => {
  const okResponse = (time) => ({ ok: true, json: async () => ({ time }) });

  it("returns the time map on success", async () => {
    const times = { "1.0.0": "2026-01-01T00:00:00.000Z" };
    await expect(fetchPackageTimes("effect", async () => okResponse(times))).resolves.toEqual({
      ok: true,
      times,
    });
  });

  it("falls back to an empty map when the registry omits time", async () => {
    const withoutTime = { ok: true, json: async () => ({}) };
    await expect(fetchPackageTimes("effect", async () => withoutTime)).resolves.toEqual({
      ok: true,
      times: {},
    });
  });

  it("reports an HTTP error without throwing", async () => {
    const notFound = { ok: false, status: 404 };
    await expect(fetchPackageTimes("nope", async () => notFound)).resolves.toEqual({
      ok: false,
      message: "registry error 404 for nope",
    });
  });

  it("reports a network failure without throwing", async () => {
    const boom = async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    };
    await expect(fetchPackageTimes("effect", boom)).resolves.toEqual({
      ok: false,
      message: "registry request failed for effect: getaddrinfo ENOTFOUND",
    });
  });

  it("reports a body that is not JSON", async () => {
    const badBody = {
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    };
    await expect(fetchPackageTimes("effect", async () => badBody)).resolves.toEqual({
      ok: false,
      message: "registry request failed for effect: Unexpected token < in JSON",
    });
  });

  it("encodes a scoped package name", async () => {
    let requested = "";
    await fetchPackageTimes("@scope/pkg", async (url) => {
      requested = url;
      return okResponse({});
    });
    expect(requested).toBe("https://registry.npmjs.org/%40scope%2Fpkg");
  });
});
