// Activities as the person does them: manual completion, choices, lessons and H5P activities.
import { z } from "zod";
import { answerChoice, answerLessonPage, getChoice, h5pActivity, lessonPage, setCompletion } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const activityId = z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it");

export const registerSetCompletion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_completion",
    {
      title: "Mark an activity as done",
      description:
        "Mark the person's own completion of an activity with manual completion, done or not done, as its \"Mark as done\" button does. Activities that complete on their own (by viewing, grade, submission) can't be marked: Moodle says so. Doing it twice changes nothing.",
      inputSchema: { activityId, done: z.boolean() },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId: id, done }) => reply(await setCompletion(...(await onSite(config, browser)), id, done)),
  );
};

const choice = z.object({
  id: z.number().int(),
  name: z.string(),
  intro: z.string(),
  options: z.array(z.object({ id: z.number().int().describe("The id answer_choice takes"), text: z.string(), selected: z.boolean(), full: z.boolean().describe("Full options can't be chosen") })),
  multiple: z.boolean().describe("Several options can be chosen at once"),
  canAnswer: z.boolean().describe("The choice is open and the person may answer (or change their answer)"),
  canChange: z.boolean(),
  answer: z.array(z.string()).describe("The options the person chose"),
  messages: z.array(z.string()).describe("The page's notices: closed, not open yet…"),
});

export const registerGetChoice: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_choice",
    {
      title: "Read a choice",
      description: "Read a choice activity (a poll) as the person sees it: its question, the options with their ids, whether it's open, whether several can be chosen and whether the answer can change, and the person's answer.",
      inputSchema: { activityId },
      outputSchema: choice.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId: id }) => reply(await getChoice(...(await onSite(config, browser)), id)),
  );
};

export const registerAnswerChoice: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "answer_choice",
    {
      title: "Answer a choice",
      description: "Answer a choice activity as the person, with one option (several where the choice allows them) by id from get_choice, as \"Save my choice\" does. Returns the choice afterwards. Answers as the person, and some choices don't allow changing it: confirm with the person first.",
      inputSchema: { activityId, optionIds: z.array(z.number().int().positive()).min(1) },
      outputSchema: { changed: z.string(), choice },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId: id, optionIds }) => reply(await answerChoice(...(await onSite(config, browser)), id, optionIds)),
  );
};

const lessonPageSchema = z.object({
  kind: z.enum(["content", "question", "feedback", "end"]),
  pageId: z.number().int().optional().describe("The page's id; for feedback, the page it goes on to (-9 is the end)"),
  title: z.string().optional(),
  text: z.string().describe("The page as shown: its content, the question, Moodle's messages, the score at the end"),
  buttons: z.array(z.object({ label: z.string(), jumpTo: z.number().int() })).optional().describe("A content page's buttons"),
  fields: z
    .array(
      z.object({
        name: z.string().describe("The field's form name: answer_lesson_page's responses take it"),
        kind: z.enum(["choice", "checkbox", "text", "select"]),
        label: z.string().optional(),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      }),
    )
    .optional()
    .describe("A question page's inputs"),
  feedback: z.object({ correct: z.boolean().optional(), response: z.string().optional() }).optional(),
});

export const registerGetLessonPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_lesson_page",
    {
      title: "Read the current lesson page",
      description: "Read the page of a lesson the person is on (starting the lesson the first time): a content page with its buttons, a question with its fields, or the end with the score. Answer it with answer_lesson_page.",
      inputSchema: { activityId },
      outputSchema: lessonPageSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId: id }) => reply(await lessonPage(...(await onSite(config, browser)), id)),
  );
};

export const registerAnswerLessonPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "answer_lesson_page",
    {
      title: "Answer a lesson page",
      description:
        "Go on in a lesson as the person: press a content page's button (by its label, or by its position from 1), or answer a question page's fields by name (an option's value for choice and select, text for text). Returns Moodle's feedback, if any, and the next page; reaching the end ends the attempt. Answers count towards the lesson's grade and can't be taken back. With the realistic trail it pauses to read the page first.",
      inputSchema: {
        activityId,
        button: z.string().min(1).optional().describe("A content page's button, by its label"),
        buttonPosition: z.number().int().positive().optional().describe("Or by its position, from 1"),
        responses: z.record(z.string(), z.string()).optional().describe("A question page's answers: field name → value, as get_lesson_page gives the fields"),
      },
      outputSchema: { changed: z.string(), feedback: lessonPageSchema.optional(), page: lessonPageSchema },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ activityId: id, button, buttonPosition, responses }, extra) => {
      if ([button, buttonPosition, responses].filter((x) => x !== undefined).length !== 1) throw new Error("Give one of button, buttonPosition or responses.");
      // Clients that pass a progress token keep waiting while the reading pause reports progress.
      const progressToken = extra._meta?.progressToken;
      const onProgress = (elapsed: number, total: number) => {
        if (progressToken !== undefined) void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: elapsed, total, message: "Reading the page" } }).catch(() => undefined);
      };
      // The driver counts buttons from 0.
      const answer = responses ? { responses } : { button: buttonPosition !== undefined ? buttonPosition - 1 : button };
      return reply(await answerLessonPage(...(await onSite(config, browser)), id, answer, { trail: config.trail, onProgress }));
    },
  );
};

export const registerGetH5PActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_h5p_activity",
    {
      title: "Read an H5P activity",
      description:
        "Read an H5P activity: its content type (the H5P library), whether Moodle tracks attempts, and the person's own attempts with their scores. Solving the content itself (it runs in a player) is for the browser fallback tools.",
      inputSchema: { activityId },
      outputSchema: {
        id: z.number().int(),
        name: z.string(),
        contentType: z.object({ library: z.string(), version: z.string() }).optional(),
        tracked: z.boolean(),
        attempts: z.array(z.object({ id: z.number().int().optional(), number: z.number().int(), score: z.number().optional(), maxScore: z.number().optional(), completed: z.boolean().optional(), passed: z.boolean().optional() })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId: id }) => reply(await h5pActivity(...(await onSite(config, browser)), id)),
  );
};
