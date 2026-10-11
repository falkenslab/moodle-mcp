import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SITE, fakeBrowserManager, launchTestBrowser, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";
import type { BrowserManager } from "@falkenslab/moodle-driver";
import { ConfigError, loadConfig, type Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { SCOPES, TOOL_FUNCTIONS, holdsOthersFiles, requiredScopes, showsPeople, toolAllowed } from "../../src/tools/scopes.js";
import { testConfig } from "../helpers/fixtures.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

const SESSION = ["configure", "login", "logout", "get_me", "get_site_info", "list_courses", "show_browser", "server_info"];

async function connect(config: Config, manager: BrowserManager = fakeBrowserManager()) {
  const server = createServer({ config, browser: manager });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}
const names = async (client: Client) => (await client.listTools()).tools.map((t) => t.name).sort();

describe("tool scopes", () => {
  it("knows every tool: session tools, or listed with the driver functions it calls", async () => {
    const all = await names(await connect(testConfig()));
    assert.deepEqual(all.filter((name) => !SESSION.includes(name) && !TOOL_FUNCTIONS[name]), []);
  });

  it("derives each tool's scopes from the driver's data categories, the strictest kept", () => {
    const scopes = (tool: string) => [...requiredScopes(tool)].sort();
    assert.deepEqual(scopes("create_activity"), ["content"]);
    assert.deepEqual(scopes("get_course_structure"), ["content"]);
    assert.deepEqual(scopes("get_submissions"), ["student-data"]);
    assert.deepEqual(scopes("grade_submission"), ["grading", "student-data"]);
    assert.deepEqual(scopes("reply_to_post"), ["communication"]);
    assert.deepEqual(scopes("get_my_grades"), ["as-student"]);
    assert.deepEqual(scopes("get_attempt_review"), ["as-student", "student-data"]);
    assert.deepEqual(scopes("browser_click"), ["browser"]);
    assert.deepEqual(scopes("get_activities_overview"), ["content"]);
  });

  it("gives the content profile the content and session tools only", async () => {
    const tools = await names(await connect(testConfig({ scopes: ["content"] })));
    for (const absent of ["get_submissions", "grade_submission", "reply_to_post", "create_discussion", "list_discussions", "start_quiz_attempt", "get_my_grades", "browser_navigate"]) assert.ok(!tools.includes(absent), absent);
    for (const present of [...SESSION, "create_activity", "delete_activity", "get_course_structure", "get_activity_content", "download_file", "get_activities_overview"]) assert.ok(tools.includes(present), present);
  });

  it("blocks others' data, decisions about others and the browser whatever the scopes, keeping the rest", async () => {
    const config = testConfig({ studentData: "block" });
    assert.equal(toolAllowed("get_submissions", config), false);
    assert.equal(toolAllowed("grade_submission", config), false);
    assert.equal(toolAllowed("browser_snapshot", config), false);
    assert.equal(toolAllowed("reply_to_post", config), true);
    assert.equal(toolAllowed("create_activity", config), true);
    const tools = await names(await connect(config));
    assert.ok(!tools.includes("get_discussion") && tools.includes("get_quiz_info"));
  });

  it("lets configure narrow the scopes and tighten student data, never the other way", async () => {
    const config = testConfig({ scopes: ["content", "student-data", "grading", "communication"] });
    const client = await connect(config);
    const call = (args: Record<string, unknown>) => client.callTool({ name: "configure", arguments: args });
    assert.match(JSON.stringify((await call({ scopes: "all" })).content), /only narrow/);
    assert.equal((await call({ scopes: "content" })).isError, undefined);
    assert.ok(!(await names(client)).includes("get_submissions"));
    // A client that kept its old list still gets a refusal, without Moodle being touched.
    const refused = await client.callTool({ name: "get_submissions", arguments: { assignmentId: 3 } });
    assert.equal(refused.isError, true);
    assert.match(JSON.stringify(refused.content), /disabled|outside what this server allows/);
    assert.match(JSON.stringify((await call({ scopes: "content,communication" })).content), /only narrow/);
    assert.equal((await call({ studentData: "block" })).isError, undefined);
    assert.match(JSON.stringify((await call({ studentData: "clear" })).content), /only tighten/);
    const info = (await client.callTool({ name: "server_info", arguments: {} })).structuredContent as { scopes: string[]; studentData: string };
    assert.deepEqual([info.scopes, info.studentData], [["content"], "block"]);
  });

  it("refuses others' files without student data, and keeps what teachers made", async () => {
    assert.equal(holdsOthersFiles(new URL(`${SITE}pluginfile.php/40/assignsubmission_file/submission_files/7/essay.pdf`)), true);
    assert.equal(holdsOthersFiles(new URL(`${SITE}pluginfile.php/41/mod_forum/attachment/3/notes.txt`)), true);
    assert.equal(holdsOthersFiles(new URL(`${SITE}draftfile.php/5/user/draft/1/x.png`)), true);
    assert.equal(holdsOthersFiles(new URL(`${SITE}pluginfile.php/35/mod_resource/content/0/brief.pdf`)), false);
    assert.equal(holdsOthersFiles(new URL(`${SITE}pluginfile.php/44/mod_assign/introattachment/0/template.docx`)), false);
    assert.equal(holdsOthersFiles(new URL(`${SITE}media/lesson.mp4`)), false);
    const client = await connect(testConfig({ scopes: ["content"] }));
    const refused = await client.callTool({ name: "download_file", arguments: { url: `${SITE}pluginfile.php/40/assignsubmission_file/submission_files/7/essay.pdf`, destDir: "/tmp/x" } });
    assert.match(JSON.stringify(refused.content), /someone's work/);
  });

  it("reads its limits from the environment and arguments, pseudonymizing by default", () => {
    const config = loadConfig(["--scopes", "teacher"], { MOODLE_MCP_STUDENT_DATA: "block" }) as Config;
    assert.deepEqual([config.scopes, config.studentData, config.limits.studentData], [["content", "student-data", "grading", "communication"], "block", "block"]);
    assert.deepEqual((loadConfig([], {}) as Config).scopes, [...SCOPES]);
    assert.throws(() => loadConfig(["--scopes", "everything"], {}), ConfigError);
    assert.equal((loadConfig([], {}) as Config).studentData, "pseudonymize");
    assert.throws(() => loadConfig([], { MOODLE_MCP_STUDENT_DATA: "anonymous" }), /must be one of block, pseudonymize, clear/);
  });

  it("knows people's pages from the rest, on a site in a folder too", () => {
    const site = "https://campus.example.org/moodle/";
    const people = (path: string) => showsPeople(new URL(path, site), site);
    for (const path of ["user/index.php?id=5", "user/view.php?id=7", "grade/report/grader/index.php?id=5", "report/log/index.php?id=5", "mod/quiz/report.php?id=8", "mod/attendance/report.php?id=3", "local/x/view.php?userid=7", "mod/assign/view.php?id=4&action=grader", "mod/forum/view.php?id=6", "message/index.php", "pluginfile.php/40/assignsubmission_file/submission_files/7/a.pdf"]) assert.equal(people(path), true, path);
    for (const path of ["course/view.php?id=5", "course/modedit.php?update=4", "mod/assign/view.php?id=4", "mod/page/view.php?id=2", "question/edit.php?courseid=5", "grade/edit/tree/index.php?id=5", "pluginfile.php/35/mod_resource/content/0/brief.pdf"]) assert.equal(people(path), false, path);
    assert.equal(showsPeople(new URL("https://campus.example.org/other/user/index.php"), site), false);
  });

  it("tells the agent its limits in the instructions", async () => {
    const limited = await connect(testConfig({ scopes: ["content"] }));
    assert.match(limited.getInstructions() ?? "", /This server is limited \(scopes content/);
    assert.doesNotMatch((await connect(testConfig())).getInstructions() ?? "", /This server is limited/);
  });
});

describe("deleting without student data", { skip: !browser && "no system browser" }, () => {
  it("refuses activities that may hold students' work, and deletes the rest", async () => {
    const context = await browser!.newContext();
    const state = { section: [{ id: "10", number: 1, title: "Unit", cmlist: ["20", "21"] }], cm: [{ id: "20", name: "Essay", module: "assign", visible: true, sectionid: "10" }, { id: "21", name: "Notes", module: "page", visible: true, sectionid: "10" }] };
    const edits: string[] = [];
    await serveFakeMoodle(context, {
      user: { id: 3, fullName: "T" },
      services: {
        core_courseformat_get_state: () => JSON.stringify(state),
        core_courseformat_update_course: (args) => {
          edits.push(String(args.action));
          return "[]";
        },
      },
    });
    const client = await connect(testConfig({ scopes: ["content"] }), fakeBrowserManager({ context: async () => context }));
    const refused = await client.callTool({ name: "delete_activity", arguments: { courseId: 2, activityId: 20 } });
    assert.match(JSON.stringify(refused.content), /Essay\W+ \(assign\) may hold students' work/);
    assert.match(JSON.stringify((await client.callTool({ name: "delete_section", arguments: { courseId: 2, sectionId: 10 } })).content), /may hold students' work/);
    const deleted = await client.callTool({ name: "delete_activity", arguments: { courseId: 2, activityId: 21 } });
    assert.equal(deleted.isError, undefined, JSON.stringify(deleted.content));
    assert.deepEqual(edits, ["cm_delete"]);
    await context.close();
  });
});
