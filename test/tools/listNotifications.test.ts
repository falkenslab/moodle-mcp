import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Five notifications, newest first; Moodle's service gives the window it's asked for (limit 0: all).
const ALL = Array.from({ length: 5 }, (_, i) => ({ id: 20 - i, useridfrom: 3, subject: `Notice ${i}`, fullmessage: `Text ${i}`, smallmessage: "", timecreated: 1_790_000_000 - i * 60, read: i % 2 === 1 }));

function moodle(): FakeMoodleState {
  return {
    user: { id: 3, fullName: "Teacher" },
    serviceCalls: [],
    services: {
      message_popup_get_popup_notifications: ({ offset = 0, limit = 0 }: Record<string, unknown>) => ({
        notifications: ALL.slice(Number(offset), Number(limit) ? Number(offset) + Number(limit) : undefined),
        unreadcount: 3,
      }),
      core_user_get_users_by_field: () => [{ id: 3, fullname: "Teacher" }],
    },
  };
}

describe("list_notifications", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE, studentData: "clear" }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("gives a page at a time and says whether there are more", async () => {
    const { client, context } = await connect(moodle());
    const page = async (args: Record<string, unknown>) => {
      const result = await client.callTool({ name: "list_notifications", arguments: args });
      assert.equal(result.isError, undefined, JSON.stringify(result.content));
      return result.structuredContent as { notifications: { id: number }[]; more: boolean };
    };
    const first = await page({ limit: 2 });
    assert.deepEqual(first.notifications.map((n) => n.id), [20, 19]);
    assert.equal(first.more, true);
    const last = await page({ limit: 2, offset: 4 });
    assert.deepEqual(last.notifications.map((n) => n.id), [16]);
    assert.equal(last.more, false);
    const all = await page({});
    assert.equal(all.notifications.length, 5);
    assert.equal(all.more, false);
    await context.close();
  });
});
