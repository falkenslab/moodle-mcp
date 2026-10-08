import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import type { BrowserManager } from "../../src/browser.js";
import { createServer } from "../../src/createServer.js";
import { toCourse, type MoodleCourse } from "../../src/tools/listCourses.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Shaped like Moodle 5.2's answer; the data is made up.
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

describe("toCourse", () => {
  it("decodes names, turns dates to ISO and leaves out what Moodle marks as none", () => {
    assert.deepEqual(toCourse(RAW[0]!), {
      id: 7,
      shortname: "PRG & DB",
      fullname: "Programming '101' & databases",
      category: "Computing > First year",
      url: `${SITE}course/view.php?id=7`,
      visible: false,
      startDate: new Date(1_790_000_000_000).toISOString(),
      endDate: undefined,
      progress: 40,
      lastAccess: new Date(1_791_000_000_000).toISOString(),
    });
    const plain = toCourse(RAW[1]!);
    assert.equal(plain.startDate, undefined);
    assert.equal(plain.progress, undefined);
    assert.equal(plain.lastAccess, undefined);
  });
});

describe("list_courses", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const manager: BrowserManager = {
      context: async () => context,
      openChannel: () => "msedge",
      saveSession: async () => undefined,
      close: async () => undefined,
    };
    const config = { moodleUrl: SITE, profileDir: "/profiles/moodle", channel: undefined, headless: true };
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
