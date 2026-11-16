import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

const sites: Config["sites"] = [{ name: "school", url: SITE, profileDir: "/p/school", origin: "configuration" }];
const classrooms = [{ site: "school", courseId: 3, url: `${SITE}course/view.php?id=3` }];

/** A site whose course 3 has the person (3) and their teacher (9); 8 is on the site, in no classroom. Records what's sent. */
async function connect(config: Config) {
  const sent: Record<string, unknown>[] = [];
  const state: FakeMoodleState = {
    user: { id: 3, fullName: "Student Smith" },
    serviceCalls: [],
    services: {
      core_table_get_dynamic_table_content: () => {
        const tr = [[3, "Student Smith"], [9, "Grace Hopper"]].map(([id, name]) => `<tr><td><input id="user${id}" type="checkbox" class="usercheckbox"></td><th scope="row"><a href="${SITE}user/view.php?id=${id}&amp;course=3">${name}</a></th></tr>`).join("");
        return { html: `<div data-table-total-rows="2"><table><tbody>${tr}</tbody></table></div>`, warnings: [] };
      },
      core_message_send_instant_messages: ({ messages }) => {
        sent.push(...(messages as Record<string, unknown>[]));
        return [{ msgid: 5, conversationid: 6, text: "x", timecreated: 1 }];
      },
    },
  };
  const context = await browser!.newContext();
  await serveFakeMoodle(context, state);
  await context.route(`${SITE}user/index.php**`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: moodlePage({ userId: 3, heading: "Participants", bodyId: "page-course-view-participants", body: `<select data-field-name="roles"></select>` }) }));
  const server = createServer({ config, browser: fakeBrowserManager({ context: async () => context }) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), client.connect(a)]);
  const send = async (userId: number) => {
    const r = await client.callTool({ name: "send_message", arguments: { userId, text: "Can I hand it in on Friday?" } });
    return r.isError ? (r.content as { text: string }[])[0]!.text : undefined;
  };
  return { client, context, sent, state, send };
}

describe("private messages under classrooms (#68)", { skip: !browser && "no system browser" }, () => {
  it("are listed, go to a classroom's participant, and are refused for anyone else before Moodle", async () => {
    const { client, context, sent, state, send } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school", classrooms }));
    assert.ok((await client.listTools()).tools.some((t) => t.name === "send_message"));
    assert.equal(await send(9), undefined);
    assert.deepEqual(sent.map((m) => m.touserid), [9]);
    assert.match((await send(8)) ?? "", /only to participants of the classrooms' courses \(3\)/);
    assert.equal(sent.length, 1);
    assert.equal(state.serviceCalls!.filter((c) => c.methodname === "core_message_send_instant_messages").length, 1);
    await context.close();
  });

  it("go to anyone without classrooms, without reading participants", async () => {
    const { context, sent, state, send } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school" }));
    assert.equal(await send(8), undefined);
    assert.deepEqual(sent.map((m) => m.touserid), [8]);
    assert.ok(!state.serviceCalls!.some((c) => c.methodname === "core_table_get_dynamic_table_content"));
    await context.close();
  });
});
