import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Route } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Made-up surveys shaped like Moodle 5.2's: a one-page questionnaire (cmid 33), a two-page feedback (cmid 34).
const QUESTIONNAIRE_FORM = `<form id="phpesp_response" method="post" action="${SITE}mod/questionnaire/complete.php?id=33">
<fieldset class="qn-container"><div class="qn-legend"><h2 class="qn-number">1</h2><img class="req" alt="Required"></div><div class="qn-question">Recommend?</div>
<input id="r1" type="radio" name="q2" value="y"><label for="r1">Yes</label><input id="r2" type="radio" name="q2" value="n"><label for="r2">No</label></fieldset>
<fieldset class="qn-container"><div class="qn-legend"><h2 class="qn-number">2</h2></div><div class="qn-question">Rate 1 to 3</div>
<table><tr class="raterow"><td>Content</td><td><input type="radio" name="q4_7" value="-999" checked><label class="accesshide">Row 1, Content: Unanswered.</label></td><td><input type="radio" name="q4_7" value="1"></td><td><input type="radio" name="q4_7" value="3"></td></tr></table></fieldset>
<input type="submit" name="submit" value="Submit questionnaire"></form>`;

const FEEDBACK_PAGES = [
  `<div class="feedback_itemlist"><div class="col-form-label"><p>Did you like it <i class="text-danger"></i><span class="visually-hidden">(Required field)</span></p></div>
<input type="hidden" name="multichoice_1" value="0"><label><input type="radio" name="multichoice_1" value="1"> A lot </label><label><input type="radio" name="multichoice_1" value="2"> Not much </label></div>
<input type="submit" name="gonextpage" value="Next page">`,
  `<div class="feedback_itemlist"><div class="col-form-label"><p>One word</p></div><input type="text" name="textfield_6"></div>
<input type="submit" name="gopreviouspage" value="Previous page"><input type="submit" name="savevalues" value="Submit your answers">`,
];

function fakeSurveys() {
  const posts: { path: string; form: URLSearchParams }[] = [];
  let submitted = false;
  const page = (body: string, bodyId: string) => moodlePage({ userId: 4, body, bodyId });
  const routes = async (context: BrowserContext) => {
    await context.route(/\/mod\/(questionnaire|feedback)\//, (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());
      const [, , type, file] = url.pathname.split("/") as [string, string, "questionnaire" | "feedback", string];
      const html = (body: string) => route.fulfill({ status: 200, contentType: "text/html", body });
      if (file === "view.php") {
        const body = submitted ? `<div class="alert">You have already submitted.</div>` : `<a href="${SITE}mod/${type}/complete.php?id=${url.searchParams.get("id")}">Answer the questions</a>`;
        return html(page(`<div id="region-main"><div class="activity-description">Tell us.</div>${body}</div>`, `page-mod-${type}-view`));
      }
      if (request.method() === "POST") {
        const form = new URLSearchParams(request.postData() ?? "");
        posts.push({ path: url.pathname, form });
        if (type === "questionnaire") {
          if (!form.get("q2")) return html(page(`<div id="region-main"><div class="alert alert-danger">Please answer required question #1.<button class="close">Dismiss this notification</button></div>${QUESTIONNAIRE_FORM}</div>`, "page-mod-questionnaire-complete"));
          submitted = true;
          return html(page(`<div id="region-main">Thank you</div>`, "page-mod-questionnaire-complete"));
        }
        if (form.has("gonextpage")) return html(page(`<form class="feedback_form mform" method="post" action="${SITE}mod/feedback/complete.php">${FEEDBACK_PAGES[1]}</form>`, "page-mod-feedback-complete"));
        submitted = true;
        return html(page(`<div id="region-main">Thank you</div>`, "page-mod-feedback-complete"));
      }
      if (type === "questionnaire") return html(page(`<div id="region-main">${QUESTIONNAIRE_FORM}</div>`, "page-mod-questionnaire-complete"));
      const p = Number(url.searchParams.get("gopage") ?? 0);
      return html(page(`<form class="feedback_form mform" method="post" action="${SITE}mod/feedback/complete.php">${FEEDBACK_PAGES[p] ?? ""}</form>`, "page-mod-feedback-complete"));
    });
  };
  return { posts, routes };
}

describe("get_survey and submit_survey", { skip: !browser && "no system browser" }, () => {
  async function connect() {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 4, fullName: "Student" } });
    const surveys = fakeSurveys();
    await surveys.routes(context);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, posts: surveys.posts };
  }
  const call = async (client: Client, name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    return { error: result.isError ? JSON.stringify(result.content) : undefined, out: result.structuredContent as Record<string, unknown> };
  };

  it("reads a questionnaire: required marks, choices, rating rows", async () => {
    const { client, context } = await connect();
    const { out } = await call(client, "get_survey", { activityId: 33, type: "questionnaire" });
    assert.equal(out.canAnswer, true);
    const [first, second] = out.questions as { text: string; required: boolean; fields: { name: string; label?: string; options?: { value: string; label: string }[] }[] }[];
    assert.deepEqual([first?.text, first?.required, first?.fields[0]?.options], ["Recommend?", true, [{ value: "y", label: "Yes" }, { value: "n", label: "No" }]]);
    assert.deepEqual([second?.required, second?.fields[0]?.label, second?.fields[0]?.options?.map((o) => o.label)], [false, "Content", ["(no answer)", "1", "3"]]);
    await context.close();
  });

  it("reads every page of a feedback, and submits it page by page", async () => {
    const { client, context, posts } = await connect();
    const { out } = await call(client, "get_survey", { activityId: 34, type: "feedback" });
    const questions = out.questions as { page: number; text: string; required: boolean; fields: { name: string; options?: { label: string }[] }[] }[];
    assert.deepEqual(questions.map((q) => [q.page, q.text, q.required, q.fields[0]?.name]), [[0, "Did you like it", true, "multichoice_1"], [1, "One word", false, "textfield_6"]]);
    assert.deepEqual(questions[0]?.fields[0]?.options?.map((o) => o.label), ["A lot", "Not much"]);
    const done = await call(client, "submit_survey", { activityId: 34, type: "feedback", responses: { multichoice_1: "1", textfield_6: "Great" } });
    assert.equal(done.error, undefined);
    // PHP keeps a name's last value: the hidden "0" goes first, the chosen radio after it.
    const last = (form: URLSearchParams, name: string) => form.getAll(name).at(-1) ?? null;
    assert.deepEqual(posts.map((p) => [last(p.form, "multichoice_1"), last(p.form, "textfield_6"), p.form.has("gonextpage"), p.form.has("savevalues")]), [["1", null, true, false], [null, "Great", false, true]]);
    assert.deepEqual(done.out.messages, ["You have already submitted."]);
    await context.close();
  });

  it("checks names before sending and returns Moodle's complaints", async () => {
    const { client, context, posts } = await connect();
    const unknown = await call(client, "submit_survey", { activityId: 33, type: "questionnaire", responses: { q9: "1" } });
    assert.match(unknown.error ?? "", /no field q9/);
    assert.equal(posts.length, 0);
    const missing = await call(client, "submit_survey", { activityId: 33, type: "questionnaire", responses: { q4_7: "3" } });
    assert.match(missing.error ?? "", /Please answer required question #1\./);
    assert.doesNotMatch(missing.error ?? "", /Dismiss/);
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    assert.equal(tools.get("submit_survey")?.destructiveHint, true);
    assert.equal(tools.get("get_survey")?.readOnlyHint, true);
    await context.close();
  });
});
