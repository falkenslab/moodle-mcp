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

// Shaped like Moodle 5.2's answer; the data is made up.
/** A course as `core_course_get_enrolled_courses_by_timeline_classification` returns it (Moodle 5.2). */
interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  coursecategory?: string;
  viewurl: string;
  visible: boolean;
  startdate?: number;
  enddate?: number;
  progress?: number | null;
  hasprogress?: boolean;
  timeaccess?: number | null;
}

const RAW: MoodleCourse[] = [
  {
    id: 7,
    shortname: "PRG &amp; DB",
    fullname: "Programming &#039;101&#039; &amp; databases",
    coursecategory: "Computing &gt; First year",
    viewurl: `${SITE}course/view.php?id=7`,
    visible: false,
    startdate: 1_790_000_000,
    enddate: 0,
    progress: 40,
    hasprogress: true,
    timeaccess: 1_791_000_000,
  },
  { id: 2, shortname: "sandbox", fullname: "Sandbox", viewurl: `${SITE}course/view.php?id=2`, visible: true, startdate: 0, progress: null, hasprogress: false, timeaccess: null },
];


describe("list_courses", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const manager = fakeBrowserManager({ context: async () => context, openChannel: () => "msedge" });
    const config = testConfig({ moodleUrl: SITE });
    const server = createServer({ config, browser: manager });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  const services = { core_course_get_enrolled_courses_by_timeline_classification: () => ({ courses: RAW, nextoffset: 2 }) };

  it("lists the courses, including those hidden from the dashboard by default", async () => {
    const state: FakeMoodleState = { user: { id: 3, fullName: "T" }, services, serviceCalls: [] };
    const { client, context } = await connect(state);
    const result = await client.callTool({ name: "list_courses", arguments: {} });
    const { courses } = result.structuredContent as { courses: { id: number; fullname: string }[] };
    assert.deepEqual(courses.map((c) => c.id), [7, 2]);
    assert.equal(state.serviceCalls?.[0]?.args.classification, "allincludinghidden");
    await client.callTool({ name: "list_courses", arguments: { classification: "past" } });
    assert.equal(state.serviceCalls?.[1]?.args.classification, "past");
    await context.close();
  });

  it("reports a missing session as an error naming login", async () => {
    const { client, context } = await connect({ services });
    const result = await client.callTool({ name: "list_courses", arguments: {} });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /login tool/);
    await context.close();
  });

  it("is read-only", async () => {
    const { client, context } = await connect({});
    const tool = (await client.listTools()).tools.find((t) => t.name === "list_courses");
    assert.equal(tool?.annotations?.readOnlyHint, true);
    await context.close();
  });
});
