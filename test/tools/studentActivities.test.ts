import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

async function connect(context?: BrowserContext): Promise<Client> {
  const manager = context ? fakeBrowserManager({ context: async () => context }) : fakeBrowserManager();
  const server = createServer({ config: testConfig({ moodleUrl: SITE, trail: "fast" }), browser: manager });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("student activity tools", () => {
  it("declare what they do, and answer_lesson_page takes one kind of answer", async () => {
    const client = await connect();
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of ["get_choice", "get_h5p_activity"]) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    assert.deepEqual([tools.get("answer_lesson_page")?.destructiveHint, tools.get("answer_lesson_page")?.idempotentHint], [true, false]);
    assert.deepEqual([tools.get("set_completion")?.readOnlyHint, tools.get("set_completion")?.idempotentHint], [false, true]);
    for (const args of [{}, { button: "Next", responses: { answer: "1" } }]) {
      const result = await client.callTool({ name: "answer_lesson_page", arguments: { activityId: 7, ...args } });
      assert.match(JSON.stringify(result.content), /Give one of button, buttonPosition or responses/);
    }
  });
});

describe("student activity tools against the fake Moodle", { skip: !browser && "no system browser" }, () => {
  it("read a choice and answer it", async () => {
    let chosen: string | undefined;
    const option = (id: number, label: string, full = false) => `<li><input value="${id}" name="answer" type="radio" id="choice_${id}"${chosen === String(id) ? ' checked="1"' : ""}${full ? " disabled" : ""}><label for="choice_${id}">${label}</label></li>`;
    const view = () =>
      moodlePage({
        userId: 4,
        bodyId: "page-mod-choice-view",
        body: `<div data-activityname="Favourite loop"></div><div id="region-main"><div class="activity-description" id="intro">Which loop?</div><div role="main">${chosen ? `<div id="yourselection" class="generalbox">Your selection: ${{ "1": "for", "2": "while" }[chosen]}</div>` : ""}<form method="POST" action="${SITE}mod/choice/view.php"><ul>${option(1, "for")}${option(2, "while")}${option(3, "do-while", true)}</ul><input type="hidden" name="action" value="makechoice"><input type="submit" value="Save my choice"></form></div></div>`,
      });
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 4, fullName: "Ana Student" } });
    await context.route(`${SITE}mod/choice/view.php**`, (route) => {
      if (route.request().method() === "POST") chosen = new URLSearchParams(route.request().postData() ?? "").get("answer") ?? chosen;
      return route.fulfill({ status: 200, contentType: "text/html", body: view() });
    });
    const client = await connect(context);
    const read = await client.callTool({ name: "get_choice", arguments: { activityId: 40 } });
    assert.equal(read.isError, undefined, JSON.stringify(read.content));
    const out = read.structuredContent as { options: { id: number; full: boolean }[]; canAnswer: boolean };
    assert.deepEqual([out.options.map((o) => [o.id, o.full]), out.canAnswer], [[[1, false], [2, false], [3, true]], true]);
    const answered = await client.callTool({ name: "answer_choice", arguments: { activityId: 40, optionIds: [2] } });
    assert.equal(answered.isError, undefined, JSON.stringify(answered.content));
    assert.deepEqual((answered.structuredContent as { choice: { answer: string[] } }).choice.answer, ["while"]);
    await context.close();
  });
});
