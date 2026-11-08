import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import type { BrowserManager } from "@falkenslab/moodle-driver";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

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

  it("gives a tool's page in _meta, and shows it while the person watches", async () => {
    const on = await watching(true);
    const watched = await on.client.callTool({ name: "list_courses", arguments: {} });
    assert.deepEqual(on.shown, [`${SITE}my/courses.php`]);
    assert.equal(watched._meta?.page, `${SITE}my/courses.php`);
    await on.context.close();
    const off = await watching(false);
    const unwatched = await off.client.callTool({ name: "list_courses", arguments: {} });
    assert.deepEqual(off.shown, []);
    assert.equal(unwatched._meta?.page, `${SITE}my/courses.php`);
    // What the agent reads is the same: the page is only in _meta.
    assert.deepEqual(unwatched.content, watched.content);
    assert.doesNotMatch(JSON.stringify(unwatched.content), /my\/courses\.php/);
    await off.context.close();
  });

  it("gives no page for a tool without one", async () => {
    const { client, context } = await watching(false);
    assert.equal((await client.callTool({ name: "server_info", arguments: {} }))._meta?.page, undefined);
    await context.close();
  });

});
