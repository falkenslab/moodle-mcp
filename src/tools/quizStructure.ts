// get_quiz_structure and add_questions_to_quiz: a quiz's questions as its edit page lists them.
import { z } from "zod";
import { addQuestionsToQuiz, quizStructure } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const quizId = z.number().int().positive().describe("The quiz's id (course module id), as get_course_structure gives it");

const structure = {
  quiz: z.object({ id: z.number().int() }),
  slots: z.array(
    z.object({
      id: z.number().int().describe("The slot's id"),
      slot: z.number().int().describe("Its place in the quiz, from 1: what the slot tools take"),
      number: z.number().int().optional().describe("The question's number in the quiz"),
      page: z.number().int(),
      questionId: z.number().int().optional().describe("None for a random question"),
      type: z.string().describe('The question type, or "random"'),
      name: z.string(),
      mark: z.string().optional(),
    }),
  ),
  sections: z.array(z.object({ id: z.number().int(), heading: z.string(), firstSlot: z.number().int(), shuffle: z.boolean() })).describe("The quiz's sections, each from its first slot"),
};

export const registerGetQuizStructure: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_quiz_structure",
    {
      title: "Get a quiz's questions",
      description: "List a quiz's questions as its edit page does, in order: each slot's page, question id, type (or random), name and mark. Teachers only.",
      inputSchema: { quizId },
      outputSchema: structure,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ quizId: id }) => reply(await quizStructure(...(await onSite(config, browser)), id)),
  );
};

export const registerAddQuestionsToQuiz: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_questions_to_quiz",
    {
      title: "Add questions to a quiz",
      description:
        "Add questions to a quiz: bank questions by id (from list_questions) and/or random questions from a bank category, at the end or on a given page. A quiz that has been attempted can't change its questions: Moodle refuses. Returns the quiz's structure afterwards. Changes the quiz: confirm with the person first.",
      inputSchema: {
        quizId,
        questionIds: z.array(z.number().int().positive()).optional().describe("Bank questions, as list_questions gives them"),
        random: z
          .object({
            categoryId: z.number().int().positive().describe("The bank category, as list_questions gives it"),
            count: z.number().int().positive(),
            includeSubcategories: z.boolean().optional(),
          })
          .optional()
          .describe("Random questions drawn from a category"),
        page: z.number().int().positive().optional().describe("The page to add them to; the last when missing"),
      },
      outputSchema: { changed: z.string(), ...structure },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ quizId: id, ...input }) => {
      if (!input.questionIds?.length && !input.random) throw new Error("Give questionIds, random, or both.");
      return reply(await addQuestionsToQuiz(...(await onSite(config, browser)), id, input));
    },
  );
};
