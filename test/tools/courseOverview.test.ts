import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { overviewField } from "@falkenslab/moodle-driver";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Columns shaped like Moodle 5.2's overview items (made-up values).
const item = (key: string, contenttype: string, content: unknown, alert?: [string, number]) => ({
  key,
  name: key[0]!.toUpperCase() + key.slice(1),
  contenttype,
  alertlabel: alert?.[0] ?? "",
  alertcount: String(alert?.[1] ?? 0),
  contentjson: content === null ? null : JSON.stringify(content),
});
const NAME = (hidden = false) => item("name", "core_courseformat\\output\\local\\overview\\activityname", { activityname: "x", hidden, available: true });
const DUE = item("duedate", "core_calendar\\output\\humandate", { timestamp: 1_797_810_900, date: "Sunday, 20 December", time: "11:55 PM" });
const SUBMISSIONS = item("submissions", "basic", { value: 2, content: "<strong>2</strong> of 4" });
const ACTIONS = item("actions", "core_courseformat\\output\\local\\overview\\overviewaction", { content: "View", linkurl: `${SITE}mod/assign/view.php?id=18&action=grading` }, ["Needs grading", 2]);
const ATTEMPTS = item("totalattempts", "core_courseformat\\output\\local\\overview\\overviewdialog", { buttoncontent: "2", items: [{ label: "Allowed attempts per student", value: "3" }] });
const ANSWERED = item("responded", "core\\output\\pix_icon", { pix: "i/checkedcircle", extras: [{ name: "class", value: "text-success" }, { name: "alt", value: "Answered" }] });

describe("overviewField", () => {
  it("reads each kind of column", () => {
    assert.deepEqual(overviewField(DUE), { key: "duedate", label: "Duedate", text: "Sunday, 20 December 11:55 PM", date: "2026-12-20T23:55:00.000Z" });
    assert.equal(overviewField(SUBMISSIONS).text, "2 of 4");
    assert.deepEqual(overviewField(ACTIONS), { key: "actions", label: "Actions", text: "View", url: `${SITE}mod/assign/view.php?id=18&action=grading`, alert: { label: "Needs grading", count: 2 } });
    assert.deepEqual(overviewField(ATTEMPTS).details, [{ label: "Allowed attempts per student", value: "3" }]);
    assert.equal(overviewField(ANSWERED).text, "Answered");
    assert.equal(overviewField(item("odd", "something\\new", null)).text, "");
  });
});

describe("course overview tools", { skip: !browser && "no system browser" }, () => {
  const state = { cm: [{ id: "5", name: "Notes", module: "page", visible: true, sectionid: "1" }, { id: "18", name: "Essay", module: "assign", visible: false, sectionid: "1" }, { id: "6", name: "Book", module: "book", visible: true, sectionid: "1" }], section: [] };
  const overviews: Record<string, unknown[]> = {
    resource: [{ name: "Notes", modname: "page", cmid: 5, items: [NAME()] }, { name: "Book", modname: "book", cmid: 6, items: [NAME()] }],
    page: [{ name: "Notes", modname: "page", cmid: 5, items: [NAME()] }],
    assign: [{ name: "Essay &amp; more", modname: "assign", cmid: 18, url: `${SITE}mod/assign/view.php?id=18`, items: [NAME(true), DUE, SUBMISSIONS, ACTIONS] }],
  };
  const calls: string[] = [];
  const services: FakeMoodleState["services"] = {
    core_courseformat_get_state: () => JSON.stringify(state),
    core_courseformat_get_overview_information: (args) => {
      calls.push(String(args.modname));
      return { courseid: 3, activities: overviews[String(args.modname)] ?? [] };
    },
    core_calendar_get_action_events_by_timesort: () => ({
      events: [{ name: "Essay is due", activityname: "Essay", modulename: "assign", eventtype: "due", timesort: 1_797_810_900, overdue: false, url: `${SITE}mod/assign/view.php?id=18`, course: { id: 3, shortname: "PRG" }, action: { name: "Add submission", url: `${SITE}mod/assign/view.php?id=18&action=editsubmission`, itemcount: 1, actionable: true } }],
    }),
    core_course_get_updates_since: () => ({ instances: [{ contextlevel: "module", id: 18, updates: [{ name: "configuration", timeupdated: 1_791_545_479 }, { name: "submissions", itemids: [1, 2] }] }, { contextlevel: "course", id: 3, updates: [] }] }),
  };

  async function connect(): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 3, fullName: "T" }, services });
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }
  const out = async (client: Client, name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    return result.structuredContent as Record<string, unknown>;
  };

  it("overviews every type once, resources first, and skips types they already brought", async () => {
    const { client, context } = await connect();
    calls.length = 0;
    const { activities } = (await out(client, "get_activities_overview", { courseId: 3 })) as { activities: { id: number; name: string; visible: boolean; fields: { key: string; alert?: unknown }[] }[] };
    assert.deepEqual(calls, ["resource", "assign"]);
    assert.deepEqual(activities.map((a) => [a.id, a.name, a.visible]), [[5, "Notes", true], [6, "Book", true], [18, "Essay & more", false]]);
    assert.deepEqual(activities[2]?.fields.map((f) => f.key), ["duedate", "submissions", "actions"]);
    await context.close();
  });

  it("lists deadlines with their activity and action, and course updates with names", async () => {
    const { client, context } = await connect();
    const { deadlines } = (await out(client, "list_deadlines", {})) as { deadlines: Record<string, unknown>[] };
    assert.deepEqual(deadlines[0], {
      activityId: 18,
      activity: "Essay",
      type: "assign",
      event: "Essay is due",
      kind: "due",
      date: "2026-12-20T23:55:00.000Z",
      overdue: false,
      course: { id: 3, shortname: "PRG" },
      action: { name: "Add submission", actionable: true, count: 1, url: `${SITE}mod/assign/view.php?id=18&action=editsubmission` },
    });
    const updates = (await out(client, "get_course_updates", { courseId: 3, since: "2026-10-01T00:00:00Z" })) as { since: string; activities: unknown[] };
    assert.equal(updates.since, "2026-10-01T00:00:00.000Z");
    assert.deepEqual(updates.activities, [{ id: 18, name: "Essay", type: "assign", changes: [{ what: "configuration", time: "2026-10-09T11:31:19.000Z" }, { what: "submissions", items: 2 }] }]);
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of ["get_activities_overview", "list_deadlines", "get_course_updates"]) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    await context.close();
  });
});
