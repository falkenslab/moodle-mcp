import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Route } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
let dir: string;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-submission-"));
  await writeFile(path.join(dir, "work.txt"), "my work\n");
});
after(async () => {
  await browser?.close();
  await rm(dir, { recursive: true, force: true });
});

/** A made-up assignment (cmid 30) whose pages follow Moodle 5.2's; `statement` asks to accept one. */
function fakeAssignment(statement = false, files = true) {
  const state = { stage: "new" as "new" | "draft" | "submitted", text: "", files: [] as string[], posts: [] as URLSearchParams[] };
  const page = (body: string, bodyId: string) => moodlePage({ userId: 4, body, bodyId });
  const action = (name: string) => `<form method="get" action="${SITE}mod/assign/view.php"><input type="hidden" name="id" value="30"><input type="hidden" name="action" value="${name}"><button>x</button></form>`;
  const view = () => {
    const rows = [
      `<tr><th>Submission status</th><td class="submissionstatus${state.stage}">${state.stage}</td></tr>`,
      `<tr><th>Grading status</th><td class="submissionnotgraded">Not graded</td></tr>`,
      state.text ? `<tr><th>Online text</th><td>${state.text}</td></tr>` : "",
      state.files.length ? `<tr><th>Files</th><td>${state.files.map((f) => `<a href="${SITE}pluginfile.php/9/assignsubmission_file/submission_files/1/${f}">${f}</a>`).join("")}</td></tr>` : "",
    ].join("");
    const actions = state.stage === "submitted" ? "" : action("editsubmission") + (state.stage === "draft" ? action("submit") : "");
    return page(
      `<div class="activity-description" id="intro"><p>Write a program.</p><a href="${SITE}pluginfile.php/9/mod_assign/introattachment/0/template.docx">template.docx</a></div>
<div data-region="activity-dates"><div class="date-item"><span class="date-item-label">Due:</span> Friday</div></div>
<table class="submissionstatustable">${rows}</table>${actions}`,
      "page-mod-assign-view",
    );
  };
  const routes = async (context: BrowserContext) => {
    await context.route(`${SITE}mod/assign/view.php**`, (route: Route) => {
      const request = route.request();
      const html = (body: string) => route.fulfill({ status: 200, contentType: "text/html", body });
      const actionParam = new URL(request.url()).searchParams.get("action");
      if (request.method() === "POST") {
        const form = new URLSearchParams(request.postData() ?? "");
        state.posts.push(form);
        if (form.get("action") === "savesubmission") {
          state.stage = "draft";
          if (form.has("onlinetext_editor[text]")) state.text = form.get("onlinetext_editor[text]")!.replace(/<[^>]+>/g, "");
        } else if (form.get("action") === "confirmsubmit") state.stage = "submitted";
        return html(view());
      }
      if (actionParam === "editsubmission") {
        if (state.stage === "submitted") return html(page("<p>Not allowed</p>", "page-mod-assign-view"));
        const fileField = files ? `<input type="hidden" name="files_filemanager" value="321">` : "";
        return html(
          page(
            `<form class="mform" method="post" action="${SITE}mod/assign/view.php"><input type="hidden" name="action" value="savesubmission"><textarea name="onlinetext_editor[text]"></textarea><input type="hidden" name="onlinetext_editor[format]" value="1">${fileField}<input type="submit" name="submitbutton" value="Save changes"></form>
<script>var fp = {"repositories":{"5":{"id":"5","name":"Upload a file","type":"upload"}}};</script>`,
            "page-mod-assign-editsubmission",
          ),
        );
      }
      if (actionParam === "submit") {
        const box = statement ? `<div class="form-check"><input type="hidden" name="submissionstatement" value="0"><input type="checkbox" name="submissionstatement" value="1"> This is my own work.</div>` : "";
        return html(page(`<form class="mform" method="post" action="${SITE}mod/assign/view.php"><input type="hidden" name="action" value="confirmsubmit">${box}<input type="submit" name="submitbutton" value="Continue"></form>`, "page-mod-assign-submit"));
      }
      return html(view());
    });
    await context.route(`${SITE}repository/repository_ajax.php**`, (route: Route) => {
      state.files.push(/filename="([^"]+)"/.exec(route.request().postData() ?? "")?.[1] ?? "");
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
  };
  return { state, routes };
}

describe("student assignment tools", { skip: !browser && "no system browser" }, () => {
  async function connect(statement = false, files = true) {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 4, fullName: "Student" } });
    const assignment = fakeAssignment(statement, files);
    await assignment.routes(context);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, state: assignment.state };
  }
  const call = async (client: Client, name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    return { error: result.isError ? JSON.stringify(result.content) : undefined, out: result.structuredContent as Record<string, unknown> };
  };

  it("reads, saves a draft with text and files, and submits it", async () => {
    const { client, context, state } = await connect();
    const before = (await call(client, "get_assignment", { assignmentId: 30 })).out;
    assert.deepEqual([before.submissionState, before.canEdit, before.canSubmit], ["new", true, false]);
    assert.deepEqual(before.descriptionFiles, [{ name: "template.docx", url: `${SITE}pluginfile.php/9/mod_assign/introattachment/0/template.docx` }]);
    assert.deepEqual(before.dates, [{ label: "Due", value: "Friday" }]);
    const draft = (await call(client, "save_submission", { assignmentId: 30, onlineText: "<p>My answer</p>", files: [path.join(dir, "work.txt")] })).out;
    assert.deepEqual([draft.submissionState, draft.canSubmit], ["draft", true]);
    assert.deepEqual((draft.submittedFiles as { name: string }[]).map((f) => f.name), ["work.txt"]);
    assert.equal(state.posts[0]?.get("onlinetext_editor[text]"), "<p>My answer</p>");
    const submitted = (await call(client, "submit_assignment", { assignmentId: 30 })).out;
    assert.deepEqual([submitted.submissionState, submitted.canEdit], ["submitted", false]);
    await context.close();
  });

  it("asks to accept the site's statement before submitting", async () => {
    const { client, context, state } = await connect(true);
    await call(client, "save_submission", { assignmentId: 30, onlineText: "<p>x</p>" });
    const refused = await call(client, "submit_assignment", { assignmentId: 30 });
    assert.match(refused.error ?? "", /This is my own work/);
    assert.equal(state.stage, "draft");
    const accepted = await call(client, "submit_assignment", { assignmentId: 30, acceptStatement: true });
    assert.equal(accepted.out.submissionState, "submitted");
    assert.deepEqual(state.posts.at(-1)?.getAll("submissionstatement"), ["0", "1"]);
    await context.close();
  });

  it("refuses files where the assignment takes none, and annotates submitting as final", async () => {
    const { client, context } = await connect(false, false);
    const refused = await call(client, "save_submission", { assignmentId: 30, files: [path.join(dir, "work.txt")] });
    assert.match(refused.error ?? "", /doesn't take file submissions/);
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    assert.equal(tools.get("submit_assignment")?.destructiveHint, true);
    assert.equal(tools.get("get_assignment")?.readOnlyHint, true);
    await context.close();
  });
});
