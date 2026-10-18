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
const site = "http://moodle.test/";

const READS = ["read_backup", "list_glossary_entries", "list_glossary_categories", "list_database_entries", "get_choice_results", "get_survey_results", "get_workshop_submission", "list_workshop_examples", "get_course_completion_criteria", "get_course_completion_status", "list_question_categories"];
const DESTRUCTIVE = ["delete_glossary_entry", "delete_database_entry", "delete_workshop_example", "set_course_completion_criteria", "delete_question_category"];

describe("the tools of moodle-driver 0.10, first batch", () => {
  it("declare what they do", async () => {
    const tools = new Map((await (await connect(testConfig({ moodleUrl: site }))).listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of READS) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    for (const name of DESTRUCTIVE) assert.equal(tools.get(name)?.destructiveHint, true, name);
  });

  it("put each tool in the scope of the data it touches, and in its role", async () => {
    const scopes = (tool: string) => [...requiredScopes(tool)].sort();
    for (const tool of ["add_glossary_entry", "list_glossary_categories", "list_question_categories", "export_questions", "set_course_completion_criteria", "add_workshop_example"]) assert.deepEqual(scopes(tool), ["content"], tool);
    assert.deepEqual(scopes("list_database_entries"), ["student-data"]);
    assert.deepEqual(scopes("get_workshop_submission"), ["student-data"]);
    assert.deepEqual(scopes("mark_course_complete"), ["grading"]);
    assert.deepEqual(scopes("calculate_workshop_grades"), ["grading", "student-data"]);
    const student = (await (await connect(testConfig({ moodleUrl: site, role: "student" }))).listTools()).tools.map((t) => t.name);
    assert.ok(student.includes("add_glossary_entry") && student.includes("save_workshop_submission") && !student.includes("get_survey_results") && !student.includes("export_questions"));
    // Exports change nothing in Moodle: read-only access keeps them, as it keeps export_grades.
    const readOnly = (await (await connect(testConfig({ moodleUrl: site, access: "read" }))).listTools()).tools.map((t) => t.name);
    for (const name of [...READS, "export_glossary", "export_database_entries", "export_questions"]) assert.ok(readOnly.includes(name), name);
    assert.ok(!readOnly.includes("add_glossary_entry"));
  });

  it("check what the agent gives before Moodle", async () => {
    const client = await connect(testConfig({ moodleUrl: site }));
    const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }));
    assert.match(await call("set_course_completion_criteria", { courseId: 3, grade: 5, remove: ["grade"] }), /both given and removed/);
    assert.match(await call("override_workshop_grade", { workshopId: 9, grade: 5 }), /submissionId or assessmentId/);
    assert.match(await call("override_workshop_grade", { workshopId: 9, submissionId: 1 }), /or remove: true/);
  });

  it("declare and scope the second batch", async () => {
    const tools = new Map((await (await connect(testConfig({ moodleUrl: site }))).listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of ["list_wiki_pages", "get_wiki_page", "list_scales", "get_grade_letters", "get_feedback_items", "list_feedback_templates", "get_quiz_statistics"]) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    for (const name of ["delete_feedback_item", "delete_feedback_template"]) assert.equal(tools.get(name)?.destructiveHint, true, name);
    const scopes = (tool: string) => [...requiredScopes(tool)].sort();
    for (const tool of ["create_wiki_page", "add_scale", "set_grade_letters", "add_feedback_item", "import_groups", "get_quiz_statistics"]) assert.deepEqual(scopes(tool), ["content"], tool);
    assert.deepEqual(scopes("get_wiki_page"), ["content", "student-data"]);
    assert.deepEqual(scopes("import_grades"), ["grading", "student-data"]);
    assert.deepEqual(scopes("auto_create_groups"), ["grading", "student-data"]);
    const student = (await (await connect(testConfig({ moodleUrl: site, role: "student" }))).listTools()).tools.map((t) => t.name);
    assert.ok(student.includes("edit_wiki_page") && !student.includes("get_quiz_statistics") && !student.includes("add_feedback_item"));

    const client = await connect(testConfig({ moodleUrl: site }));
    const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }));
    assert.match(await call("set_grade_letters", { courseId: 3 }), /useDefaults: true/);
    assert.match(await call("edit_feedback_item", { feedbackId: 9, itemId: 1, dependsOn: { itemId: 2, value: "Yes" }, removeDependency: true }), /both given and removed/);
    assert.match(await call("import_grades", { courseId: 3, file: "/tmp/g.csv", mapFrom: "Email", mapTo: "email" }), /Say which columns/);
    assert.match(await call("import_grades", { courseId: 3, file: "/tmp/g.csv", mapFrom: "Email", mapTo: "email", items: { Quiz: 5 }, feedback: { Quiz: 5 } }), /both a grade and feedback/);
    const pseudonymous = await connect(testConfig({ moodleUrl: site, studentData: "pseudonymize" }));
    assert.match(text(await pseudonymous.callTool({ name: "import_grades", arguments: { courseId: 3, file: "/tmp/g.csv", mapFrom: "Email", mapTo: "email", items: { Quiz: 5 } } })), /this server pseudonymizes/);
    assert.match(text(await pseudonymous.callTool({ name: "list_wiki_pages", arguments: { wikiId: 9, participantId: 7 } })), /give the participant as user/);
  });

  it("keep the advanced tools off unless the person turns them on (ADR-022)", async () => {
    const ADVANCED = ["list_course_blocks", "add_block", "list_content_bank", "get_bigbluebutton", "list_notes", "add_note", "list_course_competencies", "rate_competency", "list_external_tools", "add_external_tool"];
    const byDefault = (await (await connect(testConfig({ moodleUrl: site }))).listTools()).tools.map((t) => t.name);
    for (const name of ADVANCED) assert.ok(!byDefault.includes(name), name);
    const advanced = await connect(testConfig({ moodleUrl: site, advanced: true }));
    const on = (await advanced.listTools()).tools.map((t) => t.name);
    for (const name of ADVANCED) assert.ok(on.includes(name), name);
    // The other limits still apply to them.
    const student = (await (await connect(testConfig({ moodleUrl: site, advanced: true, role: "student" }))).listTools()).tools.map((t) => t.name);
    assert.ok(student.includes("get_bigbluebutton_join_url") && !student.includes("add_note") && !student.includes("add_block"));
    const content = (await (await connect(testConfig({ moodleUrl: site, advanced: true, scopes: ["content"] }))).listTools()).tools.map((t) => t.name);
    assert.ok(content.includes("add_block") && !content.includes("list_notes") && !content.includes("rate_competency"));
    // A client that kept an advanced tool from another server is refused before Moodle.
    const refused = await (await connect(testConfig({ moodleUrl: site }))).callTool({ name: "list_course_blocks", arguments: { courseId: 3 } });
    assert.equal(refused.isError, true);

    const pseudonymous = await connect(testConfig({ moodleUrl: site, advanced: true, studentData: "pseudonymize" }));
    const call = async (name: string, args: Record<string, unknown>) => text(await pseudonymous.callTool({ name, arguments: args }));
    assert.match(await call("add_note", { courseId: 3, userId: 7, content: "<p>Doing well</p>" }), /give the participant as user/);
    assert.match(await call("add_note", { courseId: 3, user: "A-7KQ2XM", content: "<p>Ask A-7KQ2XM</p>" }), /an alias/);
    assert.match(await call("rate_competency", { courseId: 3, competencyId: 2, userId: 7, rating: "2" }), /give the participant as user/);
  });

  it("keep others' files and texts out under pseudonymize, and take people as aliases", async () => {
    const client = await connect(testConfig({ moodleUrl: site, studentData: "pseudonymize" }));
    const call = async (name: string, args: Record<string, unknown>) => text(await client.callTool({ name, arguments: args }));
    assert.match(await call("export_glossary", { glossaryId: 9, destDir: "/tmp" }), /this server pseudonymizes/);
    assert.match(await call("export_database_entries", { databaseId: 9, file: "/tmp/e.csv" }), /this server pseudonymizes/);
    assert.match(await call("mark_course_complete", { courseId: 3, userId: 7 }), /give the participant as user/);
    assert.match(await call("get_workshop_submission", { workshopId: 9, authorId: 7 }), /give the participant as user/);
    assert.match(await call("add_glossary_entry", { glossaryId: 9, concept: "Loop", definition: "<p>As A-7KQ2XM said</p>" }), /an alias/);
  });
});
