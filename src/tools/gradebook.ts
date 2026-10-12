// The gradebook setup tools: categories and grade items, never anyone's grades.
import { z } from "zod";
import { GRADE_AGGREGATIONS, addGradeCategory, addGradeItem, deleteGradeCategory, deleteGradeItem, gradebookSetup, updateGradeCategory, updateGradeItem } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const aggregation = z.enum(GRADE_AGGREGATIONS);

const category = z.object({
  id: z.number().int().describe("The category's id, which update_grade_item and add_grade_category take"),
  itemId: z.number().int().describe("The category total's grade item"),
  name: z.string(),
  parentId: z.number().int().optional(),
  aggregation: aggregation.optional(),
  maxGrade: z.number().optional(),
  weight: z.number().optional().describe("Its weight in its parent, in percent"),
});

const item = z.object({
  id: z.number().int().describe("The grade item's id, which update_grade_item takes"),
  name: z.string(),
  categoryId: z.number().int().optional(),
  type: z.string().describe('The module ("assign", "quiz"…), or "manual" for an item made in the gradebook'),
  maxGrade: z.number().optional(),
  weight: z.number().optional().describe("In percent, where the category aggregates with weights"),
  weightOverridden: z.boolean(),
});

const courseId = z.number().int().positive();

export const registerGetGradebookSetup: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_gradebook_setup",
    {
      title: "Get a course's gradebook setup",
      description: "Read how a course's grades are computed, as the gradebook setup page shows it: its categories (aggregation, weight, maximum) and grade items (category, maximum, weight). No one's grades.",
      inputSchema: { courseId },
      outputSchema: { categories: z.array(category), items: z.array(item) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply(await gradebookSetup(...(await onSite(config, browser)), id)),
  );
};

export const registerUpdateGradeItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_grade_item",
    {
      title: "Update a grade item",
      description:
        "Change a grade item from get_gradebook_setup: move it into a category, set its weight (percent, overriding the automatic one) or a manual item's maximum grade (an activity's is set in the activity). Returns the item afterwards. Changes how grades are computed: confirm with the person first.",
      inputSchema: {
        courseId,
        itemId: z.number().int().positive(),
        category: z.number().int().positive().optional().describe("The category to move it into"),
        weight: z.number().min(0).optional().describe("Percent"),
        maxGrade: z.number().positive().optional(),
      },
      outputSchema: { changed: z.string(), item: item.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, itemId, ...input }) => reply(await updateGradeItem(...(await onSite(config, browser)), id, itemId, input)),
  );
};

export const registerAddGradeCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_grade_category",
    {
      title: "Add a grade category",
      description: "Add a grade category to a course's gradebook, at the top level or inside another, with its aggregation. Returns it as the setup shows it. Changes how grades are computed: confirm with the person first.",
      inputSchema: { courseId, name: z.string().min(1), aggregation: aggregation.optional(), parentId: z.number().int().positive().optional().describe("The category to put it in; the course's top level when missing") },
      outputSchema: { changed: z.string(), category: category.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, ...input }) => reply(await addGradeCategory(...(await onSite(config, browser)), id, input)),
  );
};

export const registerAddGradeItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_grade_item",
    {
      title: "Add a manual grade item",
      description: "Add a grade item graded in the gradebook (not by an activity): out of maxGrade (Moodle's default 100) or on a scale, at the top level or in a category, optionally hidden from students. Returns it as the setup shows it. Changes how grades are computed: confirm with the person first.",
      inputSchema: {
        courseId,
        name: z.string().min(1),
        maxGrade: z.number().positive().optional(),
        scaleId: z.number().int().positive().optional().describe("A scale instead of points"),
        categoryId: z.number().int().positive().optional().describe("The category to put it in, as get_gradebook_setup gives it"),
        hidden: z.boolean().optional(),
      },
      outputSchema: { changed: z.string(), item: item.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId: id, ...input }) => reply(await addGradeItem(...(await onSite(config, browser)), id, input)),
  );
};

export const registerUpdateGradeCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_grade_category",
    {
      title: "Update a grade category",
      description: "Change a grade category from get_gradebook_setup: its name, aggregation, weight in its parent (percent, overriding the automatic one), or move it into another category. Returns it afterwards. Changes how grades are computed: confirm with the person first.",
      inputSchema: {
        courseId,
        categoryId: z.number().int().positive(),
        name: z.string().min(1).optional(),
        aggregation: aggregation.optional(),
        weight: z.number().min(0).optional().describe("Percent"),
        parentId: z.number().int().positive().optional().describe("The category to move it into"),
      },
      outputSchema: { changed: z.string(), category: category.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, categoryId, ...input }) => reply(await updateGradeCategory(...(await onSite(config, browser)), id, categoryId, input)),
  );
};

export const registerDeleteGradeCategory: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_grade_category",
    {
      title: "Delete a grade category",
      description: "Delete a grade category: Moodle moves what it held into its parent and deletes its total's grades; the course's own category can't be deleted. Can't be undone: confirm with the person first.",
      inputSchema: { courseId, categoryId: z.number().int().positive() },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, categoryId }) => reply(await deleteGradeCategory(...(await onSite(config, browser)), id, categoryId)),
  );
};

export const registerDeleteGradeItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_grade_item",
    {
      title: "Delete a manual grade item",
      description: "Delete a manual grade item and every grade in it. An activity's item goes with its activity, so it's refused. Can't be undone: confirm with the person first.",
      inputSchema: { courseId, itemId: z.number().int().positive() },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, itemId }) => reply(await deleteGradeItem(...(await onSite(config, browser)), id, itemId)),
  );
};
