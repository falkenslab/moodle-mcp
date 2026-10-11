// The course layout tools: one file for six small tools that share their schemas and result.
import { z } from "zod";
import { ACTIVITY_VISIBILITIES, addSection, deleteActivity, deleteSection, duplicateActivity, editActivity, editSection } from "@falkenslab/moodle-driver";
import { section } from "./getCourseStructure.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive().describe("The course's id, as list_courses gives it");
const activityId = z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it");
const sectionId = z.number().int().positive().describe("A section's id (not its number), as get_course_structure gives it");

/** Every layout tool answers with the course's structure after the change, to check it. */
const resultSchema = {
  changed: z.string().describe("What was done"),
  activityId: z.number().int().optional().describe("The copy's id, after duplicate_activity"),
  sectionId: z.number().int().optional().describe("The new section's id, after add_section"),
  sections: z.array(section).describe("The course's structure after the change, as get_course_structure gives it"),
};

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
        visibility: z.enum(ACTIVITY_VISIBILITIES).optional(),
        sectionId: sectionId.optional().describe("Move it to the end of this section"),
        beforeActivityId: activityId.optional().describe("Move it before this activity (in that activity's section)"),
      },
      outputSchema: resultSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, activityId, ...change }) => reply(await editActivity(...(await onSite(config, browser)), courseId, activityId, change)),
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
    async ({ courseId, activityId }) => reply(await duplicateActivity(...(await onSite(config, browser)), courseId, activityId)),
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
    async ({ courseId, activityId }) => reply(await deleteActivity(...(await onSite(config, browser)), courseId, activityId)),
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
    async ({ courseId, ...section }) => reply(await addSection(...(await onSite(config, browser)), courseId, section)),
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
    async ({ courseId, sectionId, ...change }) => reply(await editSection(...(await onSite(config, browser)), courseId, sectionId, change)),
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
    async ({ courseId, sectionId }) => reply(await deleteSection(...(await onSite(config, browser)), courseId, sectionId)),
  );
};
