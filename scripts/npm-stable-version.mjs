#!/usr/bin/env node
/**
 * Print the newest stable npm version (semver) that has been published for at least N days.
 * Usage: node scripts/npm-stable-version.mjs <package> [days=7]
 */
const pkg = process.argv[2];
const days = Number(process.argv[3] ?? 7);

if (!pkg || Number.isNaN(days) || days < 0) {
  console.error("Usage: node scripts/npm-stable-version.mjs <package> [days=7]");
  process.exit(2);
}

function compareSemver(a, b) {
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

function stableReleases(times) {
  const pre = /-/;
  return Object.entries(times)
    .filter(([ver]) => ver !== "created" && ver !== "modified" && !pre.test(ver))
    .map(([version, published]) => ({ version, published, t: Date.parse(published) }))
    .filter((row) => Number.isFinite(row.t))
    .sort((a, b) => compareSemver(a.version, b.version) || a.t - b.t);
}

let res;
try {
  res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`registry request failed for ${pkg}: ${message}`);
  process.exit(1);
}

if (!res.ok) {
  console.error(`registry error ${res.status} for ${pkg}`);
  process.exit(1);
}

const data = await res.json();
const times = data.time ?? {};
const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const releases = stableReleases(times);
const eligible = releases.filter((row) => row.t <= cutoff);

if (eligible.length === 0) {
  console.error(`no stable version of ${pkg} is at least ${days} days old`);
  process.exit(1);
}

const best = eligible[eligible.length - 1];
const latestStable = releases.at(-1);

console.log(
  JSON.stringify(
    {
      package: pkg,
      days,
      version: best.version,
      published: best.published,
      skippedNewer:
        latestStable && latestStable.version !== best.version
          ? { version: latestStable.version, published: latestStable.published }
          : null,
    },
    null,
    2,
  ),
);
