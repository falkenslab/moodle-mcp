// get_activity_settings and update_course: a form's fields as Moodle holds them, and the course's own form.
import { z } from "zod";
import { activitySettings, updateCourse } from "@falkenslab/moodle-driver";
import { completionSchema, fromCompletion, fromRestrictions, restrictionsSchema } from "./conditions.js";
import { course } from "./listCourses.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

/** Any form field by name, as the activity and course forms take them. */
export const formSettings = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
  .optional();

const field = z.object({
  name: z.string().describe("The field's form name: update_activity's settings take it"),
  type: z.enum(["text", "textarea", "select", "checkbox", "radio", "number", "date", "other"]),
  label: z.string().optional(),
  value: z.string().optional().describe("Text, the selected option or the checked radio's value"),
  values: z.array(z.string()).optional().describe("A multiple select's selected options"),
  checked: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  disabled: z.boolean().optional().describe("Disabled until another field enables it"),
});

export const registerGetActivitySettings: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_activity_settings",
    {
      title: "Get an activity's settings",
      description:
        "Read every setting of an activity as its edit form holds them, without changing anything: its module, name, description, each field with its form name, label, value and options, a resource's, folder's or SCORM's files, and its access restrictions and completion in the terms update_activity takes. Use it before update_activity. Teachers only. Takes the activity id from get_course_structure.",
      inputSchema: { activityId: z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it") },
      outputSchema: {
        id: z.number().int(),
        module: z.string(),
        courseId: z.number().int(),
        name: z.string(),
        description: z.string().describe("HTML"),
        fields: z.array(field),
        files: z.array(z.object({ name: z.string().describe("Its path in the activity, as update_activity's files.remove takes it"), size: z.number() })).optional(),
        restrictions: restrictionsSchema.optional(),
        completion: completionSchema.optional().describe("None when completion is off"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId }) => {
      const settings = await activitySettings(...(await onSite(config, browser)), activityId);
      // A multiple select's value is a list: its own field, since some clients reject a union of types.
      const fields = settings.fields.map(({ value, ...rest }) => ({ ...rest, ...(Array.isArray(value) ? { values: value } : value !== undefined && { value }) }));
      const { restrictions, completion, files, ...rest } = settings;
      return reply({ ...rest, fields, ...(files && { files }), ...(restrictions && { restrictions: fromRestrictions(restrictions) }), ...(completion && { completion: fromCompletion(completion) }) });
    },
  );
};

export const registerUpdateCourse: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_course",
    {
      title: "Update a course's settings",
      description:
        "Change a course's full name, short name, summary (HTML) or any other setting by its field name in Moodle's course settings form (settings), through that form. Only what is given changes. Returns the course afterwards. Changes the course: confirm with the person first.",
      inputSchema: {
        courseId: z.number().int().positive(),
        fullName: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        summary: z.string().optional().describe("HTML"),
        embed: z.array(z.string()).optional().describe('Absolute local files (images…) to embed in the HTML, which names each by its file name: <img src="shot.png">'),
        settings: formSettings.describe('Other fields by their name in the course settings form, e.g. {"visible": 0, "startdate[day]": 1}'),
      },
      outputSchema: { changed: z.string(), course: course.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, ...input }) => reply(await updateCourse(...(await onSite(config, browser)), courseId, input)),
  );
};
