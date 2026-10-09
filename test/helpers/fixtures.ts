import path from "node:path";
import type { Config } from "../../src/config.js";

/** A configuration as `loadConfig` would give it, with these values instead. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    moodleUrl: "http://moodle.test/",
    profileDir: path.resolve("/profiles/moodle"),
    channel: undefined,
    headless: true,
    downloadBrowser: true,
    trail: "realistic",
    sources: { moodleUrl: "environment", profileDir: "default", channel: "default", headless: "default", downloadBrowser: "default", trail: "default" },
    ...overrides,
  };
}

export { fakeBrowserManager } from "@falkenslab/moodle-driver/testing";
