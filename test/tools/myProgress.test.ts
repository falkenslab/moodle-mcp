import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import type { CourseState } from "@falkenslab/moodle-driver";
import { readGradeRows } from "@falkenslab/moodle-driver";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

/** A grade report row as Moodle 5.2 renders it, reduced; the data is made up. */
function item(cmid: number, type: string, name: string, grade: string, range: string, feedback = ""): string {
  const menu = `<div class="action-menu moodle-actionmenu"><a aria-label="Actions"><span class="visually-hidden">Actions</span></a><div class="dropdown-menu"><a>Grade analysis</a></div></div>`;
  return `<tr class="cat_1"><th class="level2 item column-itemname" scope="row"><span class="d-block">${type.toUpperCase()}</span><div class="rowtitle"><a class="gradeitemheader" href="${SITE}mod/${type}/view.php?id=${cmid}">${name}</a></div></th>
<td class="level2 item column-weight">-</td><td class="level2 item column-grade"><div><div>${grade}</div>${menu}</div></td><td class="level2 item column-range">${range}</td>
<td class="level2 item column-percentage">${grade === "-" ? "-" : "80.00 %"}</td><td class="level2 item column-feedback">${feedback}</td></tr>`;
}

const REPORT = `<table class="user-grade"><thead><tr><th class="column-itemname" scope="col">Grade item</th><th class="column-grade">Grade</th></tr></thead><tbody>
<tr><td class="level1 category column-itemname">Programming</td></tr>
${item(21, "quiz", "Quiz 1", "8.00", "0–10", "<p>Well done</p>")}
${item(22, "assign", "Task 1", "-", "0–10")}
${item(23, "assign", "Task 2", "-", "0–10")}
<tr class="cat_1 lastrow"><th class="level1 baggt column-itemname">Course total</th><td class="level1 baggt item column-grade"><div>8.00</div></td><td class="level1 baggt item column-range">0–30</td></tr>
</tbody></table>`;

describe("readGradeRows", { skip: !browser && "no system browser" }, () => {
  it("reads items, categories and the total by cell classes, without the action menus", async () => {
    const page = await browser!.newPage();
    await page.setContent(REPORT);
    const rows = await readGradeRows(page);
    assert.deepEqual(
      rows.map((r) => [r.kind, r.name, r.activityId, r.grade, r.range, r.feedback]),
      [
        ["category", "Programming", undefined, undefined, undefined, undefined],
        ["item", "Quiz 1", 21, "8.00", "0–10", "Well done"],
        ["item", "Task 1", 22, undefined, "0–10", undefined],
        ["item", "Task 2", 23, undefined, "0–10", undefined],
        ["courseTotal", "Course total", undefined, "8.00", "0–30", undefined],
      ],
    );
    assert.equal(rows[1]?.activityType, "quiz");
    await page.close();
  });
});

describe("get_my_grades and list_pending", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  // The quiz is graded; task 1 is tracked and incomplete; task 2 is done; the page isn't graded nor tracked.
  const STATE: CourseState = {
    section: [{ id: "10", number: 0, title: "General", cmlist: ["20", "21", "22", "23"] }],
    cm: [
      { id: "20", name: "Notes", module: "page", visible: true, sectionid: "10" },
      { id: "21", name: "Quiz 1", module: "quiz", visible: true, sectionid: "10" },
      { id: "22", name: "Task 1", module: "assign", visible: true, sectionid: "10", istrackeduser: true, completionstate: 0, isoverallcomplete: false },
      { id: "23", name: "Task 2", module: "assign", visible: true, sectionid: "10", istrackeduser: true, completionstate: 1, isoverallcomplete: true },
    ],
  };
  const COURSE_PAGE = `<ul><li class="activity" data-for="cmitem" data-id="22"><div data-region="activity-dates"><div class="date-item"><span class="date-item-label">Due:</span> Friday</div></div></li></ul>`;
  const state = (): FakeMoodleState => ({
    user: { id: 3, fullName: "S" },
    bodies: { "/grade/report/user/index.php": REPORT, "/course/view.php": COURSE_PAGE },
    services: { core_courseformat_get_state: () => JSON.stringify(STATE) },
  });

  it("returns the grade report", async () => {
    const { client, context } = await connect(state());
    const result = await client.callTool({ name: "get_my_grades", arguments: { courseId: 5 } });
    const { items } = result.structuredContent as { items: { kind: string }[] };
    assert.deepEqual(items.map((i) => i.kind), ["category", "item", "item", "item", "courseTotal"]);
    await context.close();
  });

  it("lists tracked activities not complete, and ungraded ones where completion isn't tracked", async () => {
    const { client, context } = await connect(state());
    const result = await client.callTool({ name: "list_pending", arguments: { courseId: 5 } });
    const output = JSON.parse(JSON.stringify(result.structuredContent)) as { completionTracked: boolean; pending: Record<string, unknown>[] };
    assert.equal(output.completionTracked, true);
    assert.deepEqual(
      output.pending.map((p) => [p.activityId, p.reason, p.completion]),
      [[22, "incomplete", "incomplete"]],
    );
    assert.deepEqual(output.pending[0]?.dates, [{ label: "Due", value: "Friday" }]);
    for (const name of ["get_my_grades", "list_pending"]) {
      const tool = (await client.listTools()).tools.find((t) => t.name === name);
      assert.equal(tool?.annotations?.readOnlyHint, true);
    }
    await context.close();
  });
});
