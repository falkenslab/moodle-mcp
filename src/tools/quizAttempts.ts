// The quiz tools: one file for six tools that share the question and detail schemas.
import { z } from "zod";
import { answerQuizQuestions, finishQuizAttempt, quizInfo, readAttempt, readReview, startQuizAttempt } from "../driver.js";
import { personByName, text } from "../people.js";
import { onSite } from "./reply.js";
import type { RegisterTool } from "./types.js";

const quizId = z.number().int().positive().describe("The quiz's id (course module id), as get_course_structure gives it");
const attemptId = z.number().int().positive().describe("The attempt's id, as start_quiz_attempt or get_quiz_info gives it");
const detail = z.object({ label: z.string(), value: z.string() });

const field = z.object({
  name: z.string().describe("The field's form name: answer_quiz_questions takes it"),
  kind: z.enum(["choice", "checkbox", "text", "select"]).describe('choice: one of the options; checkbox: "1" ticked or "0"; text: free text or a number; select: one of the options'),
  label: z.string().optional().describe("A checkbox's option text, or a select's prompt (a matching question's item)"),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  value: z.string().optional().describe("The current answer"),
});

const question = z.object({
  slot: z.number().int(),
  page: z.number().int().optional(),
  number: z.string().optional(),
  type: z.string().describe('Moodle\'s question type: "truefalse", "multichoice", "shortanswer", "numerical", "match"…'),
  state: z.string().describe('"notyetanswered", "answersaved"… in an attempt; "correct", "incorrect", "partiallycorrect", "notanswered"… in a review'),
  mark: z.string().optional().describe("As Moodle shows it"),
  text: z.string(),
  images: z.array(z.string()).describe("Images in the question text"),
  fields: z.array(field),
  feedback: z.string().optional(),
  rightAnswer: z.string().optional(),
  comment: z.string().optional().describe("In a review: the teacher's comment, when graded by hand"),
});

const summaryRow = z.object({
  slot: z.number().int(),
  number: z.string(),
  state: z.string().describe('Moodle\'s state: "answersaved", "notyetanswered"…'),
  status: z.string().describe("The status as the summary says it, in the site's language"),
});

// Where an attempt is, page by page as a person goes (moodle-driver 0.16): each page read is a view Moodle logs.
const attemptPage = {
  attemptId: z.number().int(),
  page: z.number().int().optional().describe("The page shown, from 0; missing at the summary"),
  pages: z.number().int().describe("How many pages the attempt has"),
  questions: z.array(question).describe("That page's questions; empty at the summary"),
  summary: z.array(summaryRow).optional().describe("At the summary, after the last page: each question's status. finish_quiz_attempt submits from there"),
};

const reply = <T extends Record<string, unknown>>(output: T) => ({ content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output });

export const registerGetQuizInfo: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_quiz_info",
    {
      title: "Get a quiz's information and my attempts",
      description: "Read a quiz's page as the person: description, its rules (attempts allowed, grading method, time limit…), dates, overall feedback, the person's attempts (with their ids, in progress or finished, and grades) and whether they can start one now.",
      inputSchema: { quizId },
      outputSchema: {
        intro: z.string(),
        info: z.array(z.string()).describe("The quiz's rules as its page lists them"),
        dates: z.array(detail),
        feedback: z.string().optional(),
        attempts: z.array(z.object({ id: z.number().int().describe("The attempt's id, which get_quiz_attempt and get_attempt_review take"), inProgress: z.boolean(), details: z.array(detail) })),
        canStart: z.boolean().describe("Whether an attempt can be started or continued now"),
        messages: z.array(z.string()),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ quizId }) => reply({ ...(await quizInfo(...(await onSite(config, browser)), quizId)) }),
  );
};

export const registerStartQuizAttempt: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "start_quiz_attempt",
    {
      title: "Start or continue a quiz attempt",
      description:
        "Start an attempt at a quiz, or continue the one in progress, as the quiz page's button does; returns the attempt's id, how many pages it has, and the page it opens on: its questions with their fields and options. The other pages come from get_quiz_attempt (page) or after answer_quiz_questions. Starting uses up one of the attempts allowed, and a time limit starts running: confirm with the person first.",
      inputSchema: { quizId },
      outputSchema: { changed: z.string(), ...attemptPage },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ quizId }) => reply(await startQuizAttempt(...(await onSite(config, browser)), quizId)),
  );
};

export const registerGetQuizAttempt: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_quiz_attempt",
    {
      title: "Read a page of an attempt",
      description:
        "Read one page of an attempt in progress: its questions' text, images, fields with their options, and the answers saved so far, with how many pages the attempt has. Without page, the page the attempt is on. Moodle logs each page read as a view, as it does a person's: read the pages you need.",
      inputSchema: { attemptId, page: z.number().int().min(0).optional().describe("The page to read, from 0; without it, the page the attempt is on") },
      outputSchema: attemptPage,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ attemptId, page }) => reply(await readAttempt(...(await onSite(config, browser)), attemptId, page === undefined ? {} : { page })),
  );
};

export const registerAnswerQuizQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "answer_quiz_questions",
    {
      title: "Answer quiz questions",
      description:
        'Save answers in an attempt in progress, as the attempt\'s pages do; it doesn\'t finish the attempt. Each answer names a question\'s slot and its fields by name with the value to give: an option\'s value for choice and select fields, "1" or "0" for checkboxes, text for text fields; answers on several pages are saved page by page. Returns where that leaves the attempt: the next page with its questions, or after the last page the summary with each question\'s status, ready for finish_quiz_attempt. With the realistic trail it pauses to read each page first.',
      inputSchema: {
        attemptId,
        answers: z.array(z.object({ slot: z.number().int(), responses: z.record(z.string(), z.string()).describe("Field name → value, as get_quiz_attempt gives the fields") })).min(1),
      },
      outputSchema: { changed: z.string(), ...attemptPage },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ attemptId, answers }, extra) => {
      // Clients that pass a progress token keep waiting while the reading pause reports progress.
      const progressToken = extra._meta?.progressToken;
      const onProgress = (elapsed: number, total: number) => {
        if (progressToken !== undefined) void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: elapsed, total, message: "Reading the questions" } }).catch(() => undefined);
      };
      return reply(await answerQuizQuestions(...(await onSite(config, browser)), attemptId, answers, { trail: config.trail, onProgress }));
    },
  );
};

export const registerFinishQuizAttempt: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "finish_quiz_attempt",
    {
      title: "Submit a quiz attempt",
      description:
        "Submit an attempt for grading, as \"Submit all and finish\" does: no answer can change afterwards. Returns the review when the quiz shows it. Final: confirm with the person first, after checking the answers with get_quiz_attempt.",
      inputSchema: { attemptId },
      outputSchema: { changed: z.string(), attemptId: z.number().int(), finished: z.boolean(), review: z.object({ summary: z.array(detail), questions: z.array(question) }).optional() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ attemptId }) => reply(await finishQuizAttempt(...(await onSite(config, browser)), attemptId)),
  );
};

export const registerGetAttemptReview: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_attempt_review",
    {
      title: "Review a finished attempt",
      description:
        "Read a finished attempt's review, as far as the quiz shows it: status, marks and grade, and per question whether it was right, the mark, feedback and the right answer. Someone else's attempt (a teacher's view) names them by alias, and their written answers are redacted, when the server pseudonymizes.",
      inputSchema: { attemptId },
      outputSchema: { summary: z.array(detail), questions: z.array(question) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ attemptId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const review = await readReview(context, siteUrl, attemptId);
      // Someone else's attempt starts with their picture and name, a row without a label.
      const summary = await Promise.all(review.summary.map(async (d) => (d.label === "" ? { ...d, value: await personByName(config, context, siteUrl, d.value) } : d)));
      const questions = await Promise.all(
        review.questions.map(async (q) => ({
          ...q,
          fields: await Promise.all(q.fields.map(async (f) => (f.value === undefined ? f : { ...f, value: await text(config, siteUrl, f.value) }))),
          ...(q.feedback !== undefined && { feedback: await text(config, siteUrl, q.feedback) }),
        })),
      );
      return reply({ summary, questions });
    },
  );
};
