// The course layout tools: one file for six small tools that share their schemas and result.
import type { BrowserContext } from "playwright-core";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { courseState } from "@falkenslab/moodle-driver";
import { editCourse, renameActivity, renameSection } from "@falkenslab/moodle-driver";
import { section, structureOf } from "./getCourseStructure.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive().describe("The course's id, as list_courses gives it");
const activityId = z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it");
const sectionId = z.number().int().positive().describe("A section's id (not its number), as get_course_structure gives it");

/** Every layout tool answers with the course's structure after the change, to check it. */
const resultSchema = {
  changed: z.string().describe("What was done"),
  newId: z.number().int().optional().describe("The id of what was created: the copy, the new section"),
  sections: z.array(section).describe("The course's structure after the change, as get_course_structure gives it"),
};

async function result(context: BrowserContext, siteUrl: string, course: number, changed: string, newId?: number) {
  const output = { changed, newId, sections: structureOf(await courseState(context, siteUrl, course)) };
  return { content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output };
}

const VISIBILITY_ACTIONS = { shown: "cm_show", hidden: "cm_hide", stealth: "cm_stealth" } as const;

export const registerEditActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_activity",
    {
      title: "Edit an activity's name, visibility or place",
      description:
        'Change an activity on the course page: rename it, set its visibility ("shown", "hidden", or "stealth": hidden from the course page but available by link), or move it to a section (at its end) or before another activity. Only what is given changes. Returns the course structure afterwards. Changes the course: confirm with the person first.',
      inputSchema: {
        courseId,
        activityId,
        name: z.string().min(1).optional(),
        visibility: z.enum(["shown", "hidden", "stealth"]).optional(),
        sectionId: sectionId.optional().describe("Move it to the end of this section"),
        beforeActivityId: activityId.optional().describe("Move it before this activity (in that activity's section)"),
      },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, activityId, name, visibility, sectionId, beforeActivityId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const done: string[] = [];
      if (name !== undefined) {
        await renameActivity(context, siteUrl, activityId, name);
        done.push(`renamed to "${name}"`);
      }
      if (visibility !== undefined) {
        await editCourse(context, siteUrl, courseId, VISIBILITY_ACTIONS[visibility], [activityId]);
        done.push(`made ${visibility}`);
      }
      if (sectionId !== undefined || beforeActivityId !== undefined) {
        await editCourse(context, siteUrl, courseId, "cm_move", [activityId], { sectionId, activityId: beforeActivityId });
        done.push(beforeActivityId !== undefined ? `moved before activity ${beforeActivityId}` : `moved to the end of section ${sectionId}`);
      }
      return result(context, siteUrl, courseId, done.length > 0 ? `Activity ${activityId} ${done.join(", ")}.` : "Nothing to change.");
    },
  );
};

export const registerDuplicateActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "duplicate_activity",
    {
      title: "Duplicate an activity",
      description: "Duplicate an activity right after itself, with its settings and content (not participants' data). Returns the copy's id and the course structure. Changes the course: confirm with the person first.",
      inputSchema: { courseId, activityId },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId, activityId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const before = new Set((await courseState(context, siteUrl, courseId)).cm.map((cm) => cm.id));
      await editCourse(context, siteUrl, courseId, "cm_duplicate", [activityId]);
      const copy = (await courseState(context, siteUrl, courseId)).cm.find((cm) => !before.has(cm.id));
      return result(context, siteUrl, courseId, `Activity ${activityId} duplicated${copy ? ` as ${copy.id}` : ""}.`, copy ? Number(copy.id) : undefined);
    },
  );
};

export const registerDeleteActivity: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_activity",
    {
      title: "Delete an activity",
      description: "Delete an activity from a course, with its participants' data (submissions, attempts, posts, grades). Destructive: confirm with the person first, naming the activity.",
      inputSchema: { courseId, activityId },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, activityId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      await editCourse(context, siteUrl, courseId, "cm_delete", [activityId]);
      return result(context, siteUrl, courseId, `Activity ${activityId} deleted.`);
    },
  );
};

export const registerAddSection: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_section",
    {
      title: "Add a section",
      description: "Add a section to a course, at the end or after a given section, optionally named. Returns its id and the course structure. Changes the course: confirm with the person first.",
      inputSchema: { courseId, name: z.string().min(1).optional(), afterSectionId: sectionId.optional().describe("Add it after this section; at the end when missing") },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId, name, afterSectionId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const before = new Set((await courseState(context, siteUrl, courseId)).section.map((s) => s.id));
      await editCourse(context, siteUrl, courseId, "section_add", [], { sectionId: afterSectionId });
      const added = (await courseState(context, siteUrl, courseId)).section.find((s) => !before.has(s.id));
      if (added && name !== undefined) await renameSection(context, siteUrl, courseId, Number(added.id), name);
      return result(context, siteUrl, courseId, `Section ${added?.id ?? "?"} added${name !== undefined ? ` as "${name}"` : ""}.`, added ? Number(added.id) : undefined);
    },
  );
};

export const registerEditSection: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_section",
    {
      title: "Edit a section's name, visibility or place",
      description: "Change a section: rename it, show or hide it (with its activities), or move it after another section. Only what is given changes. Returns the course structure. Changes the course: confirm with the person first.",
      inputSchema: {
        courseId,
        sectionId,
        name: z.string().min(1).optional(),
        visible: z.boolean().optional(),
        afterSectionId: sectionId.optional().describe("Move it after this section"),
      },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, sectionId, name, visible, afterSectionId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const done: string[] = [];
      if (name !== undefined) {
        await renameSection(context, siteUrl, courseId, sectionId, name);
        done.push(`renamed to "${name}"`);
      }
      if (visible !== undefined) {
        await editCourse(context, siteUrl, courseId, visible ? "section_show" : "section_hide", [sectionId]);
        done.push(visible ? "shown" : "hidden");
      }
      if (afterSectionId !== undefined) {
        await editCourse(context, siteUrl, courseId, "section_move_after", [sectionId], { sectionId: afterSectionId });
        done.push(`moved after section ${afterSectionId}`);
      }
      return result(context, siteUrl, courseId, done.length > 0 ? `Section ${sectionId} ${done.join(", ")}.` : "Nothing to change.");
    },
  );
};

export const registerDeleteSection: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_section",
    {
      title: "Delete a section",
      description: "Delete a section and every activity in it, with their participants' data. Destructive: confirm with the person first, saying which activities go with it.",
      inputSchema: { courseId, sectionId },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, sectionId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      await editCourse(context, siteUrl, courseId, "section_delete", [sectionId]);
      return result(context, siteUrl, courseId, `Section ${sectionId} deleted, with its activities.`);
    },
  );
};
