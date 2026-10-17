import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { requiredScopes } from "../../src/tools/scopes.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

// Never a browser here: every call below is refused before Moodle.
async function connect(config: Config): Promise<Client> {
  const server = createServer({ config, browser: fakeBrowserManager() });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}
const text = (result: Record<string, unknown>) => JSON.stringify(result.content);

const READS = ["list_book_chapters", "get_lesson_pages", "get_database_fields", "get_database_templates", "list_database_presets", "list_badges", "get_workshop_allocation"];
const DESTRUCTIVE = ["set_rubric", "delete_book_chapter", "delete_lesson_page", "delete_database_field", "apply_database_preset", "remove_workshop_reviewer", "allocate_workshop_randomly"];

describe("the tools of moodle-driver 0.9", () => {
  it("declare what they do", async () => {
    const tools = new Map((await (await connect(testConfig({ moodleUrl: "http://moodle.test/" }))).listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of READS) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    for (const name of DESTRUCTIVE) assert.equal(tools.get(name)?.destructiveHint, true, name);
    for (const name of ["add_book_chapter", "add_lesson_page", "add_database_field", "create_badge", "allocate_workshop_reviewer"]) assert.equal(tools.get(name)?.readOnlyHint, false, name);
  });

  it("put each tool in the scope of the data it touches", () => {
    const scopes = (tool: string) => [...requiredScopes(tool)].sort();
    for (const tool of ["set_rubric", "add_book_chapter", "edit_lesson_page", "set_database_template", "create_badge", "set_badge_criteria", "list_badges"]) assert.deepEqual(scopes(tool), ["content"], tool);
    // Enabling a badge awards it to whoever meets its criteria; awarding one decides about someone.
    assert.deepEqual(scopes("set_badge_enabled"), ["content", "grading"]);
    assert.deepEqual(scopes("award_badge"), ["grading"]);
    assert.deepEqual(scopes("get_workshop_allocation"), ["student-data"]);
    assert.deepEqual(scopes("allocate_workshop_reviewer"), ["grading", "student-data"]);
  });

  it("keep the content profile and read-only access to what they allow", async () => {
    const content = (await (await connect(testConfig({ moodleUrl: "http://moodle.test/", scopes: ["content"] }))).listTools()).tools.map((t) => t.name);
    assert.ok(content.includes("add_book_chapter") && content.includes("set_rubric") && !content.includes("award_badge") && !content.includes("get_workshop_allocation"));
    const readOnly = (await (await connect(testConfig({ moodleUrl: "http://moodle.test/", access: "read" }))).listTools()).tools.map((t) => t.name);
    for (const name of READS) assert.ok(readOnly.includes(name), name);
    assert.ok(!readOnly.includes("add_lesson_page") && !readOnly.includes("set_rubric"));
  });

  it("check what the agent gives before Moodle", async () => {
    const client = await connect(testConfig({ moodleUrl: "http://moodle.test/" }));
    const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }));
    assert.match(await call("set_rubric", { assignmentId: 41, method: "rubric", name: "R", criteria: [{ description: "Clarity", levels: [{ definition: "Clear", score: 2 }] }] }), /needs two levels or more/);
    assert.match(await call("set_rubric", { assignmentId: 41, method: "guide", name: "G", criteria: [{ description: "Clarity" }] }), /needs its maxScore/);
    assert.match(await call("add_lesson_page", { lessonId: 9, type: "content", buttons: [{ label: "Go", jumpTo: "somewhere" }] }), /jumpTo/);
    assert.match(await call("set_database_template", { databaseId: 9, template: "list" }), /Give the template as html, or reset/);
    assert.match(await call("add_database_field", { databaseId: 9, type: "latlong", name: "Where", options: { kmlLabel: "title" } }), /kmlLabel is/);
    assert.match(await call("set_badge_criteria", { badgeId: 2, manual: { roleIds: [3] }, remove: ["manual"] }), /both given and removed/);
    assert.match(await call("allocate_workshop_randomly", { workshopId: 9 }), /perSubmission or perReviewer/);
    assert.match(await call("allocate_workshop_reviewer", { workshopId: 9, reviewerId: 7 }), /submissionId, or by its author/);
  });

  it("take people as aliases when the server pseudonymizes", async () => {
    const client = await connect(testConfig({ moodleUrl: "http://moodle.test/", studentData: "pseudonymize" }));
    const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }));
    assert.match(await call("award_badge", { badgeId: 2, userId: 7 }), /give the participant as user/);
    assert.match(await call("allocate_workshop_reviewer", { workshopId: 9, submissionId: 1, reviewerId: 7 }), /give the participant as user/);
    assert.match(await call("remove_workshop_reviewer", { workshopId: 9, authorId: 8, reviewerId: 7 }), /give the participant as user/);
  });
});
