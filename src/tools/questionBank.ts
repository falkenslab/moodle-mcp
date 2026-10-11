// The question bank tools: banks, their questions, importing and creating questions.
import { z } from "zod";
import { QUESTION_TYPES, createQuestion, importQuestions, questionBanks, questions } from "@falkenslab/moodle-driver";
import { formSettings } from "./courseSettings.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const bankId = z.number().int().positive().describe("The bank's id (a course module id), as list_question_banks gives it");
const categoryId = z.number().int().positive().optional().describe("The bank category, as list_questions gives it; the bank's default when missing");

const question = z.object({
  id: z.number().int().describe("The question's id, which add_questions_to_quiz takes"),
  name: z.string(),
  type: z.string().describe('"multichoice", "truefalse", "shortanswer", "essay"…'),
  status: z.string().optional().describe('"ready" or "draft"'),
  version: z.string().optional(),
  categoryId: z.number().int(),
});

export const registerListQuestionBanks: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_question_banks",
    {
      title: "List a course's question banks",
      description:
        "List the question banks of a course: its shared banks (usable by any quiz in the course) and the activities' own banks (a quiz's, usable only there). Returns their ids, which list_questions, import_questions and create_question take.",
      inputSchema: { courseId: z.number().int().positive() },
      outputSchema: { banks: z.array(z.object({ id: z.number().int(), name: z.string(), type: z.string().describe('"qbank" for a shared bank, "quiz"… for an activity\'s own'), shared: z.boolean() })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => reply({ banks: await questionBanks(...(await onSite(config, browser)), courseId) }),
  );
};

export const registerListQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_questions",
    {
      title: "List a bank's questions",
      description: "List a question bank's categories and every question in them: id, name, type, status and category. Takes the bank id from list_question_banks.",
      inputSchema: { bankId },
      outputSchema: { categories: z.array(z.object({ id: z.number().int(), name: z.string() })), questions: z.array(question) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bankId: id }) => reply(await questions(...(await onSite(config, browser)), id)),
  );
};

export const registerImportQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_questions",
    {
      title: "Import questions into a bank",
      description:
        "Import questions into a question bank from GIFT or Moodle XML, given as text or as a local file, through the bank's import form: the way to add several at once. Moodle checks the whole file first: when it can't parse it, nothing is imported and its messages come back. Returns the questions created. Changes the bank: confirm with the person first.",
      inputSchema: {
        bankId,
        format: z.enum(["gift", "xml"]),
        text: z.string().min(1).optional().describe("The questions in that format"),
        file: z.string().optional().describe("Or an absolute path to a local file in that format"),
        categoryId,
      },
      outputSchema: { changed: z.string(), questions: z.array(question) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ bankId: id, ...input }) => {
      if ((input.text === undefined) === (input.file === undefined)) throw new Error("Give the questions either as text or as a file, one of them.");
      return reply(await importQuestions(...(await onSite(config, browser)), id, input));
    },
  );
};

export const registerCreateQuestion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_question",
    {
      title: "Create a question in a bank",
      description:
        "Create one question in a question bank through its type's form: multichoice, truefalse, shortanswer, numerical or essay. For several, import_questions is faster. Returns the new question's id. Changes the bank: confirm with the person first.",
      inputSchema: {
        bankId,
        type: z.enum(QUESTION_TYPES),
        name: z.string().min(1),
        text: z.string().min(1).describe("The question text (HTML)"),
        answers: z
          .array(
            z.object({
              text: z.string(),
              fraction: z.number().min(-1).max(1).describe("Its share of the mark: 1 right, 0 wrong, negatives as penalties (the nearest one Moodle offers)"),
              feedback: z.string().optional(),
              tolerance: z.number().min(0).optional().describe("Numerical answers: the error accepted"),
            }),
          )
          .optional()
          .describe("Multichoice, shortanswer and numerical answers"),
        correct: z.boolean().optional().describe("Truefalse: the right answer"),
        categoryId,
        defaultMark: z.number().positive().optional(),
        fields: formSettings.describe("Any other field of the type's form, by name"),
      },
      outputSchema: { changed: z.string(), questionId: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ bankId: id, ...input }) => reply(await createQuestion(...(await onSite(config, browser)), id, input)),
  );
};
