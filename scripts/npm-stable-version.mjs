#!/usr/bin/env node
/**
 * Print the newest stable npm version that has been published for at least N days.
 * Usage: node scripts/npm-stable-version.mjs <package> [days=7]
 */
const pkg = process.argv[2];
const days = Number(process.argv[3] ?? 7);

if (!pkg || Number.isNaN(days) || days < 0) {
  console.error("Usage: node scripts/npm-stable-version.mjs <package> [days=7]");
  process.exit(2);
}

const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
if (!res.ok) {
  console.error(`registry error ${res.status} for ${pkg}`);
  process.exit(1);
}

const data = await res.json();
const times = data.time ?? {};
const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const pre = /-/;

const eligible = Object.entries(times)
  .filter(([ver]) => ver !== "created" && ver !== "modified" && !pre.test(ver))
  .map(([version, published]) => ({ version, published, t: Date.parse(published) }))
  .filter((row) => Number.isFinite(row.t) && row.t <= cutoff)
  .sort((a, b) => a.t - b.t);

if (eligible.length === 0) {
  console.error(`no stable version of ${pkg} is at least ${days} days old`);
  process.exit(1);
}

const best = eligible[eligible.length - 1];
const latestStable = Object.entries(times)
  .filter(([ver]) => ver !== "created" && ver !== "modified" && !pre.test(ver))
  .map(([version, published]) => ({ version, published, t: Date.parse(published) }))
  .filter((row) => Number.isFinite(row.t))
  .sort((a, b) => a.t - b.t)
  .at(-1);

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
