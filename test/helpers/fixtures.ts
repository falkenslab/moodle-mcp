import { tmpdir } from "node:os";
import path from "node:path";
import type { Config } from "../../src/config.js";
import { SCOPES } from "../../src/tools/scopes.js";

/** A configuration as `loadConfig` would give it, with these values instead. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    moodleUrl: "http://moodle.test/",
    profileDir: path.resolve("/profiles/moodle"),
    channel: undefined,
    headless: true,
    downloadBrowser: true,
    trail: "realistic",
    scopes: [...SCOPES],
    studentData: "clear",
    role: "all",
    access: "write",
    // Tests are about each tool, not about confirming (ADR-023): the client is trusted to have asked,
    // unless a test sets "elicit" (test/tools/confirm.test.ts).
    confirm: "client",
    // Each test process its own data folder: run-time sites are saved there.
    dataDir: path.join(tmpdir(), `moodle-mcp-test-${process.pid}`),
    sites: [],
    activeSite: undefined,
    sources: { moodleUrl: "environment", profileDir: "default", channel: "default", headless: "default", downloadBrowser: "default", trail: "default", scopes: "default", studentData: "default", role: "default", access: "default" },
    ...overrides,
    // What the person set at start-up, unless a test sets it: the same as what's in force.
    limits: overrides.limits ?? { scopes: overrides.scopes ?? [...SCOPES], studentData: overrides.studentData ?? "clear", role: overrides.role ?? "all", access: overrides.access ?? "write" },
  };
}

export { fakeBrowserManager } from "@falkenslab/moodle-driver/testing";
