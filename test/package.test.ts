import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies?: Record<string, string>; bundleDependencies?: string[] };
const build = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");

describe("the published package", () => {
  it("lists as dependencies only what the bundle leaves out, and brings it", () => {
    // esbuild inlines every package but its externals; a dependency must be one of those, and shipped
    // in the package (bundleDependencies), or agent-kit refuses the package and npx downloads it for nothing (#48).
    const external = JSON.parse((/external:\s*(\[[^\]]*\])/.exec(build)?.[1] ?? "[]").replaceAll("'", '"')) as string[];
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      assert.ok(external.includes(name), `${name} is bundled: list it in devDependencies`);
      assert.ok(pkg.bundleDependencies?.includes(name), `${name} is external: list it in bundleDependencies too`);
    }
  });
});
