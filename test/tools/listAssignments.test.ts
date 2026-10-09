import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import type { CourseState } from "../../src/moodle/course.js";
import { assignmentsOf } from "../../src/tools/listAssignments.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Shaped like Moodle 5.2's course state; the data is made up.
const STATE: CourseState = {
  section: [
    { id: "10", number: 0, title: "General" },
    { id: "11", number: 1, title: "Variables &amp; types" },
  ],
  cm: [
    { id: "20", name: "Notes", module: "page", url: `${SITE}mod/page/view.php?id=20`, visible: true, sectionid: "10" },
    { id: "21", name: "Exercise &#039;1&#039;", module: "assign", url: `${SITE}mod/assign/view.php?id=21`, visible: true, sectionid: "11" },
    { id: "22", name: "Draft task", module: "assign", url: `${SITE}mod/assign/view.php?id=22`, visible: false, sectionid: "10" },
  ],
};

describe("assignmentsOf", () => {
  it("keeps the assignments, with their sections, in the course's order", () => {
    assert.deepEqual(assignmentsOf(STATE), [
      { id: 21, name: "Exercise '1'", url: `${SITE}mod/assign/view.php?id=21`, visible: true, section: { number: 1, title: "Variables & types" } },
      { id: 22, name: "Draft task", url: `${SITE}mod/assign/view.php?id=22`, visible: false, section: { number: 0, title: "General" } },
    ]);
  });
});

describe("list_assignments", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("asks for the course's state and lists its assignments", async () => {
    const state: FakeMoodleState = {
      user: { id: 3, fullName: "T" },
      serviceCalls: [],
      services: { core_courseformat_get_state: ({ courseid }) => (courseid === 5 ? JSON.stringify(STATE) : undefined) },
    };
    const { client, context } = await connect(state);
    const result = await client.callTool({ name: "list_assignments", arguments: { courseId: 5 } });
    const { assignments } = result.structuredContent as { assignments: { id: number }[] };
    assert.deepEqual(assignments.map((a) => a.id), [21, 22]);
    assert.deepEqual(state.serviceCalls?.[0], { methodname: "core_courseformat_get_state", args: { courseid: 5 } });
    const tool = (await client.listTools()).tools.find((t) => t.name === "list_assignments");
    assert.equal(tool?.annotations?.readOnlyHint, true);
    await context.close();
  });
});
