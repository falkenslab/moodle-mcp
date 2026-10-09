import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { courseState, type CourseState } from "../moodle/course.js";
import { decodeEntities } from "../moodle/text.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  courseId: z.number().int().positive().describe("The course's id, as list_courses gives it"),
};

const assignment = z.object({
  id: z.number().int().describe("The assignment's course module id, which the other assignment tools take"),
  name: z.string(),
  url: z.string(),
  visible: z.boolean().describe("Whether students can see it"),
  section: z.object({ number: z.number().int(), title: z.string() }),
});

const outputSchema = { assignments: z.array(assignment) };

export type Assignment = z.infer<typeof assignment>;

/** The course's assignments, in the course's order. */
export function assignmentsOf(state: CourseState): Assignment[] {
  const sections = new Map(state.section.map((section) => [section.id, section]));
  return state.cm
    .filter((cm) => cm.module === "assign")
    .map((cm) => {
      const section = sections.get(cm.sectionid);
      return {
        id: Number(cm.id),
        name: decodeEntities(cm.name),
        url: cm.url ?? "",
        visible: cm.visible,
        section: { number: section?.number ?? 0, title: decodeEntities(section?.title ?? "") },
      };
    });
}

export const registerListAssignments: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_assignments",
    {
      title: "List a course's assignments",
      description:
        "List the assignments of a Moodle course: their ids (course module ids, for the other assignment tools), names, URLs, visibility and section. Takes the course id from list_courses.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => {
      const siteUrl = requireSiteUrl(config);
      const state = await courseState(await browser.context(), siteUrl, courseId);
      const output = { assignments: assignmentsOf(state) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
