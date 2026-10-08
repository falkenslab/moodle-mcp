import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { BrowserContext, Cookie } from "playwright-core";
import { BrowserDownloadingError, BrowserNotFoundError, createBrowserManager } from "../src/browser.js";
import type { Config } from "../src/config.js";
import { SESSION_COOKIES_FILE } from "../src/sessionCookies.js";
import { testConfig } from "./helpers/fixtures.js";

let profileDir: string;
before(async () => {
  profileDir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-test-"));
});
after(async () => {
  await rm(profileDir, { recursive: true, force: true });
});

function config(overrides: Partial<Config> = {}): Config {
  return testConfig({ profileDir, ...overrides });
}

function cookie(name: string, expires = -1): Cookie {
  return { name, value: "v", domain: "localhost", path: "/", expires, httpOnly: true, secure: false, sameSite: "Lax" };
}

/** A context with what the manager uses: `close`, cookies and the navigation timeout. */
function fakeContext(initialCookies: Cookie[] = []): BrowserContext & { jar: Cookie[] } {
  const emitter = new EventEmitter();
  const jar = [...initialCookies];
  return Object.assign(emitter, {
    jar,
    close: async () => void emitter.emit("close"),
    cookies: async () => [...jar],
    addCookies: async (cookies: Cookie[]) => void jar.push(...cookies),
    setDefaultNavigationTimeout: () => undefined,
  }) as unknown as BrowserContext & { jar: Cookie[] };
}

interface LaunchCall {
  channel: string;
  headless: boolean;
}

/** A launcher where the channels in `installed` work and the rest fail as Playwright does. */
function fakeLaunch(installed: string[], makeContext = () => fakeContext()) {
  const calls: LaunchCall[] = [];
  const launch = async (_dir: string, options?: { channel?: string; headless?: boolean }) => {
    const channel = options?.channel ?? "";
    calls.push({ channel, headless: options?.headless ?? true });
    if (!installed.includes(channel)) throw new Error(`Chromium distribution '${channel}' is not found at C:\\nowhere`);
    return makeContext();
  };
  return { calls, launch: launch as never };
}

describe("createBrowserManager", () => {
  it("falls back from Edge to Chrome", async () => {
    const { calls, launch } = fakeLaunch(["chrome"]);
    const browser = createBrowserManager(config(), launch);
    await browser.context();
    assert.deepEqual(calls.map((c) => c.channel), ["msedge", "chrome"]);
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
    assert.equal(calls.length, 1);
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

  it("relaunches with a window when asked, and keeps the window for later calls", async () => {
    const { calls, launch } = fakeLaunch(["msedge"]);
    const browser = createBrowserManager(config(), launch);
    await browser.context();
    const headed = await browser.context({ headed: true });
    assert.equal(await browser.context(), headed);
    assert.deepEqual(calls.map((c) => c.headless), [true, false]);
  });

  it("opens with a window when the configuration isn't headless", async () => {
    const { calls, launch } = fakeLaunch(["msedge"]);
    await createBrowserManager(config({ headless: false }), launch).context();
    assert.equal(calls[0]?.headless, false);
  });

  it("keeps session cookies across launches in the profile", async () => {
    const { launch } = fakeLaunch(["msedge"]);
    const first = createBrowserManager(config(), launch);
    const context = (await first.context()) as BrowserContext & { jar: Cookie[] };
    context.jar.push(cookie("MoodleSession"), cookie("Persistent", 2_000_000_000));
    await first.close();
    const saved = JSON.parse(await readFile(path.join(profileDir, SESSION_COOKIES_FILE), "utf8")) as Cookie[];
    assert.deepEqual(saved.map((c) => c.name), ["MoodleSession"]);

    // The browser dropped the session cookie and kept the persistent one, as Chromium does.
    const second = createBrowserManager(config(), fakeLaunch(["msedge"], () => fakeContext([cookie("Persistent", 2_000_000_000)])).launch);
    const reopened = (await second.context()) as BrowserContext & { jar: Cookie[] };
    assert.deepEqual(reopened.jar.map((c) => c.name).sort(), ["MoodleSession", "Persistent"]);
  });

  describe("with no system browser", () => {
    /** An installer that "downloads" Chromium when `finish` is called, or fails. */
    function fakeInstall(installed: string[]) {
      let calls = 0;
      let finish!: (ok?: boolean) => void;
      const install = () => {
        calls++;
        return new Promise<void>((resolve, reject) => {
          finish = (ok = true) => {
            if (!ok) return reject(new Error("network down"));
            installed.push("chromium");
            resolve();
          };
        });
      };
      return { install, calls: () => calls, finish: (ok?: boolean) => finish(ok) };
    }
    const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

    it("downloads Chromium once, answers meanwhile, then launches it", async () => {
      const installed: string[] = [];
      const { calls, launch } = fakeLaunch(installed);
      const installer = fakeInstall(installed);
      const browser = createBrowserManager(config(), launch, installer.install);
      await assert.rejects(browser.context(), BrowserDownloadingError);
      await assert.rejects(browser.context(), /Neither Microsoft Edge nor Google Chrome is available, so the server is downloading it/);
      assert.equal(installer.calls(), 1);
      assert.equal(browser.chromiumDownload(), "downloading");
      installer.finish();
      await settle();
      assert.equal(browser.chromiumDownload(), undefined);
      await browser.context();
      assert.equal(browser.openChannel(), "chromium");
      assert.deepEqual(calls.map((c) => c.channel), ["msedge", "chrome", "chromium", "msedge", "chrome", "msedge", "chrome", "chromium"]);
    });

    it("downloads again after a failed download, saying so", async () => {
      const installed: string[] = [];
      const installer = fakeInstall(installed);
      const browser = createBrowserManager(config(), fakeLaunch(installed).launch, installer.install);
      await assert.rejects(browser.context(), BrowserDownloadingError);
      installer.finish(false);
      await settle();
      assert.equal(browser.chromiumDownload(), "failed");
      await assert.rejects(browser.context(), /previous download failed \(network down\)/);
      assert.equal(installer.calls(), 2);
    });

    it("doesn't download when it's turned off", async () => {
      const installer = fakeInstall([]);
      const { calls, launch } = fakeLaunch([]);
      const browser = createBrowserManager(config({ downloadBrowser: false }), launch, installer.install);
      await assert.rejects(browser.context(), (error: unknown) => error instanceof BrowserNotFoundError && /MOODLE_MCP_DOWNLOAD_BROWSER/.test(error.message));
      assert.equal(installer.calls(), 0);
      assert.deepEqual(calls.map((c) => c.channel), ["msedge", "chrome"]);
    });

    it("goes straight to Chromium when that channel is chosen", async () => {
      const installed = ["msedge", "chromium"];
      const { calls, launch } = fakeLaunch(installed);
      const browser = createBrowserManager(config({ channel: "chromium" }), launch, fakeInstall(installed).install);
      await browser.context();
      assert.deepEqual(calls.map((c) => c.channel), ["chromium"]);
    });
  });

  it("tries only the configured channel and explains a missing browser", async () => {
    const { calls, launch } = fakeLaunch(["msedge"]);
    const browser = createBrowserManager(config({ channel: "chrome" }), launch);
    await assert.rejects(browser.context(), BrowserNotFoundError);
    assert.deepEqual(calls.map((c) => c.channel), ["chrome"]);
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
