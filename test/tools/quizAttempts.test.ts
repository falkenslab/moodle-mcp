import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Route } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { readQuestions } from "@falkenslab/moodle-driver";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

// A made-up quiz (cmid 26) shaped like Moodle 5.2's pages: attempt 9, two pages, three questions.
const Q1 = `<div id="question-9-1" class="que truefalse deferredfeedback STATE1"><div class="info"><span class="qno">1</span><div class="grade">Marked out of 1.00</div>
<input type="hidden" name="q9:1_:flagged" value="0"></div><div class="qtext">The answer is true.</div>
<div class="answer"><div><input type="radio" name="q9:1_answer" value="1" id="q9:1_answertrue" CHECKED1><label id="q9:1_answertrue_label"><span class="answernumber">a. </span>True</label></div>
<div><input type="radio" name="q9:1_answer" value="0" id="q9:1_answerfalse"><label id="q9:1_answerfalse_label"><span class="answernumber">b. </span>False</label></div></div>
<input type="hidden" name="q9:1_:sequencecheck" value="1"></div>`;
const Q2 = `<div id="question-9-2" class="que multichoice deferredfeedback notyetanswered"><div class="info"><span class="qno">2</span></div><div class="qtext">Which are odd?</div>
<div class="answer"><div><input type="hidden" name="q9:2_choice0" value="0"><input type="checkbox" name="q9:2_choice0" value="1" id="q9:2_choice0"><div id="q9:2_choice0_label"><span class="answernumber">1. </span>Three</div></div>
<div><input type="hidden" name="q9:2_choice1" value="0"><input type="checkbox" name="q9:2_choice1" value="1" id="q9:2_choice1"><div id="q9:2_choice1_label"><span class="answernumber">2. </span>Two</div></div></div></div>`;
const Q3 = `<div id="question-9-3" class="que match deferredfeedback notyetanswered"><div class="info"><span class="qno">3</span></div><div class="qtext">Classify. <span class="accesshide">Answer question 3</span><img src="${SITE}pluginfile.php/1/question/questiontext/1/frog.png"></div>
<table><tr><td class="text">frog</td><td><select name="q9:3_sub0"><option value="0">Choose...</option><option value="1">mammal</option><option value="2">amphibian</option></select></td></tr></table>
<input type="text" name="q9:3_notes" value=""></div>`;

const nav = `<div id="mod_quiz_navblock"><a class="qnbutton" id="quiznavbutton1" data-quiz-page="0"></a><a class="qnbutton" id="quiznavbutton2" data-quiz-page="0"></a><a class="qnbutton" id="quiznavbutton3" data-quiz-page="1"></a></div>`;

function fakeQuiz() {
  const saved: URLSearchParams[] = [];
  let finished = false;
  const page = (body: string, bodyId: string) => moodlePage({ userId: 4, body, bodyId });
  const routes = async (context: BrowserContext) => {
    await context.route(`${SITE}mod/quiz/**`, (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());
      const html = (body: string) => route.fulfill({ status: 200, contentType: "text/html", body });
      const go = (to: string) => html(`<script>location.replace("${SITE}${to}")</script>`);
      switch (url.pathname) {
        case "/mod/quiz/view.php":
          return html(
            page(
              `<div id="region-main"><div id="intro">Practice quiz.</div><form method="post" action="${SITE}mod/quiz/startattempt.php"><input type="hidden" name="cmid" value="26"><button type="submit">Attempt quiz</button></form>
<div class="quizinfo"><p>Attempts allowed: 3</p><p>Grading method: Highest grade</p></div>
<div class="card"><table class="quizreviewsummary"><tr><th>Status</th><td>Finished</td></tr><tr><th>Grade</th><td>5.00 out of 10.00</td></tr></table><a href="${SITE}mod/quiz/review.php?attempt=8&amp;cmid=26">Review</a></div></div>`,
              "page-mod-quiz-view",
            ),
          );
        case "/mod/quiz/startattempt.php":
          return go("mod/quiz/attempt.php?attempt=9&cmid=26");
        case "/mod/quiz/attempt.php": {
          const p = url.searchParams.get("page") ?? "0";
          const last = saved.find((form) => form.has("q9:1_answer"));
          const q1 = Q1.replace("STATE1", last?.get("q9:1_answer") ? "answersaved" : "notyetanswered").replace("CHECKED1", last?.get("q9:1_answer") === "1" ? "checked" : "");
          const questions = p === "0" ? q1 + Q2 : Q3;
          return html(page(`<form id="responseform" method="post" action="${SITE}mod/quiz/processattempt.php?cmid=26"><input type="hidden" name="attempt" value="9">${questions}<input type="submit" name="next" value="Next page"></form>${nav}`, "page-mod-quiz-attempt"));
        }
        case "/mod/quiz/processattempt.php": {
          const form = new URLSearchParams(request.postData() ?? "");
          if (form.get("finishattempt") === "1") {
            finished = true;
            return go("mod/quiz/review.php?attempt=9&cmid=26");
          }
          saved.push(form);
          return go("mod/quiz/attempt.php?attempt=9&cmid=26&page=1");
        }
        case "/mod/quiz/summary.php":
          return html(page(`<form method="post" action="${SITE}mod/quiz/processattempt.php"><input type="hidden" name="attempt" value="9"><input type="hidden" name="finishattempt" value="1"><button type="submit">Submit all and finish</button></form>`, "page-mod-quiz-summary"));
        case "/mod/quiz/review.php":
          return html(
            page(
              `<table class="quizreviewsummary"><tr><th>Status</th><td>${finished ? "Finished" : "?"}</td></tr><tr><th>Marks</th><td>3.00/3.00</td></tr></table>${Q1.replace("STATE1", "correct").replace("CHECKED1", "checked").replace('_:sequencecheck" value="1"></div>', `_:sequencecheck" value="1"><div class="rightanswer">The correct answer is 'True'.</div></div>`)}`,
              "page-mod-quiz-review",
            ),
          );
        default:
          return route.continue();
      }
    });
  };
  return { saved, routes };
}

describe("readQuestions", { skip: !browser && "no system browser" }, () => {
  it("reads slots, types, states, text and fields with their options, without screen-reader text", async () => {
    const page = await browser!.newPage();
    await page.setContent(`<body>${Q1.replace("STATE1", "notyetanswered").replace("CHECKED1", "")}${Q2}${Q3}</body>`);
    const [q1, q2, q3] = await readQuestions(page);
    assert.deepEqual([q1?.slot, q1?.type, q1?.state, q1?.text], [1, "truefalse", "notyetanswered", "The answer is true."]);
    assert.deepEqual(q1?.fields, [{ name: "q9:1_answer", kind: "choice", options: [{ value: "1", label: "True" }, { value: "0", label: "False" }] }]);
    assert.deepEqual(q2?.fields.map((f) => [f.name, f.kind, f.label, f.value]), [
      ["q9:2_choice0", "checkbox", "Three", "0"],
      ["q9:2_choice1", "checkbox", "Two", "0"],
    ]);
    assert.equal(q3?.text, "Classify.");
    assert.deepEqual(q3?.images, [`${SITE}pluginfile.php/1/question/questiontext/1/frog.png`]);
    assert.deepEqual(q3?.fields[0], { name: "q9:3_sub0", kind: "select", label: "frog", options: [{ value: "0", label: "Choose..." }, { value: "1", label: "mammal" }, { value: "2", label: "amphibian" }], value: "0" });
    assert.deepEqual(JSON.parse(JSON.stringify(q3?.fields[1])), { name: "q9:3_notes", kind: "text" });
    await page.close();
  });
});

describe("quiz attempt tools", { skip: !browser && "no system browser" }, () => {
  async function connect() {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 4, fullName: "Student" } });
    const quiz = fakeQuiz();
    await quiz.routes(context);
    const server = createServer({ config: testConfig({ moodleUrl: SITE, trail: "fast" }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, saved: quiz.saved };
  }
  const call = async (client: Client, name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    return result.structuredContent as Record<string, unknown>;
  };

  it("reads the quiz's info and attempts", async () => {
    const { client, context } = await connect();
    const info = await call(client, "get_quiz_info", { quizId: 26 });
    assert.deepEqual(info.info, ["Attempts allowed: 3", "Grading method: Highest grade"]);
    assert.deepEqual(info.attempts, [{ attemptId: 8, inProgress: false, details: [{ label: "Status", value: "Finished" }, { label: "Grade", value: "5.00 out of 10.00" }] }]);
    assert.equal(info.canStart, true);
    await context.close();
  });

  it("starts, answers page by page, finishes and reviews", async () => {
    const { client, context, saved } = await connect();
    const started = await call(client, "start_quiz_attempt", { quizId: 26 });
    assert.equal(started.attemptId, 9);
    assert.deepEqual((started.questions as { slot: number; page: number }[]).map((q) => [q.slot, q.page]), [[1, 0], [2, 0], [3, 1]]);
    const answered = await call(client, "answer_quiz_questions", {
      attemptId: 9,
      answers: [
        { slot: 1, responses: { "q9:1_answer": "1" } },
        { slot: 2, responses: { "q9:2_choice0": "1", "q9:2_choice1": "0" } },
        { slot: 3, responses: { "q9:3_sub0": "2" } },
      ],
    });
    assert.equal(saved.length, 2);
    assert.equal(saved[0]?.get("q9:1_answer"), "1");
    assert.deepEqual(saved[0]?.getAll("q9:2_choice0"), ["0", "1"]);
    assert.equal(saved[1]?.get("q9:3_sub0"), "2");
    assert.equal((answered.questions as { state: string }[])[0]?.state, "answersaved");
    const done = await call(client, "finish_quiz_attempt", { attemptId: 9 });
    const review = done.review as { summary: { value: string }[]; questions: { state: string; rightAnswer?: string }[] };
    assert.equal(review.summary[0]?.value, "Finished");
    assert.equal(review.questions[0]?.state, "correct");
    assert.equal(review.questions[0]?.rightAnswer, "The correct answer is 'True'.");
    await context.close();
  });

  it("refuses an answer to a field the page doesn't have, saving nothing", async () => {
    const { client, context, saved } = await connect();
    const result = await client.callTool({ name: "answer_quiz_questions", arguments: { attemptId: 9, answers: [{ slot: 1, responses: { "q9:1_nonexistent": "1" } }] } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /no such field: q9:1_nonexistent/);
    assert.equal(saved.length, 0);
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    assert.equal(tools.get("finish_quiz_attempt")?.destructiveHint, true);
    for (const name of ["get_quiz_info", "get_quiz_attempt", "get_attempt_review"]) assert.equal(tools.get(name)?.readOnlyHint, true);
    await context.close();
  });
});
