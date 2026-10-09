import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

/** A grading panel's form, as Moodle 5.2's fragment renders it, reduced; made up. */
function panel(grade: string, feedback: string | null): string {
  const comments = feedback === null ? "" : `<textarea name="assignfeedbackcomments_editor[text]" id="id_assignfeedbackcomments_editor">${feedback}</textarea><input type="hidden" name="assignfeedbackcomments_editor[format]" value="1">`;
  return `<div class="submissionstatustable"></div><form class="gradeform mform" action="${SITE}lib/ajax/service.php" method="post">
<input type="hidden" name="id" value="21"><input type="hidden" name="userid" value="0"><input type="hidden" name="sendstudentnotifications" value="1">
<input type="hidden" name="action" value="submitgrade"><input type="hidden" name="sesskey" value="s1">
<input type="text" name="grade" value="${grade}">${comments}</form>`;
}

/** A made-up assignment (instance 210, context 2100) that keeps the last grade submitted. */
function moodle(withComments: boolean, refuse = false): { state: FakeMoodleState; submitted: Record<string, unknown>[] } {
  const saved = { grade: "", feedback: "" };
  const submitted: Record<string, unknown>[] = [];
  return {
    submitted,
    state: {
      user: { id: 3, fullName: "Teacher" },
      bodies: { "/mod/assign/view.php": `<div data-assignmentid="210" data-contextid="2100"></div>` },
      services: {
        core_get_fragment: () => ({ html: panel(saved.grade, withComments ? saved.feedback : null), javascript: "" }),
        mod_assign_submit_grading_form: (args) => {
          submitted.push(args);
          if (refuse) return [{ item: "grade", warningcode: "couldnotsavegrade", message: "Could not save grade." }];
          const form = new URLSearchParams(JSON.parse(String(args.jsonformdata)) as string);
          saved.grade = form.get("grade") ?? "";
          saved.feedback = form.get("assignfeedbackcomments_editor[text]") ?? "";
          return [];
        },
      },
    },
  };
}

describe("grade_submission", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("submits the panel's form as the grader does and reads the grade back", async () => {
    const { state, submitted } = moodle(true);
    const { client, context } = await connect(state);
    const result = await client.callTool({ name: "grade_submission", arguments: { assignmentId: 31, userId: 7, grade: "7.5", feedback: "<p>Good</p>", notify: false } });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    assert.deepEqual(JSON.parse(JSON.stringify(result.structuredContent)), { changed: "Graded user 7 in assignment 31, with feedback.", grade: "7.5", feedback: "<p>Good</p>" });
    assert.equal(submitted[0]?.assignmentid, 210);
    assert.equal(submitted[0]?.userid, 7);
    const form = new URLSearchParams(JSON.parse(String(submitted[0]?.jsonformdata)) as string);
    assert.equal(form.get("sendstudentnotifications"), "0");
    assert.equal(form.get("action"), "submitgrade");
    await context.close();
  });

  it("explains a refused grade and feedback an assignment doesn't take", async () => {
    const refusing = await connect(moodle(true, true).state);
    const refused = await refusing.client.callTool({ name: "grade_submission", arguments: { assignmentId: 32, userId: 7, grade: "150" } });
    assert.equal(refused.isError, true);
    assert.match(JSON.stringify(refused.content), /Could not save grade\..*within the assignment's range/);
    await refusing.context.close();

    const plain = await connect(moodle(false).state);
    const noComments = await plain.client.callTool({ name: "grade_submission", arguments: { assignmentId: 33, userId: 7, grade: "9", feedback: "<p>x</p>" } });
    assert.match(JSON.stringify(noComments.content), /has no feedback comments/);
    const tool = (await plain.client.listTools()).tools.find((t) => t.name === "grade_submission");
    assert.equal(tool?.annotations?.readOnlyHint, false);
    assert.equal(tool?.annotations?.idempotentHint, true);
    await plain.context.close();
  });
});
