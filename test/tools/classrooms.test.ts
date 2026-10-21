import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { loadConfig, parseCourseUrl, type Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { SITE_WIDE, classroomTools, collectionKind, idKind } from "../../src/tools/classrooms.js";
import { toolAllowed } from "../../src/tools/scopes.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const SITE = "http://moodle.test/";
const classrooms = [{ site: "school", courseId: 3, url: `${SITE}course/view.php?id=3` }];
const sites: Config["sites"] = [
  { name: "school", url: SITE, profileDir: "/p/school", origin: "configuration" },
  { name: "uni", url: "http://uni.test/", profileDir: "/p/uni", origin: "configuration" },
];

/** Made-up tools with the shapes of the real ones, under the classrooms' wrapper; `calls` records what ran. */
async function connect(config: Config) {
  const server = new McpServer({ name: "t", version: "0" });
  classroomTools(server, config);
  const calls: string[] = [];
  const tool = (name: string, input: Record<string, z.ZodType>, output: (args: Record<string, unknown>) => Record<string, unknown>) =>
    server.registerTool(name, { inputSchema: input }, async (args: Record<string, unknown>) => {
      calls.push(name);
      const out = output(args);
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    });
  const id = z.number().int();
  tool("get_course_structure", { courseId: id }, ({ courseId }) => ({ course: { id: courseId }, sections: [{ id: 10, activities: [{ id: 100 }, { id: 101 }] }] }));
  tool("delete_activity", { courseId: id, activityId: id }, () => ({ changed: "deleted" }));
  tool("get_quiz_info", { quizId: id }, () => ({ attempts: [{ id: 7 }] }));
  tool("get_quiz_attempt", { attemptId: id }, () => ({ attemptId: 7 }));
  tool("list_courses", {}, () => ({ courses: [{ id: 3 }, { id: 2 }] }));
  tool("list_deadlines", { courseId: id.optional() }, () => ({ deadlines: [{ activityId: 200, course: { id: 3 } }, { activityId: 300, course: { id: 2 } }] }));
  tool("set_user_roles", { courseId: id, userId: id, roleIds: z.array(id) }, () => ({ changed: "roles" }));
  tool("copy_between_sites", { fromSite: z.string(), courseId: id, toSite: z.string(), toCourseId: id }, () => ({ changed: "copied" }));
  tool("download_file", { url: z.string() }, () => ({ path: "/tmp/f" }));
  tool("get_activity_content", { activityId: id }, () => ({ files: [{ url: `${SITE}pluginfile.php/1/a.pdf` }] }));
  // Without inputs, the SDK gives the handler the request's extra (its requestId…) as its only argument.
  server.registerTool("server_info", {}, async () => ({ content: [{ type: "text" as const, text: "{}" }], structuredContent: { name: "t" } }));
  const client = new Client({ name: "c", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), client.connect(a)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await client.callTool({ name, arguments: args });
    return { error: r.isError ? (r.content as { text: string }[])[0]!.text : undefined, out: r.structuredContent as Record<string, unknown> | undefined, text: (r.content as { text: string }[])[0]?.text };
  };
  return { call, calls };
}

describe("classrooms", () => {
  it("tells an id's kind from its name", () => {
    assert.equal(idKind("courseId"), "course");
    assert.equal(idKind("toCourseId"), "course");
    assert.equal(idKind("quizId"), "activity");
    assert.equal(idKind("activityIds"), "activity");
    assert.equal(idKind("toAfterSectionId"), "section");
    assert.equal(idKind("parentSectionId"), "section");
    assert.equal(idKind("parentId"), "category");
    assert.equal(idKind("reviewerId"), "user");
    assert.equal(idKind("toolId"), "tool");
    assert.equal(idKind("forumInstanceId"), undefined);
    assert.equal(idKind("id"), undefined);
    assert.equal(collectionKind("activities"), "activity");
    assert.equal(collectionKind("posts"), "post");
    assert.equal(collectionKind("quiz"), "activity");
  });

  it("refuses another course, and ids it hasn't read in a classroom; reading the course lets them through", async () => {
    const { call, calls } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school", classrooms }));
    assert.match((await call("get_course_structure", { courseId: 2 })).error ?? "", /course 2 isn't one of the classrooms/);
    assert.match((await call("delete_activity", { courseId: 3, activityId: 100 })).error ?? "", /activityId 100 hasn't come from one of the classrooms/);
    assert.deepEqual(calls, [], "nothing ran");
    assert.equal((await call("server_info")).error, undefined, "a tool without inputs has nothing to check");
    assert.equal((await call("get_course_structure", { courseId: 3 })).error, undefined);
    assert.equal((await call("delete_activity", { courseId: 3, activityId: 100 })).error, undefined);
    // An invented id stays out, whatever was read.
    assert.match((await call("delete_activity", { courseId: 3, activityId: 999 })).error ?? "", /activityId 999/);
    // Ids by kind: activity 100 isn't an attempt.
    assert.match((await call("get_quiz_attempt", { attemptId: 100 })).error ?? "", /attemptId 100/);
    assert.equal((await call("get_quiz_info", { quizId: 101 })).error, undefined);
    assert.equal((await call("get_quiz_attempt", { attemptId: 7 })).error, undefined);
  });

  it("keeps only the classrooms in lists across courses, and records what those said", async () => {
    const { call } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school", classrooms }));
    const courses = await call("list_courses");
    assert.deepEqual(courses.out, { courses: [{ id: 3 }] });
    assert.deepEqual(JSON.parse(courses.text!), { courses: [{ id: 3 }] }, "the text follows");
    assert.deepEqual((await call("list_deadlines")).out, { deadlines: [{ activityId: 200, course: { id: 3 } }] });
    assert.equal((await call("get_quiz_info", { quizId: 200 })).error, undefined);
    assert.match((await call("get_quiz_info", { quizId: 300 })).error ?? "", /quizId 300/);
  });

  it("leaves people and roles to their course, and downloads only what it read", async () => {
    const { call } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school", classrooms }));
    assert.equal((await call("set_user_roles", { courseId: 3, userId: 42, roleIds: [5] })).error, undefined);
    assert.match((await call("download_file", { url: `${SITE}pluginfile.php/9/other.pdf` })).error ?? "", /hasn't come from one of the classrooms/);
    await call("get_course_structure", { courseId: 3 });
    await call("get_activity_content", { activityId: 100 });
    assert.equal((await call("download_file", { url: `${SITE}pluginfile.php/1/a.pdf` })).error, undefined);
  });

  it("checks copy_between_sites' target on its own site", async () => {
    const both = [...classrooms, { site: "uni", courseId: 7, url: "http://uni.test/course/view.php?id=7" }];
    const { call } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school", classrooms: both }));
    assert.equal((await call("copy_between_sites", { fromSite: "school", courseId: 3, toSite: "uni", toCourseId: 7 })).error, undefined);
    assert.match((await call("copy_between_sites", { fromSite: "school", courseId: 3, toSite: "uni", toCourseId: 3 })).error ?? "", /course 3 isn't one of the classrooms/);
  });

  it("changes nothing without classrooms", async () => {
    const { call } = await connect(testConfig({ moodleUrl: SITE, sites, activeSite: "school" }));
    assert.equal((await call("delete_activity", { courseId: 2, activityId: 999 })).error, undefined);
    assert.deepEqual((await call("list_courses")).out, { courses: [{ id: 3 }, { id: 2 }] });
  });

  it("turns off the browser, messages and adding sites", () => {
    const config = testConfig({ classrooms });
    for (const tool of ["browser_navigate", "send_message", "list_notifications", "add_site"]) assert.equal(toolAllowed(tool, config), false, tool);
    for (const tool of ["get_course_structure", "use_site", "server_info"]) assert.equal(toolAllowed(tool, config), true, tool);
    assert.equal(toolAllowed("browser_navigate", testConfig()), true);
  });

  it("reads MOODLE_MCP_COURSES: the sites from the URLs, one per site", () => {
    const config = loadConfig([], { MOODLE_MCP_COURSES: "https://campus.example.org/course/view.php?id=12, https://moodle.uni.es/moodle/course/view.php?id=7" }) as Config;
    assert.deepEqual(config.sites.map((s) => [s.name, s.url]), [["campus.example.org", "https://campus.example.org/"], ["moodle.uni.es", "https://moodle.uni.es/moodle/"]]);
    assert.deepEqual(config.classrooms?.map((c) => [c.site, c.courseId]), [["campus.example.org", 12], ["moodle.uni.es", 7]]);
    assert.equal(config.activeSite, "campus.example.org");
    // A classroom on a site already named keeps its name.
    const named = loadConfig([], { MOODLE_MCP_SITES: "school=https://campus.example.org", MOODLE_MCP_COURSES: "https://campus.example.org/course/view.php?id=12" }) as Config;
    assert.deepEqual(named.classrooms?.map((c) => c.site), ["school"]);
    assert.equal(named.sites.length, 1);
    assert.throws(() => parseCourseUrl("https://campus.example.org/mod/quiz/view.php?id=4"), /A classroom is a course's URL/);
    assert.throws(() => parseCourseUrl("https://campus.example.org/course/view.php"), /A classroom is a course's URL/);
  });

  it("lets configure narrow the classrooms, never widen them", async () => {
    const both = [...classrooms, { site: "school", courseId: 4, url: `${SITE}course/view.php?id=4` }];
    const config = testConfig({ moodleUrl: SITE, sites, activeSite: "school", classrooms: both });
    const server = createServer({ config, browser: fakeBrowserManager() });
    const client = new Client({ name: "c", version: "0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(b), client.connect(a)]);
    const configure = async (args: Record<string, unknown>) => client.callTool({ name: "configure", arguments: args });
    const narrowed = await configure({ courses: [`${SITE}course/view.php?id=4`] });
    assert.equal(narrowed.isError, undefined, JSON.stringify(narrowed.content));
    assert.deepEqual((narrowed.structuredContent as { classrooms: string[] }).classrooms, [`${SITE}course/view.php?id=4`]);
    assert.match(JSON.stringify((await configure({ courses: [`${SITE}course/view.php?id=3`] })).content), /can only narrow the classrooms/);
    assert.match(JSON.stringify((await configure({ url: "http://uni.test/" })).content), /switch between them with use_site/);
  });

  it("can give every id a tool takes from some tool's output (ADR-025)", async () => {
    // Every tool, advanced ones included, as the schemas say: the kinds of their id inputs and outputs.
    const server = createServer({ config: testConfig({ advanced: true }), browser: fakeBrowserManager() });
    const client = new Client({ name: "c", version: "0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(b), client.connect(a)]);
    const tools = (await client.listTools()).tools;
    type Schema = { type?: string; properties?: Record<string, Schema>; items?: Schema; anyOf?: Schema[] };
    const given = new Set<string>();
    const output = (schema: Schema | undefined, container: string | undefined) => {
      if (!schema) return;
      for (const s of schema.anyOf ?? []) output(s, container);
      if (schema.items) output(schema.items, container);
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        const leaf = value.type === "integer" || value.type === "number" || value.items?.type === "integer" || value.items?.type === "number";
        const kind = key === "id" || key === "parentId" ? container : idKind(key);
        if (leaf && kind) given.add(kind);
        else output(value, collectionKind(key));
      }
    };
    const taken = new Map<string, string>();
    const input = (schema: Schema | undefined, tool: string) => {
      for (const [key, value] of Object.entries(schema?.properties ?? {})) {
        const leaf = value.type === "integer" || value.type === "number" || value.items?.type === "integer" || value.items?.type === "number";
        const kind = idKind(key);
        if (leaf && kind) taken.set(kind, `${tool}.${key}`);
        else input(value.items ?? value, tool);
      }
    };
    for (const t of tools) {
      output(t.outputSchema as Schema, undefined);
      input(t.inputSchema as Schema, t.name);
    }
    // Not empty by mistake: the tools take and give dozens of kinds.
    assert.ok(taken.size > 30 && given.size > 30, `${taken.size} kinds taken, ${given.size} given`);
    for (const kind of ["activity", "section", "discussion", "post", "attempt", "entry", "question"]) assert.ok(given.has(kind), kind);
    const missing = [...taken].filter(([kind]) => kind !== "course" && !SITE_WIDE.has(kind) && !given.has(kind));
    assert.deepEqual(missing, [], "id inputs no output gives");
  });
});
