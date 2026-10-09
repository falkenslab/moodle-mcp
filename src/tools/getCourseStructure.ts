import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { activityDetails, courseState, type ActivityDetails, type CourseState } from "../moodle/course.js";
import { decodeEntities } from "../moodle/text.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  courseId: z.number().int().positive().describe("The course's id, as list_courses gives it"),
  details: z.boolean().optional().describe("Also read the course page for each activity's dates and restriction text (slower; default false)"),
};

// Moodle's completion states (COMPLETION_INCOMPLETE … COMPLETION_COMPLETE_FAIL).
const COMPLETION_STATES = ["incomplete", "complete", "complete-pass", "complete-fail"] as const;

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

const section = z.object({
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

type Section = z.infer<typeof section>;

/** The state as sections with their activities, in the course's order; details merged when given. */
export function structureOf(state: CourseState, details?: Map<number, ActivityDetails>): Section[] {
  const cms = new Map(state.cm.map((cm) => [cm.id, cm]));
  return state.section.map((s) => {
    const ids = s.cmlist ?? state.cm.filter((cm) => cm.sectionid === s.id).map((cm) => cm.id);
    const activities = ids.flatMap((id) => {
      const cm = cms.get(id);
      if (!cm) return [];
      const extra = details?.get(Number(cm.id));
      const state = cm.istrackeduser && cm.completionstate !== undefined ? COMPLETION_STATES[cm.completionstate] : undefined;
      return [
        {
          id: Number(cm.id),
          name: decodeEntities(cm.name),
          type: cm.module,
          url: cm.url,
          visible: cm.visible,
          availableToMe: (cm.uservisible ?? true) && (cm.accessvisible ?? true),
          restricted: cm.hascmrestrictions ?? false,
          completion: state ? { state, complete: cm.isoverallcomplete ?? state !== "incomplete" } : undefined,
          dates: extra && extra.dates.length > 0 ? extra.dates : undefined,
          restriction: extra?.restriction,
        },
      ];
    });
    return {
      id: Number(s.id),
      number: s.number,
      title: decodeEntities(s.title),
      visible: s.visible ?? true,
      restricted: s.hasrestrictions ?? false,
      url: s.sectionurl,
      parentSectionId: s.parentsectionid ? Number(s.parentsectionid) : undefined,
      activities,
    };
  });
}

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
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const state = await courseState(context, siteUrl, courseId);
      const extra = details ? await activityDetails(context, siteUrl, courseId, state) : undefined;
      const output = { course: { id: courseId, url: state.course?.baseurl }, sections: structureOf(state, extra) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
