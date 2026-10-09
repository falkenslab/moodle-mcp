import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import type { CourseState } from "../../src/moodle/course.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, ServiceFailure, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

/**
 * A tiny course editor: a made-up course 5 whose state changes as Moodle's would for the actions
 * the tools send, so each test checks both the calls and the structure they return.
 */
function fakeCourse(): { state: FakeMoodleState; renames: unknown[] } {
  const course: CourseState = {
    section: [
      { id: "10", number: 0, title: "General", visible: true, cmlist: ["20"] },
      { id: "11", number: 1, title: "Unit 1", visible: true, cmlist: ["21", "22"] },
    ],
    cm: [
      { id: "20", name: "News", module: "forum", visible: true, sectionid: "10" },
      { id: "21", name: "Notes", module: "page", visible: true, sectionid: "11" },
      { id: "22", name: "Task", module: "assign", visible: true, sectionid: "11" },
    ],
  };
  let nextId = 30;
  const renames: unknown[] = [];
  const sectionOf = (cmid: string) => course.section.find((s) => s.cmlist!.includes(cmid))!;
  const renumber = () => course.section.forEach((s, i) => (s.number = i));
  const state: FakeMoodleState = {
    user: { id: 3, fullName: "Teacher" },
    serviceCalls: [],
    bodyClasses: { "/course/view.php": "format-topics path-course" },
    services: {
      core_courseformat_get_state: () => JSON.stringify(course),
      core_update_inplace_editable: (args) => {
        renames.push(args);
        if (args.itemtype === "activityname") course.cm.find((cm) => cm.id === String(args.itemid))!.name = String(args.value);
        else course.section.find((s) => s.id === String(args.itemid))!.title = String(args.value);
        return { value: args.value };
      },
      core_courseformat_update_course: ({ action, ids, targetsectionid, targetcmid }) => {
        const [id] = (ids as number[]).map(String);
        const cm = course.cm.find((c) => c.id === id);
        const section = course.section.find((s) => s.id === id);
        switch (action) {
          case "cm_hide":
            cm!.visible = false;
            break;
          case "cm_show":
            cm!.visible = true;
            break;
          case "cm_move": {
            const from = sectionOf(id!);
            from.cmlist = from.cmlist!.filter((c) => c !== id);
            const to = targetcmid ? sectionOf(String(targetcmid)) : course.section.find((s) => s.id === String(targetsectionid))!;
            const at = targetcmid ? to.cmlist!.indexOf(String(targetcmid)) : to.cmlist!.length;
            to.cmlist!.splice(at, 0, id!);
            cm!.sectionid = to.id;
            break;
          }
          case "cm_duplicate": {
            const copy = { ...cm!, id: String(nextId++), name: `${cm!.name} (copy)` };
            course.cm.push(copy);
            const list = sectionOf(id!).cmlist!;
            list.splice(list.indexOf(id!) + 1, 0, copy.id);
            break;
          }
          case "cm_delete":
            sectionOf(id!).cmlist = sectionOf(id!).cmlist!.filter((c) => c !== id);
            course.cm = course.cm.filter((c) => c.id !== id);
            break;
          case "section_add": {
            const at = targetsectionid ? course.section.findIndex((s) => s.id === String(targetsectionid)) + 1 : course.section.length;
            course.section.splice(at, 0, { id: String(nextId++), number: 0, title: "New section", visible: true, cmlist: [] });
            renumber();
            break;
          }
          case "section_hide":
            section!.visible = false;
            break;
          case "section_move_after": {
            course.section = course.section.filter((s) => s.id !== id);
            course.section.splice(course.section.findIndex((s) => s.id === String(targetsectionid)) + 1, 0, section!);
            renumber();
            break;
          }
          case "section_delete":
            course.cm = course.cm.filter((c) => !section!.cmlist!.includes(c.id));
            course.section = course.section.filter((s) => s.id !== id);
            renumber();
            break;
          default:
            throw new ServiceFailure("invalidaction");
        }
        return "[]";
      },
    },
  };
  return { state, renames };
}

describe("course layout tools", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  type Result = { changed: string; newId?: number; sections: { id: number; title: string; visible: boolean; activities: { id: number; name: string; visible: boolean }[] }[] };
  async function call(client: Client, name: string, args: Record<string, unknown>): Promise<Result> {
    const result = await client.callTool({ name, arguments: { courseId: 5, ...args } });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    return result.structuredContent as Result;
  }
  const layout = (r: Result) => r.sections.map((s) => `${s.title}${s.visible ? "" : "(h)"}:${s.activities.map((a) => `${a.name}${a.visible ? "" : "(h)"}`).join(",")}`).join(" | ");

  it("renames, hides and moves an activity, and returns the new structure", async () => {
    const { state, renames } = fakeCourse();
    const { client, context } = await connect(state);
    const result = await call(client, "edit_activity", { activityId: 22, name: "Essay", visibility: "hidden", beforeActivityId: 21 });
    assert.equal(layout(result), "General:News | Unit 1:Essay(h),Notes");
    assert.deepEqual(renames, [{ component: "core_course", itemtype: "activityname", itemid: 22, value: "Essay" }]);
    assert.match(result.changed, /renamed to "Essay", made hidden, moved before activity 21/);
    await context.close();
  });

  it("duplicates an activity and gives the copy's id", async () => {
    const { client, context } = await connect(fakeCourse().state);
    const result = await call(client, "duplicate_activity", { activityId: 21 });
    assert.equal(result.newId, 30);
    assert.equal(layout(result), "General:News | Unit 1:Notes,Notes (copy),Task");
    await context.close();
  });

  it("adds a named section after another, renaming it through the course format", async () => {
    const { state, renames } = fakeCourse();
    const { client, context } = await connect(state);
    const result = await call(client, "add_section", { name: "Unit 0", afterSectionId: 10 });
    assert.equal(result.newId, 30);
    assert.equal(layout(result), "General:News | Unit 0: | Unit 1:Notes,Task");
    assert.deepEqual(renames, [{ component: "format_topics", itemtype: "sectionname", itemid: 30, value: "Unit 0" }]);
    await context.close();
  });

  it("hides and moves a section, deletes an activity and a section with its activities", async () => {
    const { client, context } = await connect(fakeCourse().state);
    assert.equal(layout(await call(client, "edit_section", { sectionId: 11, visible: false, afterSectionId: 10 })), "General:News | Unit 1(h):Notes,Task");
    assert.equal(layout(await call(client, "delete_activity", { activityId: 21 })), "General:News | Unit 1(h):Task");
    assert.equal(layout(await call(client, "delete_section", { sectionId: 11 })), "General:News");
    await context.close();
  });

  it("annotates deletes as destructive and edits as idempotent", async () => {
    const { client, context } = await connect(fakeCourse().state);
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of ["delete_activity", "delete_section"]) assert.equal(tools.get(name)?.destructiveHint, true);
    for (const name of ["edit_activity", "edit_section"]) {
      assert.equal(tools.get(name)?.destructiveHint, false);
      assert.equal(tools.get(name)?.idempotentHint, true);
    }
    for (const name of ["duplicate_activity", "add_section"]) assert.equal(tools.get(name)?.idempotentHint, false);
    await context.close();
  });
});
