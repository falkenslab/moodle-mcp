import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { BrowserContext } from "playwright-core";
import { BrowserNotFoundError, createBrowserManager } from "../src/browser.js";
import type { Config } from "../src/config.js";

let profileDir: string;
before(async () => {
  profileDir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-test-"));
});
after(async () => {
  await rm(profileDir, { recursive: true, force: true });
});

function config(overrides: Partial<Config> = {}): Config {
  return { moodleUrl: "http://localhost:8080/", profileDir, channel: undefined, headless: true, ...overrides };
}

/** A context that only emits `close`, which is all the manager uses. */
function fakeContext(): BrowserContext {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { close: async () => void emitter.emit("close") }) as unknown as BrowserContext;
}

/** A launcher where the channels in `installed` work and the rest fail as Playwright does. */
function fakeLaunch(installed: string[]) {
  const calls: string[] = [];
  const launch = async (_dir: string, options?: { channel?: string }) => {
    const channel = options?.channel ?? "";
    calls.push(channel);
    if (!installed.includes(channel)) throw new Error(`Chromium distribution '${channel}' is not found at C:\\nowhere`);
    return fakeContext();
  };
  return { calls, launch: launch as never };
}

describe("createBrowserManager", () => {
  it("falls back from Edge to Chrome", async () => {
    const { calls, launch } = fakeLaunch(["chrome"]);
    const browser = createBrowserManager(config(), launch);
    await browser.context();
    assert.deepEqual(calls, ["msedge", "chrome"]);
    assert.equal(browser.openChannel(), "chrome");
  });

  it("recognizes Playwright's message without an install location", async () => {
    let calls = 0;
    const launch = (async () => {
      if (calls++ === 0) throw new Error("Chromium distribution 'msedge' is not found");
      return fakeContext();
    }) as never;
    const browser = createBrowserManager(config(), launch);
    await browser.context();
    assert.equal(browser.openChannel(), "chrome");
  });

  it("launches once for concurrent callers and reuses the context", async () => {
    const { calls, launch } = fakeLaunch(["msedge"]);
    const browser = createBrowserManager(config(), launch);
    const [a, b] = await Promise.all([browser.context(), browser.context()]);
    assert.equal(a, b);
    assert.equal(await browser.context(), a);
    assert.deepEqual(calls, ["msedge"]);
  });

  it("opens a new context after the window is closed", async () => {
    const { calls, launch } = fakeLaunch(["msedge"]);
    const browser = createBrowserManager(config(), launch);
    const first = await browser.context();
    await first.close();
    assert.equal(browser.openChannel(), undefined);
    assert.notEqual(await browser.context(), first);
    assert.equal(calls.length, 2);
  });

  it("tries only the configured channel and explains a missing browser", async () => {
    const { calls, launch } = fakeLaunch(["msedge"]);
    const browser = createBrowserManager(config({ channel: "chrome" }), launch);
    await assert.rejects(browser.context(), BrowserNotFoundError);
    assert.deepEqual(calls, ["chrome"]);
  });

  it("passes other launch errors through and retries on the next call", async () => {
    let fail = true;
    const launch = (async () => {
      if (fail) throw new Error("profile locked");
      return fakeContext();
    }) as never;
    const browser = createBrowserManager(config(), launch);
    await assert.rejects(browser.context(), /profile locked/);
    fail = false;
    await browser.context();
  });
});
