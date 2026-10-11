// The gradebook setup tools: categories and grade items, never anyone's grades.
import { z } from "zod";
import { GRADE_AGGREGATIONS, addGradeCategory, gradebookSetup, updateGradeItem } from "@falkenslab/moodle-driver";
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
