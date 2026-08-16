#!/usr/bin/env node
/**
 * Fetch HeroUI React v3 docs into gitignored `.heroui-docs/react`.
 * Layout matches `heroui-cli@3.0.4 agents-md --react` (v3 branch sparse clone).
 * The CLI is not invoked: it requires Node >= 22.22 and exits 1 without printing
 * git/maxBuffer errors.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HEROUI_DOCS_BRANCH = "v3";
export const HEROUI_DOCS_REPO = "https://github.com/heroui-inc/heroui.git";
export const HEROUI_DOCS_PREFIX = "apps/docs/content/docs/en";

export function herouiReactDocsRoot(cwd = process.cwd()) {
  return join(cwd, ".heroui-docs", "react");
}

export function herouiReactDocsPresent(cwd = process.cwd()) {
  return existsSync(herouiReactDocsRoot(cwd));
}

export function skipReason(env = process.env, cwd = process.cwd()) {
  if (env.SKIP_HEROUI_DOCS === "1") {
    return "SKIP_HEROUI_DOCS=1";
  }
  if (env.CI === "true") {
    return "CI";
  }
  if (herouiReactDocsPresent(cwd)) {
    return "already present";
  }
  return null;
}

export function copyReactDocsFromClone(cloneDir, destRoot) {
  const src = join(cloneDir, HEROUI_DOCS_PREFIX, "react");
  if (!existsSync(src)) {
    throw new Error(`Expected React docs at ${HEROUI_DOCS_PREFIX}/react in the clone`);
  }
  const dest = herouiReactDocsRoot(destRoot);
  mkdirSync(join(destRoot, ".heroui-docs"), { recursive: true });
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true });
  }
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  const demos = join(cloneDir, "apps", "docs", "src", "demos");
  if (existsSync(demos)) {
    const demoDest = join(dest, "demos");
    if (existsSync(demoDest)) {
      rmSync(demoDest, { recursive: true });
    }
    mkdirSync(demoDest, { recursive: true });
    cpSync(demos, demoDest, { recursive: true });
  }
}

function git(run, args, options) {
  const result = run("git", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(detail || `git ${args.join(" ")} failed`);
  }
  return result;
}

export function fetchHerouiDocs({ cwd = process.cwd(), env = process.env, run = spawnSync } = {}) {
  const skip = skipReason(env, cwd);
  if (skip != null) {
    console.log(`heroui docs: skip (${skip})`);
    return { status: "skipped", reason: skip };
  }

  const cloneDir = mkdtempSync(join(tmpdir(), "heroui-docs-clone-"));
  try {
    git(run, [
      "clone",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
      "--branch",
      HEROUI_DOCS_BRANCH,
      HEROUI_DOCS_REPO,
      cloneDir,
    ]);
    git(run, ["sparse-checkout", "set", "--no-cone", "--stdin"], {
      cwd: cloneDir,
      input: [
        `${HEROUI_DOCS_PREFIX}/react`,
        `!${HEROUI_DOCS_PREFIX}/react/migration`,
        "apps/docs/src/demos",
        "",
      ].join("\n"),
    });
    copyReactDocsFromClone(cloneDir, cwd);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`heroui docs: fetch failed (${message}); run npm run docs:heroui`);
    return { status: "failed", code: 1, error: message };
  } finally {
    rmSync(cloneDir, { recursive: true, force: true });
  }

  if (!herouiReactDocsPresent(cwd)) {
    console.warn("heroui docs: clone finished but .heroui-docs/react is missing");
    return { status: "failed", code: 1 };
  }

  console.log("heroui docs: fetched .heroui-docs/react");
  return { status: "fetched" };
}

const invokedDirectly =
  process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const soft = process.argv.includes("--soft");
  const result = fetchHerouiDocs();
  if (result.status === "failed" && !soft) {
    process.exit(result.code);
  }
}
