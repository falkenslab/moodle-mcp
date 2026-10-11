// The quiz tools: one file for six tools that share the question and detail schemas.
import { z } from "zod";
import { answerQuizQuestions, finishQuizAttempt, quizInfo, readAttempt, readReview, startQuizAttempt } from "@falkenslab/moodle-driver";
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
});

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
        "Start an attempt at a quiz, or continue the one in progress, as the quiz page's button does; returns the attempt's id and its questions with their fields and options. Starting uses up one of the attempts allowed, and a time limit starts running: confirm with the person first.",
      inputSchema: { quizId },
      outputSchema: { attemptId: z.number().int(), questions: z.array(question) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ quizId }) => reply(await startQuizAttempt(...(await onSite(config, browser)), quizId)),
  );
};

export const registerGetQuizAttempt: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_quiz_attempt",
    {
      title: "Read an attempt's questions",
      description: "Read every question of an attempt in progress, page by page: text, images, fields with their options, and the answers saved so far.",
      inputSchema: { attemptId },
      outputSchema: { attemptId: z.number().int(), questions: z.array(question) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ attemptId }) => reply({ attemptId, questions: await readAttempt(...(await onSite(config, browser)), attemptId) }),
  );
};

export const registerAnswerQuizQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "answer_quiz_questions",
    {
      title: "Answer quiz questions",
      description:
        'Save answers in an attempt in progress, as the attempt\'s pages do; it doesn\'t finish the attempt. Each answer names a question\'s slot and its fields by name with the value to give: an option\'s value for choice and select fields, "1" or "0" for checkboxes, text for text fields. Returns the questions with their saved answers. With the realistic trail it pauses to read each page first.',
      inputSchema: {
        attemptId,
        answers: z.array(z.object({ slot: z.number().int(), responses: z.record(z.string(), z.string()).describe("Field name → value, as get_quiz_attempt gives the fields") })).min(1),
      },
      outputSchema: { attemptId: z.number().int(), questions: z.array(question) },
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
      outputSchema: { attemptId: z.number().int(), finished: z.boolean(), review: z.object({ summary: z.array(detail), questions: z.array(question) }).optional() },
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
