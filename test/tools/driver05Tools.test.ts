import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { fromCompletion, fromRestrictions, toCompletion, toRestrictions } from "../../src/tools/conditions.js";
import { requiredScopes } from "../../src/tools/scopes.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

// Never a browser here: every call below is refused, or answered, before Moodle.
async function connect(config: Config): Promise<Client> {
  const server = createServer({ config, browser: fakeBrowserManager() });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}
const text = (result: Record<string, unknown>) => JSON.stringify(result.content);

describe("the tools of moodle-driver 0.5", () => {
  it("declare what they do", async () => {
    const tools = new Map((await (await connect(testConfig({ moodleUrl: "http://moodle.test/" }))).listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of ["get_activity_report", "get_participation_report", "get_course_logs", "list_potential_users", "list_groupings", "list_enrolment_methods", "get_event", "get_forum_grades", "list_questions_to_grade", "get_workshop"]) {
      assert.equal(tools.get(name)?.readOnlyHint, true, name);
    }
    for (const name of ["reset_course", "restore_course", "unenrol_user", "delete_group", "delete_grouping", "delete_grade_category", "delete_grade_item", "delete_questions", "remove_quiz_slot", "delete_post"]) {
      assert.equal(tools.get(name)?.destructiveHint, true, name);
    }
  });

  it("put each tool in the scope of the data it touches", () => {
    const scopes = (tool: string) => [...requiredScopes(tool)].sort();
    // A course's copies are content: their users' data is checked by the tools themselves.
    for (const tool of ["copy_course", "backup_course", "restore_course", "import_activities", "create_group", "list_enrolment_methods", "get_activity_report"]) assert.deepEqual(scopes(tool), ["content"], tool);
    assert.deepEqual(scopes("set_grade"), ["grading", "student-data"]);
    assert.deepEqual(scopes("get_course_logs"), ["student-data"]);
    assert.deepEqual(scopes("message_participants"), ["communication", "student-data"]);
    assert.deepEqual(scopes("reset_course"), ["content", "grading"]);
  });

  it("keep people's data out of the content profile and of files under pseudonymize", async () => {
    const content = await connect(testConfig({ moodleUrl: "http://moodle.test/", scopes: ["content"] }));
    const names = (await content.listTools()).tools.map((t) => t.name);
    assert.ok(names.includes("backup_course") && names.includes("copy_course") && !names.includes("enrol_users") && !names.includes("get_course_logs"));
    const backup = await content.callTool({ name: "backup_course", arguments: { courseId: 3, destDir: "/tmp", withUsers: true } });
    assert.match(text(backup), /configured without students' data/);

    const pseudonymous = await connect(testConfig({ moodleUrl: "http://moodle.test/", studentData: "pseudonymize" }));
    assert.match(text(await pseudonymous.callTool({ name: "backup_course", arguments: { courseId: 3, destDir: "/tmp", withUsers: true } })), /back it up with anonymize/);
    assert.match(text(await pseudonymous.callTool({ name: "export_grades", arguments: { courseId: 3, format: "csv", destDir: "/tmp" } })), /names every participant/);
    assert.match(text(await pseudonymous.callTool({ name: "grade_quiz_question", arguments: { attemptId: 4, slot: 1, mark: 1, comment: "Well done A-8FT4A1" } })), /an alias/);
    assert.match(text(await pseudonymous.callTool({ name: "enrol_users", arguments: { courseId: 3, userIds: [7] } })), /give the participants as users/);
  });

  it("turn flat restrictions and completion into the driver's terms and back", () => {
    const restrictions = toRestrictions({ conditions: [{ type: "date", from: "2026-10-01T00:00:00Z" }, { type: "completion", activityId: 5, state: "complete" }, { type: "group", groupId: 1 }], match: "any", hidden: true });
    assert.deepEqual(restrictions, { conditions: [{ type: "date", from: new Date("2026-10-01T00:00:00Z") }, { type: "completion", activityId: 5, state: "complete" }, { type: "group", groupId: 1 }], match: "any", hidden: true });
    assert.deepEqual(fromRestrictions(restrictions).conditions[0], { type: "date", from: "2026-10-01T00:00:00.000Z" });
    assert.throws(() => toRestrictions({ conditions: [{ type: "grade" }] }), /needs activityId/);
    assert.equal(toCompletion({ tracking: "manual" }), "manual");
    assert.deepEqual(fromCompletion({ view: true, expected: new Date("2026-11-01T00:00:00Z") }), { tracking: "conditions", view: true, expected: "2026-11-01T00:00:00.000Z" });
  });
});
