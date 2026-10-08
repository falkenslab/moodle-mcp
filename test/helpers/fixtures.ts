import path from "node:path";
import type { BrowserManager } from "../../src/browser.js";
import type { Config } from "../../src/config.js";

/** A configuration as `loadConfig` would give it, with these values instead. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    moodleUrl: "http://moodle.test/",
    profileDir: path.resolve("/profiles/moodle"),
    channel: undefined,
    headless: true,
    downloadBrowser: true,
    sources: { moodleUrl: "environment", profileDir: "default", channel: "default", headless: "default", downloadBrowser: "default" },
    ...overrides,
  };
}

/** A browser manager that never launches anything, with these methods instead. */
export function fakeBrowserManager(overrides: Partial<BrowserManager> = {}): BrowserManager {
  return {
    context: () => Promise.reject(new Error("this test opens no browser")),
    openChannel: () => undefined,
    chromiumDownload: () => undefined,
    saveSession: async () => undefined,
    close: async () => undefined,
    ...overrides,
  };
}
