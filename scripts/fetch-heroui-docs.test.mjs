import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  copyReactDocsFromClone,
  fetchHerouiDocs,
  HEROUI_DOCS_PREFIX,
  herouiReactDocsPresent,
  skipReason,
} from "./fetch-heroui-docs.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("heroui docs fetch", () => {
  it("documents install-time fetch in README and package.json", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(readme).toContain("npm run docs:heroui");
    expect(readme).toContain(".heroui-docs/react");
    expect(pkg.scripts["docs:heroui"]).toBe("node scripts/fetch-heroui-docs.mjs");
    expect(pkg.scripts.postinstall).toBe("node scripts/fetch-heroui-docs.mjs --soft");
  });

  it("detects a present docs tree", () => {
    const cwd = mkdtempSync(join(tmpdir(), "heroui-docs-present-"));
    expect(herouiReactDocsPresent(cwd)).toBe(false);
    mkdirSync(join(cwd, ".heroui-docs", "react"), { recursive: true });
    expect(herouiReactDocsPresent(cwd)).toBe(true);
  });

  it("skips when CI, opt-out, or docs already exist", () => {
    const cwd = mkdtempSync(join(tmpdir(), "heroui-docs-skip-"));
    expect(skipReason({ SKIP_HEROUI_DOCS: "1" }, cwd)).toBe("SKIP_HEROUI_DOCS=1");
    expect(skipReason({ CI: "true" }, cwd)).toBe("CI");
    mkdirSync(join(cwd, ".heroui-docs", "react"), { recursive: true });
    expect(skipReason({}, cwd)).toBe("already present");
  });

  it("does not spawn git when skipped", () => {
    const cwd = mkdtempSync(join(tmpdir(), "heroui-docs-nospawn-"));
    mkdirSync(join(cwd, ".heroui-docs", "react"), { recursive: true });
    let spawned = false;
    const result = fetchHerouiDocs({
      cwd,
      env: {},
      run: () => {
        spawned = true;
        return { status: 0 };
      },
    });
    expect(result).toEqual({ status: "skipped", reason: "already present" });
    expect(spawned).toBe(false);
  });

  it("copies react docs and demos from a clone tree", () => {
    const cloneDir = mkdtempSync(join(tmpdir(), "heroui-clone-"));
    const destRoot = mkdtempSync(join(tmpdir(), "heroui-dest-"));
    const src = join(cloneDir, HEROUI_DOCS_PREFIX, "react");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "button.mdx"), "# Button\n");
    const demos = join(cloneDir, "apps", "docs", "src", "demos");
    mkdirSync(demos, { recursive: true });
    writeFileSync(join(demos, "basic.tsx"), "export {}\n");
    copyReactDocsFromClone(cloneDir, destRoot);
    expect(herouiReactDocsPresent(destRoot)).toBe(true);
    expect(readFileSync(join(destRoot, ".heroui-docs", "react", "button.mdx"), "utf8")).toBe(
      "# Button\n",
    );
    expect(
      readFileSync(join(destRoot, ".heroui-docs", "react", "demos", "basic.tsx"), "utf8"),
    ).toBe("export {}\n");
  });
});
