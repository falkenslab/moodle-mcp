// A question bank's categories, and its questions exported to a file.
import { z } from "zod";
import { addQuestionCategory, deleteQuestionCategory, editQuestionCategory, exportQuestions, moveQuestions, questionCategories } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const bankId = z.number().int().positive().describe("The bank's id, as list_question_banks gives it (on Moodle 4.x, the course's id)");
const categoryId = z.number().int().positive().describe("The category's id, as list_question_categories gives it");
const category = z.object({
  id: z.number().int(),
  name: z.string(),
  parentId: z.number().int().describe("The category it's in: the bank's hidden Top for a top-level one"),
  description: z.string().describe("HTML"),
  questionCount: z.number().int().describe("Questions directly in it, not in its subcategories"),
});
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerListQuestionCategories: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_question_categories",
    {
      title: "List a question bank's categories",
      description: "List a question bank's categories as its categories page shows them, parents before their subcategories: id, name, parent, description and how many questions are directly in each. The bank's hidden Top is the top-level ones' parentId. Takes managing the bank's categories (a teacher's).",
      inputSchema: { bankId },
      outputSchema: { categories: z.array(category) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bankId: id }) => reply({ categories: await questionCategories(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddQuestionCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_question_category",
    {
      title: "Add a category to a question bank",
      description: "Add a category to a question bank, at the top level or inside parentId, with an optional description (HTML). Returns the category. Changes the bank: confirm with the person first.",
      inputSchema: { bankId, name: z.string().min(1), parentId: z.number().int().positive().optional(), description: z.string().optional() },
      outputSchema: { changed: z.string(), category },
      annotations: writes,
    },
    async ({ bankId: id, ...input }) => reply(await addQuestionCategory(...(await onSite(config, browser)), id, input)),
  );
};

export const registerEditQuestionCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_question_category",
    {
      title: "Rename or move a question category",
      description: "Change a question bank's category: its name, description (HTML) or parent (moving it with its subcategories and questions; the bank's Top moves it to the top level). Only what is given changes. Changes the bank: confirm with the person first.",
      inputSchema: { bankId, categoryId, name: z.string().min(1).optional(), description: z.string().optional(), parentId: z.number().int().positive().optional() },
      outputSchema: { changed: z.string(), category },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ bankId: id, categoryId: which, ...changes }) => reply(await editQuestionCategory(...(await onSite(config, browser)), id, which, changes)),
  );
};

export const registerDeleteQuestionCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_question_category",
    {
      title: "Delete a question category",
      description: "Delete a question bank's category: its subcategories move up to its parent; one with questions needs moveTo, the category its questions go to. Moodle keeps a bank's last top-level category. Confirm with the person first.",
      inputSchema: { bankId, categoryId, moveTo: z.number().int().positive().optional().describe("Where its questions go, when it has any") },
      outputSchema: { changed: z.string() },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ bankId: id, categoryId: which, moveTo }) => reply(await deleteQuestionCategory(...(await onSite(config, browser)), id, which, { moveTo })),
  );
};

export const registerMoveQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "move_questions",
    {
      title: "Move questions to another category",
      description: "Move questions of a bank into one of its categories, several at once; each keeps its id and versions. Changes the bank: confirm with the person first.",
      inputSchema: { bankId, questionIds: z.array(z.number().int().positive()).min(1).describe("As list_questions gives them"), categoryId },
      outputSchema: { changed: z.string(), questionIds: z.array(z.number().int()), categoryId: z.number().int() },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ bankId: id, questionIds, categoryId: to }) => reply(await moveQuestions(...(await onSite(config, browser)), id, questionIds, to)),
  );
};

export const registerExportQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "export_questions",
    {
      title: "Export a bank's questions to a file",
      description:
        "Save a bank's questions, or a category's with its subcategories, to a local GIFT or Moodle XML file: each question's latest version, hidden ones left out, with their categories, so import_questions recreates them. validate_gift reads a GIFT export back.",
      inputSchema: { bankId, format: z.enum(["gift", "xml"]), categoryId: z.number().int().positive().optional().describe("Only this category; the whole bank when missing"), file: z.string().min(1).describe("An absolute local path (replaced if it's there)") },
      outputSchema: { path: z.string(), name: z.string(), size: z.number().int(), contentType: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ bankId: id, ...options }) => reply(await exportQuestions(...(await onSite(config, browser)), id, options)),
  );
};
