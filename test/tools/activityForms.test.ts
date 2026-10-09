import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Route } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import type { CourseState } from "../../src/moodle/course.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
let dir: string;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-forms-"));
  await writeFile(path.join(dir, "brief.txt"), "Write a program.\n");
});
after(async () => {
  await browser?.close();
  await rm(dir, { recursive: true, force: true });
});

/** An activity form reduced to what the tools touch, shaped like Moodle 5.2's `modedit.php`; made up. */
function activityForm(values: { name?: string; error?: string } = {}): string {
  return `<form class="mform" action="modedit.php" method="post">
<input type="hidden" name="course" value="5"><input type="hidden" name="modulename" value="resource"><input type="hidden" name="sesskey" value="s1">
<input type="text" name="name" id="id_name" value="${values.name ?? ""}"><div id="id_error_name">${values.error ?? ""}</div>
<textarea name="introeditor[text]" id="id_introeditor"></textarea>
<input type="hidden" name="showdescription" value="0"><input type="checkbox" name="showdescription" value="1">
<input type="hidden" name="files" value="777">
<select name="visible"><option value="1">Show</option><option value="0">Hide</option></select>
<input type="submit" name="submitbutton2" value="Save and return"></form>
<script>var filepicker = {"repositories":{"5":{"id":"5","name":"Upload a file","type":"upload"}}};</script>`;
}

describe("create_activity and update_activity", { skip: !browser && "no system browser" }, () => {
  async function connect(): Promise<{ client: Client; context: BrowserContext; posts: URLSearchParams[]; uploads: string[]; course: CourseState }> {
    const course: CourseState = { section: [{ id: "10", number: 0, title: "General", cmlist: [] }, { id: "11", number: 1, title: "Unit 1", cmlist: [] }], cm: [] };
    const posts: URLSearchParams[] = [];
    const uploads: string[] = [];
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 3, fullName: "Teacher" }, services: { core_courseformat_get_state: () => JSON.stringify(course) } });
    const page = (body: string) => moodlePage({ userId: 3, body });
    await context.route(`${SITE}course/modedit.php**`, (route: Route) => {
      const request = route.request();
      if (request.method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: page(activityForm()) });
      const form = new URLSearchParams(request.postData() ?? "");
      posts.push(form);
      // Moodle sends the form back with its error by field; else the activity exists.
      if (!form.get("name")) return route.fulfill({ status: 200, contentType: "text/html", body: page(activityForm({ error: "You must supply a value here." })) });
      course.cm.push({ id: "40", name: form.get("name")!, module: "resource", visible: form.get("visible") === "1", sectionid: "11", url: `${SITE}mod/resource/view.php?id=40` });
      course.section[1]!.cmlist!.push("40");
      return route.fulfill({ status: 200, contentType: "text/html", body: page("<p>Course page</p>") });
    });
    await context.route(`${SITE}repository/repository_ajax.php**`, (route: Route) => {
      const body = route.request().postData() ?? "";
      uploads.push(`${/name="itemid"\r\n\r\n(\d+)/.exec(body)?.[1]}:${/filename="([^"]+)"/.exec(body)?.[1]}`);
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, posts, uploads, course };
  }

  it("fills the form, uploads the files to its draft area, saves hidden and returns the new activity", async () => {
    const { client, context, posts, uploads } = await connect();
    const result = await client.callTool({
      name: "create_activity",
      arguments: { courseId: 5, sectionId: 11, type: "resource", name: "Brief", description: "<p>Read it</p>", files: [path.join(dir, "brief.txt")], settings: { showdescription: true } },
    });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    const output = result.structuredContent as { activityId: number; changed: string };
    assert.equal(output.activityId, 40);
    assert.deepEqual(uploads, ["777:brief.txt"]);
    const sent = posts[0]!;
    assert.equal(sent.get("name"), "Brief");
    assert.equal(sent.get("introeditor[text]"), "<p>Read it</p>");
    assert.equal(sent.get("visible"), "0");
    assert.deepEqual(sent.getAll("showdescription"), ["0", "1"]);
    await context.close();
  });

  it("returns Moodle's form errors by field, and refuses fields the form doesn't have", async () => {
    const { client, context, course } = await connect();
    const refused = await client.callTool({ name: "update_activity", arguments: { activityId: 40, name: "x", settings: { name: "" } } });
    assert.equal(refused.isError, true);
    assert.match(JSON.stringify(refused.content), /name: You must supply a value here/);
    const unknown = await client.callTool({ name: "create_activity", arguments: { courseId: 5, sectionId: 11, type: "resource", name: "X", settings: { duedate: 1 } } });
    assert.match(JSON.stringify(unknown.content), /no such field: duedate/);
    assert.equal(course.cm.length, 0);
    await context.close();
  });

  it("refuses relative paths and a section the course doesn't have", async () => {
    const { client, context } = await connect();
    const relative = await client.callTool({ name: "create_activity", arguments: { courseId: 5, sectionId: 11, type: "resource", name: "X", files: ["brief.txt"] } });
    assert.match(JSON.stringify(relative.content), /absolute paths/);
    const section = await client.callTool({ name: "create_activity", arguments: { courseId: 5, sectionId: 99, type: "page", name: "X" } });
    assert.match(JSON.stringify(section.content), /has no section 99/);
    await context.close();
  });
});
