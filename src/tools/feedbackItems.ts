// A feedback activity's questions (items) and templates, as its teacher builds them.
import { z } from "zod";
import { FEEDBACK_ITEM_TYPES, addFeedbackItem, deleteFeedbackItem, deleteFeedbackTemplate, editFeedbackItem, feedbackItems, feedbackTemplates, moveFeedbackItem, saveFeedbackTemplate, useFeedbackTemplate, type FeedbackItemInput } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const feedbackId = z.number().int().positive().describe("The feedback's id (course module id), as get_course_structure gives it");
const itemId = z.number().int().positive().describe("The item's id, as get_feedback_items gives it");
const range = z.object({ from: z.number().optional(), to: z.number().optional() });
const dependsOn = z.object({ itemId: z.number().int(), value: z.string() });

const item = z.object({
  id: z.number().int(),
  type: z.enum(FEEDBACK_ITEM_TYPES),
  position: z.number().int(),
  question: z.string().describe("Empty for a label or a page break"),
  label: z.string().optional().describe("Its short name in reports and dependencies"),
  required: z.boolean(),
  options: z.array(z.object({ text: z.string(), weight: z.number().optional() })).optional(),
  display: z.enum(["radio", "checkbox", "dropdown"]).optional(),
  horizontal: z.boolean().optional(),
  hideNotSelected: z.boolean().optional(),
  ignoreEmpty: z.boolean().optional(),
  range: range.optional().describe("A numeric item's"),
  info: z.enum(["response-time", "course", "category"]).optional().describe("An information item's kind"),
  contents: z.string().optional().describe("A label's (HTML)"),
  dependsOn: dependsOn.optional().describe("Shown only when that item was answered with this value"),
});

const itemInputs = {
  question: z.string().optional().describe("Every type but a label and a page break needs one"),
  label: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ text: z.string(), weight: z.number().optional().describe("multichoicerated's") })).optional().describe("Choice items' options, in order; given, they replace them all"),
  display: z.enum(["radio", "checkbox", "dropdown"]).optional().describe("checkbox (several answers) for multichoice only"),
  horizontal: z.boolean().optional(),
  hideNotSelected: z.boolean().optional(),
  ignoreEmpty: z.boolean().optional(),
  range: range.optional().describe("A numeric item's; a bound left out is none"),
  info: z.enum(["response-time", "course", "category"]).optional(),
  contents: z.string().optional().describe("A label's (HTML)"),
  dependsOn: dependsOn.optional().describe("Show it only when another item was answered with this value: an item with a label, on an earlier page (a page break between them)"),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Any other field of the item's form, by name (itemsize, itemmaxlength…)"),
};
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerGetFeedbackItems: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_feedback_items",
    {
      title: "Read a feedback's questions",
      description: "Read a feedback activity's items as its teacher builds them, in order: type (multichoice, multichoicerated, textfield, textarea, numeric, info, label, captcha, pagebreak), position, question, whether required, a choice's options (with weights where rated) and display, a numeric range, a label's contents and the item it depends on.",
      inputSchema: { feedbackId },
      outputSchema: { items: z.array(item) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ feedbackId: id }) => reply({ items: await feedbackItems(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddFeedbackItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_feedback_item",
    {
      title: "Add a question to a feedback",
      description: "Add an item to a feedback activity, after item after (0: first; last without it): a question of any type with its options and settings, a label with its contents, or a page break or a CAPTCHA. Returns its id and the items in order. Changes the course: confirm with the person first.",
      inputSchema: { feedbackId, type: z.enum(FEEDBACK_ITEM_TYPES), ...itemInputs, after: z.number().int().min(0).optional().describe("The item it goes after (0: first)") },
      outputSchema: { changed: z.string(), itemId: z.number().int(), itemIds: z.array(z.number().int()) },
      annotations: writes,
    },
    async ({ feedbackId: id, ...input }) => reply(await addFeedbackItem(...(await onSite(config, browser)), id, input)),
  );
};

export const registerEditFeedbackItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_feedback_item",
    {
      title: "Change a feedback's question",
      description: "Change a feedback item with what is given: question, label, required, a choice's options (given, they replace them all) and settings, a numeric range, a label's contents, its dependency (removeDependency takes it away) and other fields. It keeps its type and place. Changes the course: confirm with the person first.",
      inputSchema: { feedbackId, itemId, ...itemInputs, removeDependency: z.boolean().optional() },
      outputSchema: { changed: z.string(), itemId: z.number().int() },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ feedbackId: id, itemId: which, removeDependency, ...changes }) => {
      if (removeDependency && changes.dependsOn) throw new Error("dependsOn is both given and removed.");
      const input: Partial<Omit<FeedbackItemInput, "type">> = { ...changes, ...(removeDependency && { dependsOn: null }) };
      return reply(await editFeedbackItem(...(await onSite(config, browser)), id, which, input));
    },
  );
};

export const registerMoveFeedbackItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "move_feedback_item",
    {
      title: "Move a feedback's question",
      description: "Move a feedback item to a position (from 1). Returns the items in order. Changes the course: confirm with the person first.",
      inputSchema: { feedbackId, itemId, position: z.number().int().positive() },
      outputSchema: { changed: z.string(), itemId: z.number().int(), itemIds: z.array(z.number().int()) },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ feedbackId: id, itemId: which, position }) => reply(await moveFeedbackItem(...(await onSite(config, browser)), id, which, position)),
  );
};

export const registerDeleteFeedbackItem: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_feedback_item",
    {
      title: "Delete a feedback's question",
      description: "Delete a feedback item; the answers people gave to it go with it. Returns the items left. Can't be undone: confirm with the person first.",
      inputSchema: { feedbackId, itemId },
      outputSchema: { changed: z.string(), itemId: z.number().int(), itemIds: z.array(z.number().int()) },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ feedbackId: id, itemId: which }) => reply(await deleteFeedbackItem(...(await onSite(config, browser)), id, which)),
  );
};

const template = z.object({ id: z.number().int(), name: z.string(), public: z.boolean().describe("The whole site's, not the course's own") });

export const registerListFeedbackTemplates: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_feedback_templates",
    {
      title: "List feedback templates",
      description: "List the templates a feedback activity can use: the course's own and the site's public ones.",
      inputSchema: { feedbackId },
      outputSchema: { templates: z.array(template) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ feedbackId: id }) => reply({ templates: await feedbackTemplates(...(await onSite(config, browser)), id) }),
  );
};

export const registerUseFeedbackTemplate: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "use_feedback_template",
    {
      title: "Use a template in a feedback",
      description: "Add a template's items to a feedback activity, after the items it has, or in their place with replace (their answers go with them). Returns the items. Changes the course: confirm with the person first.",
      inputSchema: { feedbackId, templateId: z.number().int().positive().describe("As list_feedback_templates gives it"), replace: z.boolean().optional() },
      outputSchema: { changed: z.string(), itemIds: z.array(z.number().int()) },
      annotations: writes,
    },
    async ({ feedbackId: id, templateId, replace }) => reply(await useFeedbackTemplate(...(await onSite(config, browser)), id, templateId, { replace })),
  );
};

export const registerSaveFeedbackTemplate: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "save_feedback_template",
    {
      title: "Save a feedback as a template",
      description: "Save a feedback activity's items as a new template: the course's own, or public (every course's, a manager's) with public. Returns its id. Confirm with the person first.",
      inputSchema: { feedbackId, name: z.string().min(1), public: z.boolean().optional() },
      outputSchema: { changed: z.string(), templateId: z.number().int() },
      annotations: writes,
    },
    async ({ feedbackId: id, name, public: isPublic }) => reply(await saveFeedbackTemplate(...(await onSite(config, browser)), id, name, { public: isPublic })),
  );
};

export const registerDeleteFeedbackTemplate: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_feedback_template",
    {
      title: "Delete a feedback template",
      description: "Delete a feedback template (a public one takes a manager's rights). Can't be undone: confirm with the person first.",
      inputSchema: { feedbackId, templateId: z.number().int().positive().describe("As list_feedback_templates gives it") },
      outputSchema: { changed: z.string(), templateId: z.number().int() },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ feedbackId: id, templateId }) => reply(await deleteFeedbackTemplate(...(await onSite(config, browser)), id, templateId)),
  );
};
