import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import type { BrowserManager } from "../../src/browser.js";
import { createServer } from "../../src/createServer.js";
import { followPages, openSitePage } from "../../src/moodle/session.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

async function connect(manager: BrowserManager): Promise<Client> {
  const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: manager });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("show_browser", () => {
  it("shows and hides the browser, and changes nothing in Moodle", async () => {
    let visible = false;
    const client = await connect(fakeBrowserManager({ visible: () => visible, setVisible: async (v) => void (visible = v) }));
    const shown = await client.callTool({ name: "show_browser", arguments: { visible: true } });
    assert.deepEqual(shown.structuredContent, { visible: true });
    await client.callTool({ name: "show_browser", arguments: { visible: false } });
    assert.equal(visible, false);
    const tool = (await client.listTools()).tools.find((t) => t.name === "show_browser");
    assert.deepEqual([tool?.annotations?.readOnlyHint, tool?.annotations?.destructiveHint], [false, false]);
  });
});

describe("following the tools' pages", { skip: !browser && "no system browser" }, () => {
  const RAW = [{ id: 2, shortname: "s", fullname: "S", viewurl: `${SITE}course/view.php?id=2`, visible: true, startdate: 0, progress: null, hasprogress: false, timeaccess: null }];
  const state: FakeMoodleState = { user: { id: 3, fullName: "T" }, services: { core_course_get_enrolled_courses_by_timeline_classification: () => ({ courses: RAW, nextoffset: 1 }) } };

  async function watching(visible: boolean): Promise<{ client: Client; context: BrowserContext; shown: string[] }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const shown: string[] = [];
    const client = await connect(fakeBrowserManager({ context: async () => context, visible: () => visible, show: async (url) => void shown.push(url) }));
    return { client, context, shown };
  }

  it("shows an AJAX tool's page while the person watches, and nothing otherwise", async () => {
    const on = await watching(true);
    await on.client.callTool({ name: "list_courses", arguments: {} });
    assert.deepEqual(on.shown, [`${SITE}my/courses.php`]);
    await on.context.close();
    const off = await watching(false);
    await off.client.callTool({ name: "list_courses", arguments: {} });
    assert.deepEqual(off.shown, []);
    await off.context.close();
  });

  it("shows the page a tool opened once it's done with it, but not the kept service tab", async () => {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const shown: string[] = [];
    followPages(context, async (url) => void shown.push(url));
    const page = await openSitePage(context, SITE, "mod/quiz/view.php?id=5");
    assert.deepEqual(shown, []);
    await page.close();
    assert.deepEqual(shown, [`${SITE}mod/quiz/view.php?id=5`]);
    await (await openSitePage(context, SITE, "my/", { follow: false })).close();
    assert.equal(shown.length, 1);
    await context.close();
  });
});
