// A quiz's questions as its edit page lists them, and the edit page's changes: adding questions, a slot's
// mark and place, removing one, pages and sections.
import { z } from "zod";
import { addQuestionsToQuiz, addQuizSection, editQuizSlot, quizStructure, removeQuizSlot, setQuizPages } from "@falkenslab/moodle-driver";
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

const slot = z.number().int().positive().describe("The slot's place in the quiz, from 1, as get_quiz_structure gives it");

export const registerEditQuizSlot: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_quiz_slot",
    {
      title: "Change a quiz question's mark or place",
      description:
        "Change one slot of a quiz: its maximum mark, and where it is (after another slot, 0 for first, and on a page), as the edit page does. After attempts, Moodle lets the mark change (it regrades them) but not the order. Returns the quiz's structure. Changes the quiz: confirm with the person first.",
      inputSchema: {
        quizId,
        slot,
        maxMark: z.number().min(0).optional(),
        moveAfter: z.number().int().min(0).optional().describe("Put it after this slot (0: first)"),
        page: z.number().int().positive().optional().describe("The page to put it on"),
      },
      outputSchema: { changed: z.string(), ...structure },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ quizId: id, slot: place, ...change }) => reply(await editQuizSlot(...(await onSite(config, browser)), id, place, change)),
  );
};

export const registerRemoveQuizSlot: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "remove_quiz_slot",
    {
      title: "Remove a question from a quiz",
      description: "Remove a slot from a quiz, as the edit page's delete icon does; the question stays in its bank. A quiz with attempts can't change its questions. Returns the quiz's structure. Confirm with the person first.",
      inputSchema: { quizId, slot },
      outputSchema: { changed: z.string(), ...structure },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ quizId: id, slot: place }) => reply(await removeQuizSlot(...(await onSite(config, browser)), id, place)),
  );
};

export const registerSetQuizPages: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_quiz_pages",
    {
      title: "Set a quiz's pages",
      description: "Set how a quiz's questions are split into pages: perPage questions a page (0 for all on one), as \"Repaginate\" does, or page breaks exactly after the slots in breaksAfter. Returns the quiz's structure. Changes the quiz: confirm with the person first.",
      inputSchema: {
        quizId,
        perPage: z.number().int().min(0).optional().describe("Questions per page; 0 for one page"),
        breaksAfter: z.array(z.number().int().positive()).optional().describe("Or: a page break after each of these slots, and nowhere else"),
      },
      outputSchema: { changed: z.string(), ...structure },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ quizId: id, perPage, breaksAfter }) => {
      if ((perPage === undefined) === (breaksAfter === undefined)) throw new Error("Give perPage or breaksAfter, one of them.");
      return reply(await setQuizPages(...(await onSite(config, browser)), id, perPage !== undefined ? { perPage } : { breaksAfter: breaksAfter! }));
    },
  );
};

export const registerAddQuizSection: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_quiz_section",
    {
      title: "Add a section to a quiz",
      description: "Add a section heading to a quiz, starting at a slot (the first of its page: see set_quiz_pages), optionally shuffling its questions. Returns the new section's id and the quiz's structure. Changes the quiz: confirm with the person first.",
      inputSchema: { quizId, firstSlot: slot, heading: z.string().min(1), shuffle: z.boolean().optional() },
      outputSchema: { changed: z.string(), sectionId: z.number().int(), ...structure },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ quizId: id, ...section }) => reply(await addQuizSection(...(await onSite(config, browser)), id, section)),
  );
};
