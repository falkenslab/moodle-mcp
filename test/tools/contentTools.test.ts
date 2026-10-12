import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Route } from "playwright-core";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

async function connect(context?: BrowserContext): Promise<Client> {
  const manager = context ? fakeBrowserManager({ context: async () => context }) : fakeBrowserManager();
  const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: manager });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const call = async (client: Client, name: string, args: Record<string, unknown>) => {
  const result = await client.callTool({ name, arguments: args });
  return { error: result.isError ? JSON.stringify(result.content) : undefined, out: result.structuredContent as Record<string, unknown> };
};

const READS = ["get_activity_settings", "list_question_banks", "list_questions", "get_quiz_structure", "get_rubric", "list_events", "get_gradebook_setup"];
const WRITES: Record<string, { destructive: boolean; idempotent: boolean }> = {
  update_course: { destructive: false, idempotent: true },
  import_questions: { destructive: false, idempotent: false },
  create_question: { destructive: false, idempotent: false },
  add_questions_to_quiz: { destructive: false, idempotent: false },
  create_event: { destructive: false, idempotent: false },
  delete_event: { destructive: true, idempotent: true },
  update_grade_item: { destructive: false, idempotent: true },
  add_grade_category: { destructive: false, idempotent: false },
};

describe("content tools", () => {
  it("declare what they do: reads read-only, writes with their kind", async () => {
    const tools = new Map((await (await connect()).listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of READS) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    for (const [name, kind] of Object.entries(WRITES)) {
      assert.deepEqual([tools.get(name)?.readOnlyHint, tools.get(name)?.destructiveHint, tools.get(name)?.idempotentHint], [false, kind.destructive, kind.idempotent], name);
    }
  });

  it("refuse inputs that can't work before opening Moodle", async () => {
    const client = await connect();
    assert.match((await call(client, "import_questions", { bankId: 5, format: "gift" })).error ?? "", /either as text or as a file/);
    assert.match((await call(client, "import_questions", { bankId: 5, format: "gift", text: "::Q:: x {T}", file: "/tmp/q.gift" })).error ?? "", /either as text or as a file/);
    assert.match((await call(client, "add_questions_to_quiz", { quizId: 4 })).error ?? "", /Give questionIds, random, or both/);
    assert.match((await call(client, "create_event", { courseId: 3, name: "Tutorial", start: "next Tuesday" })).error ?? "", /isn't an ISO 8601/);
  });
});

describe("content tools against the fake Moodle", { skip: !browser && "no system browser" }, () => {
  it("create, list and delete a course event", async () => {
    const events: Record<string, unknown>[] = [];
    const state: FakeMoodleState = {
      user: { id: 3, fullName: "Teacher" },
      services: {
        core_get_fragment: () => ({
          html: `<form class="mform"><input type="hidden" name="sesskey" value="s1"><input name="name"><select name="eventtype"><option value="course">course</option></select><select name="courseid"><option value="3">C</option></select><input type="radio" name="duration" value="0" checked><input type="radio" name="duration" value="2"><input name="timedurationminutes"><textarea name="description[text]"></textarea></form>`,
          javascript: "",
        }),
        core_calendar_submit_create_update_form: ({ formdata }) => {
          const data = new URLSearchParams(String(formdata));
          const event = { id: 12, name: data.get("name"), eventtype: "course", timestart: 1_792_000_000, timeduration: 2700, course: { id: 3 } };
          events.push(event);
          return { event, validationerror: false };
        },
        core_calendar_get_calendar_upcoming_view: () => ({ events }),
        core_calendar_delete_calendar_events: () => {
          events.length = 0;
          return null;
        },
      },
    };
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const client = await connect(context);
    const created = await call(client, "create_event", { courseId: 3, name: "Tutorial", start: "2026-10-14T10:00:00Z", durationMinutes: 45 });
    assert.equal(created.error, undefined, created.error);
    assert.deepEqual(created.out.event, { id: 12, name: "Tutorial", type: "course", start: new Date(1_792_000_000_000).toISOString(), durationMinutes: 45, courseId: 3 });
    assert.deepEqual(((await call(client, "list_events", { courseId: 3 })).out.events as { id: number }[]).map((e) => e.id), [12]);
    assert.equal((await call(client, "delete_event", { eventId: 12 })).error, undefined);
    assert.deepEqual((await call(client, "list_events", {})).out.events, []);
    await context.close();
  });

  it("read a quiz's structure and add bank questions to it", async () => {
    const slots = [{ id: 20, type: "truefalse", question: 21, name: "Range" }];
    const page = () =>
      `<ul>${slots
        .map(
          (s, i) =>
            `<li class="page" id="page-${i + 1}"><span class="add-menu-outer"><span>Add</span></span></li><li class="activity qtype_${s.type} slot" id="slot-${s.id}"><span class="slotnumber unshuffled"><span class="accesshide">Question</span> ${i + 1}</span><a href="${SITE}question/bank/editquestion/question.php?cmid=41&amp;id=${s.question}"><span class="instancename"><span class="questionname">${s.name}</span></span></a><span class="instancemaxmark">1.00</span></li>`,
        )
        .join("")}</ul>`;
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 3, fullName: "Teacher" } });
    await context.route(`${SITE}mod/quiz/edit.php**`, (route: Route) => {
      const form = new URLSearchParams(route.request().postData() ?? "");
      for (const [key] of form) if (/^q\d+$/.test(key)) slots.push({ id: 30 + slots.length, type: "multichoice", question: Number(key.slice(1)), name: `Question ${key.slice(1)}` });
      return route.fulfill({ status: 200, contentType: "text/html", body: moodlePage({ userId: 3, bodyId: "page-mod-quiz-edit", body: page() }) });
    });
    const client = await connect(context);
    const read = await call(client, "get_quiz_structure", { quizId: 41 });
    assert.deepEqual(read.out, { quiz: { id: 41 }, slots: [{ id: 20, slot: 1, number: 1, page: 1, questionId: 21, type: "truefalse", name: "Range", mark: "1.00" }], sections: [] });
    const added = await call(client, "add_questions_to_quiz", { quizId: 41, questionIds: [22] });
    assert.equal(added.error, undefined, added.error);
    assert.deepEqual((added.out.slots as { questionId?: number }[]).map((s) => s.questionId), [21, 22]);
    await context.close();
  });

  it("read the gradebook setup", async () => {
    const row = (attrs: string, name: string, weight: string, icon = "core") => `<tr ${attrs}><td><img class="itemicon" src="${SITE}theme/image.php/boost/${icon}/1/monologo"><div class="rowtitle">${name}</div></td><td>${weight}</td></tr>`;
    const setup = `<table id="grade_edit_tree_table"><tbody>${row(`data-category="cg2" data-aggregation="13" data-grademax="15" data-itemid="4"`, "Course 3", "")}${row(`class="item" data-itemid="12" data-parent-category="cg2" data-grademax="10"`, "Quiz one", `<input type="checkbox" name="weightoverride_12" value="1"><input type="text" name="weight_12" value="50">`, "quiz")}${row(`class="item" data-itemid="4" data-grademax="15"`, "Course total", "")}</tbody></table>`;
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 3, fullName: "Teacher" } });
    await context.route(`${SITE}grade/edit/tree/index.php**`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: moodlePage({ userId: 3, bodyId: "page-grade-edit-tree-index", body: setup }) }));
    const client = await connect(context);
    const read = await call(client, "get_gradebook_setup", { courseId: 3 });
    assert.equal(read.error, undefined, read.error);
    assert.deepEqual(read.out, {
      categories: [{ id: 2, itemId: 4, name: "Course 3", aggregation: "natural", maxGrade: 15 }],
      items: [{ id: 12, name: "Quiz one", categoryId: 2, type: "quiz", maxGrade: 10, weight: 50, weightOverridden: false }],
    });
    await context.close();
  });
});
