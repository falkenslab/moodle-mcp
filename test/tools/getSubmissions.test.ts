import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { PANEL } from "@falkenslab/moodle-driver/testing";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

const DUE = 1_800_000_000;

// A made-up assignment: instance 12 in context 345, two participants, one of them submitted.
function moodle(cmid: number): FakeMoodleState {
  return {
    user: { id: 3, fullName: "Teacher" },
    serviceCalls: [],
    // Each site and course module gets its own grader page: the ids are cached per process.
    bodies: { "/mod/assign/view.php": `<div data-assignmentid="${cmid * 10}" data-contextid="${cmid * 100}"></div>` },
    services: {
      mod_assign_list_participants: () => [
        { id: 7, fullname: "Ada Lovelace", submitted: true, requiregrading: true, grantedextension: false, submissionstatus: "submitted" },
        { id: 8, fullname: "Alan Turing", submitted: false, requiregrading: false, grantedextension: true, submissionstatus: "" },
      ],
      mod_assign_get_participant: () => ({ allowsubmissionsfromdate: 0, duedate: DUE, cutoffdate: 0 }),
      core_get_fragment: () => ({ html: PANEL, javascript: "" }),
    },
  };
}

describe("get_submissions", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("lists every participant, with the content of those who submitted", async () => {
    const state = moodle(21);
    const { client, context } = await connect(state);
    const result = await client.callTool({ name: "get_submissions", arguments: { assignmentId: 21 } });
    const output = result.structuredContent as { assignment: unknown; submissions: Record<string, unknown>[] };
    assert.deepEqual(output.assignment, { id: 21, instanceId: 210 });
    assert.equal(output.submissions.length, 2);
    const [ada, alan] = output.submissions;
    assert.equal(ada?.status, "submitted");
    assert.equal(ada?.needsGrading, true);
    assert.equal(ada?.dueDate, new Date(DUE * 1000).toISOString());
    assert.equal((ada?.content as { plugin: string }[]).map((c) => c.plugin).join(), "onlinetext,file,onlinetext");
    assert.equal(alan?.status, "none");
    assert.equal(alan?.extensionGranted, true);
    assert.equal(alan?.content, undefined);
    const fragment = state.serviceCalls?.find((call) => call.methodname === "core_get_fragment");
    assert.equal(fragment?.args.contextid, 2100);
    assert.equal(state.serviceCalls?.find((call) => call.methodname === "mod_assign_list_participants")?.args.assignid, 210);
    await context.close();
  });

  it("leaves the content out when asked, without loading it", async () => {
    const state = moodle(22);
    const { client, context } = await connect(state);
    const result = await client.callTool({ name: "get_submissions", arguments: { assignmentId: 22, includeContent: false } });
    const { submissions } = result.structuredContent as { submissions: { content?: unknown }[] };
    assert.ok(submissions.every((s) => s.content === undefined));
    assert.equal(state.serviceCalls?.some((call) => call.methodname === "core_get_fragment"), false);
    await context.close();
  });

  it("explains an id that isn't an assignment", async () => {
    const state = { ...moodle(23), bodies: {} };
    const { client, context } = await connect(state);
    const result = await client.callTool({ name: "get_submissions", arguments: { assignmentId: 23 } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /isn't an assignment/);
    const tool = (await client.listTools()).tools.find((t) => t.name === "get_submissions");
    assert.equal(tool?.annotations?.readOnlyHint, true);
    await context.close();
  });
});
