import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { CONFIRMED } from "../../src/tools/confirm.js";
import { requiredScopes } from "../../src/tools/scopes.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

// Never a browser here: every call below is refused before Moodle. What Moodle does with them was
// checked on the sandbox: the driver's fake Moodle has none of these plugins.
async function connect(config: Config): Promise<Client> {
  const server = createServer({ config, browser: fakeBrowserManager() });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}
const text = (result: Record<string, unknown>) => JSON.stringify(result.content);
const site = "http://moodle.test/";

const READS = ["get_workshop_assessment_form", "list_attendance_sessions", "get_session_attendance", "get_attendance_report", "get_board_columns", "get_questionnaire_questions"];
const DESTRUCTIVE = ["set_workshop_assessment_form", "delete_attendance_session", "set_board_columns", "remove_board_column", "create_offline_quiz_forms"];
const WRITES = ["add_attendance_sessions", "edit_attendance_session", "take_attendance", "add_board_column", "edit_board_column", "add_questionnaire_questions", "add_questions_to_offline_quiz", "get_offline_quiz_groups"];

describe("the tools of moodle-driver 0.17", () => {
  it("declare what they do, and ask before what can't be undone", async () => {
    const tools = new Map((await (await connect(testConfig({ moodleUrl: site }))).listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of READS) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    for (const name of DESTRUCTIVE) assert.equal(tools.get(name)?.destructiveHint, true, name);
    // Opening an offline quiz's groups makes the groups it's set to have: not read only (ADR-020).
    for (const name of WRITES) assert.equal(tools.get(name)?.readOnlyHint, false, name);
    assert.ok(CONFIRMED.delete_attendance_session && CONFIRMED.create_offline_quiz_forms);
    for (const [name, flag] of [["remove_board_column", "deleteNotes"], ["set_board_columns", "deleteNotes"], ["set_workshop_assessment_form", "evenIfAssessed"], ["add_questionnaire_questions", "evenWithResponses"]] as const) {
      assert.equal(CONFIRMED[name]!.when!({}), false, name);
      assert.equal(CONFIRMED[name]!.when!({ [flag]: true }), true, name);
    }
  });

  it("put each tool in the scope of the data it touches, for teachers only", async () => {
    const scopes = (tool: string) => [...requiredScopes(tool)].sort();
    for (const tool of ["get_workshop_assessment_form", "set_workshop_assessment_form", "list_attendance_sessions", "add_attendance_sessions", "get_board_columns", "add_board_column", "get_questionnaire_questions", "add_questions_to_offline_quiz", "create_offline_quiz_forms"])
      assert.deepEqual(scopes(tool), ["content"], tool);
    assert.deepEqual(scopes("get_session_attendance"), ["student-data"]);
    assert.deepEqual(scopes("get_attendance_report"), ["student-data"]);
    assert.deepEqual(scopes("take_attendance"), ["grading", "student-data"]);
    assert.deepEqual(scopes("remove_board_column"), ["content", "grading"]);
    const student = (await (await connect(testConfig({ moodleUrl: site, role: "student" }))).listTools()).tools.map((t) => t.name);
    for (const name of [...READS, ...DESTRUCTIVE, ...WRITES]) assert.ok(!student.includes(name), name);
    const blocked = (await (await connect(testConfig({ moodleUrl: site, studentData: "block" }))).listTools()).tools.map((t) => t.name);
    assert.ok(!blocked.includes("get_attendance_report") && !blocked.includes("take_attendance") && blocked.includes("list_attendance_sessions"));
  });

  it("check what the agent gives before Moodle", async () => {
    const client = await connect(testConfig({ moodleUrl: site }));
    const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }));
    assert.match(await call("add_attendance_sessions", { attendanceId: 9, start: "2026-11-16T10:00:00+01:00", durationMinutes: 60, repeatOn: ["Mon"] }), /repeatOn and repeatUntil together/);
    assert.match(await call("add_attendance_sessions", { attendanceId: 9, start: "2026-11-16 10:00", durationMinutes: 60 }), /ISO 8601, with its offset/);
    assert.match(await call("add_attendance_sessions", { attendanceId: 9, start: "2026-11-16T10:00:00", durationMinutes: 60 }), /ISO 8601, with its offset/);
    assert.match(await call("add_attendance_sessions", { attendanceId: 9, start: "2026-11-16T10:00:00Z", durationMinutes: 60, repeatOn: ["Mon"], repeatUntil: "16/12/2026" }), /YYYY-MM-DD/);
    assert.match(await call("edit_attendance_session", { attendanceId: 9, sessionId: 4 }), /Give a new start/);
    assert.match(await call("edit_board_column", { boardId: 9, columnId: 4 }), /Give a new name, locked, or both/);
    assert.match(await call("take_attendance", { attendanceId: 9, sessionId: 4, marks: [{ user: "A-7KQ2XM", status: "P" }] }), /Give the participant as userId/);
  });
});
