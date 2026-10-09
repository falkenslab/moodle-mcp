import { z } from "zod";
import { COMPLETION_STATES, courseStructure } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  courseId: z.number().int().positive().describe("The course's id, as list_courses gives it"),
  details: z.boolean().optional().describe("Also read the course page for each activity's dates and restriction text (slower; default false)"),
};

const activity = z.object({
  id: z.number().int().describe("The course module id, which the activity tools take"),
  name: z.string(),
  type: z.string().describe('The module: "page", "assign", "quiz", "forum", "resource"…'),
  url: z.string().optional(),
  visible: z.boolean().describe("Shown to students"),
  availableToMe: z.boolean().describe("The person can open it now"),
  restricted: z.boolean().describe("Has access restrictions"),
  completion: z
    .object({ state: z.enum(COMPLETION_STATES), complete: z.boolean() })
    .optional()
    .describe("The person's completion, when the activity tracks it for them"),
  dates: z.array(z.object({ label: z.string(), value: z.string() })).optional().describe("With details: as the course page shows them, in the site's language"),
  restriction: z.string().optional().describe("With details: the restriction as the course page shows it"),
});

export const section = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  visible: z.boolean(),
  restricted: z.boolean(),
  url: z.string().optional(),
  parentSectionId: z.number().int().optional().describe("For a subsection, the section that holds it"),
  activities: z.array(activity),
});

const outputSchema = {
  course: z.object({ id: z.number().int(), url: z.string().optional() }),
  sections: z.array(section),
};

export const registerGetCourseStructure: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_course_structure",
    {
      title: "Get a course's structure",
      description:
        "Get a Moodle course's sections and activities: ids, names, types, URLs, visibility, whether the person can open each one, restrictions and the person's completion. With details, also each activity's dates and restriction text as the course page shows them. Takes the course id from list_courses.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId, details = false }) => {
      const output = await courseStructure(...(await onSite(config, browser)), courseId, { details });
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
