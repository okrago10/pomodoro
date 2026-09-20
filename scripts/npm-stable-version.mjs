#!/usr/bin/env node
/**
 * Print the newest stable npm version (semver) that has been published for at least N days.
 * Usage: node scripts/npm-stable-version.mjs <package> [days=7]
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;

export function compareSemver(a, b) {
  const pa = a.split(".").map((part) => Number(part));
  const pb = b.split(".").map((part) => Number(part));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = Number.isFinite(pa[i]) ? pa[i] : 0;
    const db = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}

export function stableReleases(times) {
  const pre = /-/;
  return Object.entries(times)
    .filter(([ver]) => ver !== "created" && ver !== "modified" && !pre.test(ver))
    .map(([version, published]) => ({ version, published, t: Date.parse(published) }))
    .filter((row) => Number.isFinite(row.t))
    .sort((a, b) => compareSemver(a.version, b.version) || a.t - b.t);
}

/**
 * Pick the highest stable version published at least `days` ago.
 * Returns null when no release is old enough.
 */
export function pickStableVersion(times, { days, now = Date.now() }) {
  const releases = stableReleases(times);
  const eligible = releases.filter((row) => row.t <= now - days * DAY_MS);
  if (eligible.length === 0) {
    return null;
  }
  const best = eligible[eligible.length - 1];
  const latestStable = releases.at(-1);
  return {
    version: best.version,
    published: best.published,
    skippedNewer:
      latestStable && latestStable.version !== best.version
        ? { version: latestStable.version, published: latestStable.published }
        : null,
  };
}

/** Read the CLI arguments. Returns null when they are unusable. */
export function parseArgs(argv) {
  const pkg = argv[2];
  const days = Number(argv[3] ?? 7);
  if (!pkg || Number.isNaN(days) || days < 0) {
    return null;
  }
  return { pkg, days };
}

/** Fetch a package's publish times from the npm registry. */
export async function fetchPackageTimes(pkg, fetchImpl = fetch) {
  let res;
  let data;
  try {
    res = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
    if (!res.ok) {
      return { ok: false, message: `registry error ${res.status} for ${pkg}` };
    }
    data = await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `registry request failed for ${pkg}: ${message}` };
  }

  return { ok: true, times: data.time ?? {} };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args === null) {
    console.error("Usage: node scripts/npm-stable-version.mjs <package> [days=7]");
    return 2;
  }

  const fetched = await fetchPackageTimes(args.pkg);
  if (!fetched.ok) {
    console.error(fetched.message);
    return 1;
  }

  const picked = pickStableVersion(fetched.times, { days: args.days });
  if (picked === null) {
    console.error(`no stable version of ${args.pkg} is at least ${args.days} days old`);
    return 1;
  }

  console.log(JSON.stringify({ package: args.pkg, days: args.days, ...picked }, null, 2));
  return 0;
}

const invokedDirectly =
  process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  process.exit(await main(process.argv));
}
