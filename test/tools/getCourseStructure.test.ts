import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { readActivityDetails, type CourseState } from "@falkenslab/moodle-driver";
import { structureOf } from "../../src/tools/getCourseStructure.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Shaped like Moodle 5.2's course state for a student; the data is made up.
const STATE: CourseState = {
  course: { id: "5", baseurl: `${SITE}course/view.php?id=5` },
  section: [
    { id: "10", number: 0, title: "General", visible: true, hasrestrictions: false, cmlist: ["20", "21"], sectionurl: `${SITE}course/section.php?id=10` },
    { id: "11", number: 1, title: "Unit 1 &amp; 2", visible: true, hasrestrictions: true, cmlist: ["22"] },
    { id: "12", number: 2, title: "Practice", visible: true, component: "mod_subsection", parentsectionid: "11", cmlist: [] },
  ],
  cm: [
    { id: "20", name: "Welcome", module: "page", url: `${SITE}mod/page/view.php?id=20`, visible: true, uservisible: true, accessvisible: true, sectionid: "10", istrackeduser: true, completionstate: 1, isoverallcomplete: true },
    { id: "21", name: "Quiz 1", module: "quiz", visible: true, uservisible: true, accessvisible: true, sectionid: "10", istrackeduser: true, completionstate: 3, isoverallcomplete: false },
    { id: "22", name: "Locked task", module: "assign", visible: true, uservisible: false, accessvisible: true, hascmrestrictions: true, sectionid: "11", istrackeduser: true, completionstate: 0 },
  ],
};

// The course page shows section 0's activities; section 1 has its own page.
const COURSE_PAGE = `<ul><li class="activity" data-for="cmitem" data-id="20"></li>
<li class="activity" data-for="cmitem" data-id="21"><div data-region="activity-dates"><div class="date-item"><span class="date-item-label">Opened:</span> Monday, 5 October</div><div class="date-item"><span class="date-item-label">Closes:</span> Friday, 9 October</div></div></li></ul>`;
const SECTION_PAGE = `<ul><li class="activity" data-for="cmitem" data-id="22"><div class="availabilityinfo">Not available unless: You achieve a pass in <a href="#">Quiz 1</a></div></li></ul>`;

describe("structureOf", () => {
  it("nests activities in their sections, with completion, availability and subsections", () => {
    const [general, unit, practice] = structureOf(STATE);
    assert.deepEqual(general?.activities.map((a) => [a.id, a.completion]), [
      [20, { state: "complete", complete: true }],
      [21, { state: "complete-fail", complete: false }],
    ]);
    assert.equal(unit?.title, "Unit 1 & 2");
    assert.equal(unit?.restricted, true);
    assert.deepEqual(unit?.activities[0] && { availableToMe: unit.activities[0].availableToMe, restricted: unit.activities[0].restricted, completion: unit.activities[0].completion }, {
      availableToMe: false,
      restricted: true,
      completion: { state: "incomplete", complete: false },
    });
    assert.equal(practice?.parentSectionId, 11);
  });
});

describe("readActivityDetails", { skip: !browser && "no system browser" }, () => {
  it("reads dates and restrictions as the page shows them", async () => {
    const page = await browser!.newPage();
    await page.setContent(COURSE_PAGE + SECTION_PAGE);
    assert.deepEqual(await readActivityDetails(page), [
      { id: 20, dates: [], restriction: undefined },
      { id: 21, dates: [{ label: "Opened", value: "Monday, 5 October" }, { label: "Closes", value: "Friday, 9 October" }], restriction: undefined },
      { id: 22, dates: [], restriction: "Not available unless: You achieve a pass in Quiz 1" },
    ]);
    await page.close();
  });
});

describe("get_course_structure", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("reads the state, and the course and section pages only with details", async () => {
    const state: FakeMoodleState = {
      user: { id: 3, fullName: "T" },
      pagesServed: [],
      bodies: { "/course/view.php": COURSE_PAGE, "/course/section.php": SECTION_PAGE },
      services: { core_courseformat_get_state: () => JSON.stringify(STATE) },
    };
    const { client, context } = await connect(state);
    await client.callTool({ name: "get_course_structure", arguments: { courseId: 5 } });
    const pagesBefore = state.pagesServed!.filter((p) => p.startsWith("/course/")).length;
    assert.equal(pagesBefore, 0);
    const result = await client.callTool({ name: "get_course_structure", arguments: { courseId: 5, details: true } });
    const { sections } = result.structuredContent as { sections: { activities: { id: number; dates?: unknown; restriction?: string }[] }[] };
    assert.equal(sections[0]?.activities[1]?.dates !== undefined, true);
    assert.match(sections[1]?.activities[0]?.restriction ?? "", /Not available unless/);
    assert.deepEqual(state.pagesServed!.filter((p) => p.startsWith("/course/")), ["/course/view.php", "/course/section.php"]);
    const tool = (await client.listTools()).tools.find((t) => t.name === "get_course_structure");
    assert.equal(tool?.annotations?.readOnlyHint, true);
    await context.close();
  });
});
