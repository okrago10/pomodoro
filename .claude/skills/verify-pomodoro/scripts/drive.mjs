#!/usr/bin/env node
// 使い方: node .claude/skills/verify-pomodoro/scripts/drive.mjs <scenario>
// scenario: timer | phase | reset | records | all
// launch.sh 済みのインスタンスを iPhone 相当の viewport で操作し、
// .verify-artifacts/<scenario>-<時刻>/ に screenshot / aria / log.json を残す。
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = execSync("git rev-parse --show-toplevel").toString().trim();
const url = readFileSync(join(root, ".verify-artifacts/run/url"), "utf8").trim();
const require = createRequire(join(execSync("npm root -g").toString().trim(), "/"));
const { chromium } = require("playwright");

const STORAGE_KEY = "pomodoro:daily-work-ms"; // src/timer/dailyWorkStore.ts と同じ
const WORK_MS = 25 * 60_000;
const scenario = process.argv[2] ?? "timer";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const log = [];
const check = (name, actual, expected) => {
  const ok = typeof expected === "function" ? expected(actual) : actual === expected;
  log.push({ name, actual, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(actual)}`);
  if (!ok) process.exitCode = 1;
};

async function withPage(name, fn) {
  const out = join(root, ".verify-artifacts", `${name}-${stamp}`);
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    permissions: ["notifications"],
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => log.push({ pageerror: String(e) }));
  // 実時間を待たずにフェーズを進めるため、ブラウザの時計を差し替える（アプリのコードは触らない）。
  await page.clock.install({ time: new Date("2026-09-26T10:00:00+09:00") });
  await page.goto(url);
  // install だけだと実時間でも進むので止め、以後は runFor の分だけ進める。
  await page.clock.pauseAt(new Date("2026-09-26T10:01:00+09:00"));
  const shot = async (label) => {
    await page.screenshot({ path: join(out, `${label}.png`) });
    writeFileSync(join(out, `${label}.aria.txt`), await page.locator("body").ariaSnapshot());
  };
  try {
    await fn({ page, shot });
  } finally {
    const storage = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    writeFileSync(
      join(out, "log.json"),
      JSON.stringify({ url, scenario: name, storage, log }, null, 2),
    );
    console.log(`evidence: ${out}`);
    await browser.close();
  }
}

const btn = (page, name) => page.getByRole("button", { name, exact: true });
const completeWork = async (page) => {
  await btn(page, "開始").click();
  await page.clock.runFor(WORK_MS + 1000);
};
const remaining = (page) => page.locator("p[aria-live=polite]").innerText();

const scenarios = {
  async timer() {
    await withPage("timer", async ({ page, shot }) => {
      check("initial remaining", await remaining(page), "25:00");
      await shot("01-idle");
      await btn(page, "開始").click();
      await page.clock.runFor(3000);
      check("after 3s", await remaining(page), "24:57");
      await btn(page, "一時停止").click();
      await page.clock.runFor(10_000);
      check("paused stays", await remaining(page), "24:57");
      await shot("02-paused");
      await btn(page, "開始").click();
      await page.clock.runFor(2000);
      check("resumed", await remaining(page), "24:55");
    });
  },
  async phase() {
    await withPage("phase", async ({ page, shot }) => {
      await completeWork(page);
      await shot("01-short-break");
      check("step label", await page.getByText("短い休憩").first().isVisible(), true);
      check("today total", await page.getByText(/^今日 /).innerText(), "今日 25分");
      const stored = await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k) ?? "{}"),
        STORAGE_KEY,
      );
      check("stored ms", stored["2026-09-26"], (v) => v >= WORK_MS);
    });
  },
  async reset() {
    await withPage("reset", async ({ page, shot }) => {
      check("reset disabled when idle", await btn(page, "リセット").isDisabled(), true);
      await btn(page, "開始").click();
      await page.clock.runFor(60_000);
      await btn(page, "リセット").click();
      await page.getByRole("alertdialog").waitFor();
      await shot("01-dialog");
      await btn(page, "キャンセル").click();
      check("cancel keeps", await remaining(page), "24:00");
      await btn(page, "リセット").click();
      await btn(page, "リセットする").click();
      check("after reset", await remaining(page), "25:00");
      check("button label", await btn(page, "開始").isVisible(), true);
      await shot("02-after-reset");
    });
  },
  async records() {
    await withPage("records", async ({ page, shot }) => {
      await completeWork(page);
      await btn(page, "記録").click();
      await btn(page, "戻る").waitFor();
      await shot("01-records");
      check(
        "today bar",
        await page.getByRole("button", { name: "今日 25分" }).getAttribute("aria-pressed"),
        "true",
      );
      await page.getByRole("button", { name: /^昨日 / }).click();
      check(
        "yesterday picked",
        await page.getByRole("button", { name: /^昨日 / }).getAttribute("aria-pressed"),
        "true",
      );
      await shot("02-yesterday");
      await btn(page, "戻る").click();
      check("back to timer", await page.getByText(/^今日 /).innerText(), "今日 25分");
    });
  },
};

const names = scenario === "all" ? Object.keys(scenarios) : [scenario];
for (const n of names) {
  if (!scenarios[n]) throw new Error(`unknown scenario: ${n}`);
  try {
    await scenarios[n]();
  } catch (e) {
    console.log(`FAIL ${n}: ${e}`);
    process.exitCode = 1;
  }
}
