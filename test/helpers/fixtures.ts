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
    sources: { moodleUrl: "environment", profileDir: "default", channel: "default", headless: "default", downloadBrowser: "default", trail: "default", scopes: "default", studentData: "default", role: "default" },
    ...overrides,
    // What the person set at start-up, unless a test sets it: the same as what's in force.
    limits: overrides.limits ?? { scopes: overrides.scopes ?? [...SCOPES], studentData: overrides.studentData ?? "clear", role: overrides.role ?? "all" },
  };
}

export { fakeBrowserManager } from "@falkenslab/moodle-driver/testing";
