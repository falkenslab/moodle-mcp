import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, ServiceFailure, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

/** A made-up site where user 9 has role 4 in course 5; `teacher` decides what they can do. */
function moodle(teacher: boolean): FakeMoodleState {
  return {
    user: { id: 9, fullName: "Grace Hopper" },
    bodies: {
      "/user/view.php": `<div id="region-main"><dl><dt>Roles</dt><dd><a href="${SITE}user/index.php?contextid=12&amp;roleid=4">Non-editing teacher</a></dd></dl></div>`,
    },
    services: {
      core_user_get_users_by_field: () => [{ id: 9, username: "grace", fullname: "Grace Hopper", email: "grace@example.org", firstaccess: 1_790_000_000, lastaccess: 0 }],
      tool_mobile_get_public_config: () => ({ sitename: "Test campus" }),
      core_courseformat_get_state: ({ courseid }) => {
        if (courseid !== 5) throw new ServiceFailure("invalidrecordunknown");
        return JSON.stringify({ section: [{ id: "50", number: 0, title: "General" }], cm: [] });
      },
      core_courseformat_get_section_content_items: () => ({ content_items: teacher ? [{ name: "page" }] : [] }),
      gradereport_grader_get_users_in_report: () => {
        if (!teacher) throw new ServiceFailure("nopermissions");
        return { users: [] };
      },
    },
  };
}

describe("get_me", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("tells who the person is, without a course", async () => {
    const { client, context } = await connect(moodle(true));
    const result = await client.callTool({ name: "get_me", arguments: {} });
    // As a client gets it over stdio: JSON drops the fields left undefined.
    assert.deepEqual(JSON.parse(JSON.stringify(result.structuredContent)), {
      userId: 9,
      username: "grace",
      fullName: "Grace Hopper",
      email: "grace@example.org",
      language: "en",
      timeZone: "Europe/Madrid",
      firstAccess: new Date(1_790_000_000_000).toISOString(),
      site: { name: "Test campus", url: SITE },
    });
    await context.close();
  });

  it("adds the roles and abilities in a course", async () => {
    for (const teacher of [true, false]) {
      const { client, context } = await connect(moodle(teacher));
      const result = await client.callTool({ name: "get_me", arguments: { courseId: 5 } });
      const { course } = result.structuredContent as { course: unknown };
      assert.deepEqual(course, { id: 5, roles: [{ id: 4, name: "Non-editing teacher" }], canEdit: teacher, canGrade: teacher });
      await context.close();
    }
  });

  it("passes Moodle's error for a course it can't see, and is read-only", async () => {
    const { client, context } = await connect(moodle(false));
    const result = await client.callTool({ name: "get_me", arguments: { courseId: 6 } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /invalidrecordunknown/);
    const tool = (await client.listTools()).tools.find((t) => t.name === "get_me");
    assert.equal(tool?.annotations?.readOnlyHint, true);
    await context.close();
  });
});
