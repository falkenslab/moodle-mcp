import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import type { ContextOptions } from "@falkenslab/moodle-driver";
import { createServer } from "../../src/createServer.js";
import { LoginTimeoutError, LoginWindowClosedError, waitForLogin } from "../../src/tools/login.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

type State = { user?: { id: number; fullName: string } };

async function fakeSite(state: State): Promise<BrowserContext> {
  const context = await browser!.newContext();
  await serveFakeMoodle(context, state);
  return context;
}

/**
 * The person logs in `delayMs` after the login page shows: the site gets a user and that page moves
 * on to the dashboard.
 */
function logInLater(context: BrowserContext, state: State, delayMs: number) {
  const timer = setInterval(() => {
    const page = context.pages().find((p) => p.url() === `${SITE}login/index.php`);
    if (!page) return;
    clearInterval(timer);
    setTimeout(() => {
      state.user = { id: 4, fullName: "Grace Hopper" };
      void page.goto(`${SITE}my/`).catch(() => undefined);
    }, delayMs);
  }, 20);
}

describe("waitForLogin", { skip: !browser && "no system browser" }, () => {
  it("returns once the page shows the site logged in", async () => {
    const state: State = {};
    const context = await fakeSite(state);
    const page = await context.newPage();
    await page.goto(`${SITE}login/index.php`);
    logInLater(context, state, 300);
    await waitForLogin(page, SITE, { timeoutMs: 10_000, pollMs: 50 });
    assert.equal(page.url(), `${SITE}my/`);
    await context.close();
  });

  it("gives up after the timeout", async () => {
    const context = await fakeSite({});
    const page = await context.newPage();
    await page.goto(`${SITE}login/index.php`);
    await assert.rejects(waitForLogin(page, SITE, { timeoutMs: 200, pollMs: 50 }), LoginTimeoutError);
    await context.close();
  });

  it("notices the window being closed", async () => {
    const context = await fakeSite({});
    const page = await context.newPage();
    await page.goto(`${SITE}login/index.php`);
    setTimeout(() => void context.close(), 200);
    await assert.rejects(waitForLogin(page, SITE, { timeoutMs: 10_000, pollMs: 50 }), LoginWindowClosedError);
  });
});

describe("login tool", { skip: !browser && "no system browser" }, () => {
  async function connect(context: BrowserContext) {
    const requests: ContextOptions[] = [];
    let closed = 0;
    const manager = fakeBrowserManager({
      context: async (options = {}) => (requests.push(options), context),
      openChannel: () => "msedge",
      close: async () => void closed++,
    });
    const config = testConfig({ moodleUrl: SITE });
    const server = createServer({ config, browser: manager });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, requests, closed: () => closed };
  }

  it("returns the user at once when the session is alive, without a window", async () => {
    const context = await fakeSite({ user: { id: 9, fullName: "Alan Turing" } });
    const { client, requests } = await connect(context);
    const result = await client.callTool({ name: "login", arguments: {} });
    assert.deepEqual(result.structuredContent, { status: "already-logged-in", userId: 9, fullName: "Alan Turing", siteUrl: SITE });
    assert.deepEqual(requests, [{}]);
    await context.close();
  });

  it("opens a window, waits for the person and goes back to headless", async () => {
    const state: State = {};
    const context = await fakeSite(state);
    const { client, requests, closed } = await connect(context);
    logInLater(context, state, 1500);
    const result = await client.callTool({ name: "login", arguments: {} });
    assert.deepEqual(result.structuredContent, { status: "logged-in", userId: 4, fullName: "Grace Hopper", siteUrl: SITE });
    assert.deepEqual(requests, [{}, { headed: true }]);
    assert.equal(closed(), 1);
    await context.close();
  });

  it("is annotated as an idempotent, non-destructive write", async () => {
    const context = await fakeSite({});
    const { client } = await connect(context);
    const tool = (await client.listTools()).tools.find((t) => t.name === "login");
    assert.equal(tool?.annotations?.readOnlyHint, false);
    assert.equal(tool?.annotations?.destructiveHint, false);
    assert.equal(tool?.annotations?.idempotentHint, true);
    await context.close();
  });
});
