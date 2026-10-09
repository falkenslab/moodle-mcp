// create_activity and update_activity: Moodle's activity form, filled and submitted (ADR-008).
import { access } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { courseState } from "@falkenslab/moodle-driver";
import { formValue, openForm, setFields, submitForm, uploadToDraft, type FieldValue } from "@falkenslab/moodle-driver";
import { section, structureOf } from "./getCourseStructure.js";
import type { RegisterTool } from "./types.js";

const VISIBILITY = { shown: 1, hidden: 0, stealth: -1 } as const;

const contentFields = {
  description: z.string().optional().describe("The description (HTML), shown on the activity's page"),
  content: z.string().optional().describe("A page's content, or a label's text (HTML)"),
  url: z.string().optional().describe("A URL resource's target"),
  visibility: z.enum(["shown", "hidden", "stealth"]).optional().describe('"stealth": hidden from the course page but available by link, where the site allows it'),
  settings: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .describe('Any other form field by its name in Moodle\'s activity form, e.g. {"duedate[enabled]": true, "duedate[day]": 12, "grade[modgrade_point]": 10}'),
};

const resultSchema = {
  changed: z.string(),
  activityId: z.number().int().optional(),
  url: z.string().optional(),
  sections: z.array(section).describe("The course's structure after the change"),
};

/** The form values the common inputs stand for, given the activity's type. */
function fieldsFor(type: string, input: { name?: string; description?: string; content?: string; url?: string; visibility?: keyof typeof VISIBILITY; settings?: Record<string, FieldValue> }): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.description !== undefined) values["introeditor[text]"] = input.description;
  if (input.content !== undefined) {
    // A label's text is its description field; a page has its own content editor.
    if (type === "label") values["introeditor[text]"] = input.content;
    else if (type === "page") values["page[text]"] = input.content;
    else throw new Error(`content is for pages and labels; for a ${type}, use description or settings.`);
  }
  if (input.url !== undefined) values.externalurl = input.url;
  if (input.visibility !== undefined) values.visible = VISIBILITY[input.visibility];
  return { ...values, ...input.settings };
}

async function checkFiles(files: string[]): Promise<void> {
  for (const file of files) {
    if (!path.isAbsolute(file)) throw new Error(`Give files as absolute paths: "${file}".`);
    await access(file).catch(() => {
      throw new Error(`There's no file at ${file}.`);
    });
  }
}

export const registerCreateActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_activity",
    {
      title: "Create an activity or resource",
      description:
        "Create an activity or resource of any type (page, label, url, resource, folder, assign, quiz, forum…) at the end of a section, through Moodle's own form, hidden from students by default. Common fields have their own inputs; any other setting goes in settings by its form field name. files are local paths uploaded to a file resource or folder. Returns the new activity's id and the course structure. Changes the course: confirm with the person first.",
      inputSchema: {
        courseId: z.number().int().positive(),
        sectionId: z.number().int().positive().describe("The section's id, as get_course_structure gives it"),
        type: z.string().regex(/^[a-z0-9_]+$/).describe("Moodle's module name: page, label, url, resource, folder, assign, quiz, forum, book…"),
        name: z.string().min(1).optional().describe("Required except for labels"),
        files: z.array(z.string()).optional().describe("Absolute local paths: a file resource's file (the first is the main one), a folder's files"),
        ...contentFields,
      },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      if (input.files) await checkFiles(input.files);
      const before = await courseState(context, siteUrl, input.courseId);
      const target = before.section.find((s) => Number(s.id) === input.sectionId);
      if (!target) throw new Error(`Course ${input.courseId} has no section ${input.sectionId}. Take its id from get_course_structure.`);

      const page = await openForm(context, siteUrl, `course/modedit.php?add=${input.type}&course=${input.courseId}&section=${target.number}&return=0`);
      try {
        if (input.files && input.files.length > 0) {
          const draft = await formValue(page, "files");
          if (!draft) throw new Error(`A ${input.type} takes no files in its form.`);
          await uploadToDraft(page, draft, input.files);
        }
        // Hidden unless asked: a teacher publishes after checking (teacher runs published by mistake once).
        await setFields(page, fieldsFor(input.type, { ...input, visibility: input.visibility ?? "hidden" }));
        await submitForm(page, "submitbutton2");
      } finally {
        await page.close().catch(() => undefined);
      }

      const after = await courseState(context, siteUrl, input.courseId);
      const created = after.cm.find((cm) => !before.cm.some((old) => old.id === cm.id));
      const output = {
        changed: created ? `Created ${input.type} ${created.id} "${created.name}" in section ${target.number}.` : `The form was saved, but no new activity appears in course ${input.courseId}.`,
        activityId: created ? Number(created.id) : undefined,
        url: created?.url,
        sections: structureOf(after),
      };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};

export const registerUpdateActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_activity",
    {
      title: "Update an activity's settings or content",
      description:
        "Change an existing activity through Moodle's own form: name, description, a page's or label's content, a URL's target, visibility, or any other setting by its form field name in settings. Only what is given changes; files stay as they are. Returns the course structure. Changes the course: confirm with the person first.",
      inputSchema: {
        activityId: z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it"),
        name: z.string().min(1).optional(),
        ...contentFields,
      },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (input) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const page = await openForm(context, siteUrl, `course/modedit.php?update=${input.activityId}&return=0`);
      let courseId: number;
      try {
        courseId = Number(await formValue(page, "course"));
        const type = (await formValue(page, "modulename")) ?? "";
        await setFields(page, fieldsFor(type, input));
        await submitForm(page, "submitbutton2");
      } finally {
        await page.close().catch(() => undefined);
      }
      const after = await courseState(context, siteUrl, courseId);
      const cm = after.cm.find((c) => Number(c.id) === input.activityId);
      const output = { changed: `Updated activity ${input.activityId}${cm ? ` "${cm.name}"` : ""}.`, activityId: input.activityId, url: cm?.url, sections: structureOf(after) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
