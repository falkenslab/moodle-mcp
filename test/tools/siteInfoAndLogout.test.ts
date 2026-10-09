import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { courseActivityTypes } from "@falkenslab/moodle-driver";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

describe("activity types and logout", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext; saved: number[] }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    // Moodle's logout ends the session and lands on a page without a user.
    await context.route(`${SITE}login/logout.php**`, (route) => {
      delete state.user;
      return route.fulfill({ status: 200, contentType: "text/html", body: `<body class="notloggedin"><script>var M={cfg:{userId:0}}</script>Logged out</body>` });
    });
    const saved: number[] = [];
    const manager = fakeBrowserManager({ context: async () => context, saveSession: async () => void saved.push(1) });
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: manager });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, saved };
  }

  it("lists the types a course can take, each once", async () => {
    const context = await browser!.newContext();
    const item = (name: string, title: string) => ({ name, title, purpose: "content" });
    await serveFakeMoodle(context, { user: { id: 3, fullName: "T" }, services: { core_course_get_course_content_items: () => ({ content_items: [item("page", "Page"), item("lti", "Tool A"), item("lti", "Tool B"), item("quiz", "Quiz &amp; test")] }) } });
    assert.deepEqual(await courseActivityTypes(context, SITE, 3), [
      { type: "page", title: "Page", purpose: "content" },
      { type: "lti", title: "Tool A", purpose: "content" },
      { type: "quiz", title: "Quiz & test", purpose: "content" },
    ]);
    await context.close();
  });

  it("logs out, saves the ended session, and says when nobody was logged in", async () => {
    const state: FakeMoodleState = { user: { id: 3, fullName: "T" } };
    const { client, context, saved } = await connect(state);
    const first = await client.callTool({ name: "logout", arguments: {} });
    assert.deepEqual(first.structuredContent, { status: "logged-out" });
    assert.equal(state.user, undefined);
    assert.equal(saved.length, 1);
    assert.deepEqual((await client.callTool({ name: "logout", arguments: {} })).structuredContent, { status: "not-logged-in" });
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    assert.equal(tools.get("get_site_info")?.readOnlyHint, true);
    assert.deepEqual([tools.get("logout")?.readOnlyHint, tools.get("logout")?.destructiveHint], [false, false]);
    await context.close();
  });
});
