// create_activity and update_activity: the driver fills and submits Moodle's activity form.
import { z } from "zod";
import { ACTIVITY_VISIBILITIES, createActivity, updateActivity } from "@falkenslab/moodle-driver";
import { completionSchema, restrictionsSchema, toCompletion, toRestrictions } from "./conditions.js";
import { section } from "./getCourseStructure.js";
import { scormFields } from "./scorm.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const contentFields = {
  description: z.string().optional().describe("The description (HTML), shown on the activity's page"),
  content: z.string().optional().describe("A page's content, or a label's text (HTML)"),
  url: z.string().optional().describe("A URL resource's target"),
  visibility: z.enum(ACTIVITY_VISIBILITIES).optional().describe('"stealth": hidden from the course page but available by link, where the site allows it'),
  restrictions: restrictionsSchema.optional().describe("When students can open it ({ conditions: [] } removes them)"),
  completion: completionSchema.optional(),
  embed: z.array(z.string()).optional().describe('Absolute local files (images…) to embed in the HTML, which names each by its file name: <img src="shot.png">'),
  settings: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .describe('Any other form field by its name in Moodle\'s activity form, e.g. {"duedate[enabled]": true, "duedate[day]": 12, "grade[modgrade_point]": 10}'),
};

const resultSchema = {
  changed: z.string(),
  activityId: z.number().int().optional(),
  url: z.string().optional(),
  files: z.array(z.object({ name: z.string(), size: z.number() })).optional().describe("A file resource's or folder's files after the change"),
  sections: z.array(section).describe("The course's structure after the change"),
};

export const registerCreateActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_activity",
    {
      title: "Create an activity or resource",
      description:
        "Create an activity or resource of any type (page, label, url, resource, folder, assign, quiz, forum…) at the end of a section, through Moodle's own form, hidden from students by default. Common fields have their own inputs, access restrictions and completion included; any other setting goes in settings by its form field name. files are local paths uploaded to a file resource or folder, or a SCORM's package (type scorm, the first file). Returns the new activity's id and the course structure. Changes the course: confirm with the person first.",
      inputSchema: {
        courseId: z.number().int().positive(),
        sectionId: z.number().int().positive().describe("The section's id, as get_course_structure gives it"),
        type: z.string().regex(/^[a-z0-9_]+$/).describe("Moodle's module name: page, label, url, resource, folder, assign, quiz, forum, book…"),
        name: z.string().min(1).optional().describe("Required except for labels"),
        files: z.array(z.string()).optional().describe("Absolute local paths: a file resource's file (the first is the main one), a folder's files, a SCORM's package (.zip)"),
        ...contentFields,
      },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ restrictions, completion, ...input }) =>
      reply(await createActivity(...(await onSite(config, browser)), { ...input, ...(restrictions && { restrictions: toRestrictions(restrictions) }), ...(completion && { completion: toCompletion(completion) }) })),
  );
};

export const registerUpdateActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_activity",
    {
      title: "Update an activity's settings or content",
      description:
        "Change an existing activity through Moodle's own form: name, description, a page's or label's content, a URL's target, visibility, access restrictions, completion, a file resource's or folder's files (add, remove by their path as get_activity_settings lists them, or replace all), a SCORM's package (replaced in place: the activity keeps its id, settings and grade item; attempts stay in the SCOs the new package keeps, by their identifier, and go with the SCOs it drops), or any other setting by its form field name in settings. Only what is given changes. Returns the course structure, and a SCORM as get_scorm reads it after a new package. Changes the course: confirm with the person first.",
      inputSchema: {
        activityId: z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it"),
        name: z.string().min(1).optional(),
        ...contentFields,
        files: z
          .object({
            add: z.array(z.string()).optional().describe("Absolute local paths to add"),
            remove: z.array(z.string()).optional().describe("Paths in the activity, as get_activity_settings lists its files"),
            replace: z.array(z.string()).optional().describe("Absolute local paths that become all its files"),
          })
          .optional()
          .describe("A file resource's or folder's files; untouched when missing"),
        package: z.string().optional().describe("A SCORM's new package: an absolute local path to a .zip, replacing the current one in place"),
      },
      outputSchema: { ...resultSchema, scorm: z.object(scormFields).optional().describe("A SCORM after a new package, as get_scorm gives it") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId, restrictions, completion, ...input }) =>
      reply(await updateActivity(...(await onSite(config, browser)), activityId, { ...input, ...(restrictions && { restrictions: toRestrictions(restrictions) }), ...(completion && { completion: toCompletion(completion) }) })),
  );
};
