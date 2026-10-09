import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { activityDetails, courseState } from "../moodle/course.js";
import { myGrades } from "../moodle/grades.js";
import { structureOf } from "./getCourseStructure.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  courseId: z.number().int().positive().describe("The course's id, as list_courses gives it"),
};

const outputSchema = {
  completionTracked: z.boolean().describe("Whether the course tracks completion for the person; without it, pending means graded but not graded yet"),
  pending: z.array(
    z.object({
      activityId: z.number().int(),
      name: z.string(),
      type: z.string(),
      url: z.string().optional(),
      section: z.object({ number: z.number().int(), title: z.string() }),
      reason: z.enum(["incomplete", "not-graded"]),
      completion: z.string().optional().describe('"incomplete" or "complete-fail"'),
      availableToMe: z.boolean(),
      dates: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      restriction: z.string().optional(),
    }),
  ),
};

type Pending = z.infer<z.ZodObject<typeof outputSchema>>["pending"][number];

export const registerListPending: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_pending",
    {
      title: "List what I have left",
      description:
        "List what the logged-in person still has to do in a course: activities whose completion is tracked and not complete or, where completion isn't tracked, graded activities without a grade yet; with their dates, restrictions and whether they can be opened now. Takes the course id from list_courses.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const state = await courseState(context, siteUrl, courseId);
      const sections = structureOf(state, await activityDetails(context, siteUrl, courseId, state));
      const ungraded = new Set(
        (await myGrades(context, siteUrl, courseId).catch(() => [])).filter((row) => row.kind === "item" && row.activityId && !row.grade).map((row) => row.activityId),
      );

      const completionTracked = state.cm.some((cm) => cm.istrackeduser && cm.completionstate !== undefined);
      const pending: Pending[] = [];
      for (const section of sections) {
        for (const activity of section.activities) {
          if (!activity.visible && !activity.availableToMe) continue;
          const tracked = activity.completion !== undefined;
          const reason = tracked ? (activity.completion!.complete ? undefined : "incomplete") : ungraded.has(activity.id) ? "not-graded" : undefined;
          if (!reason) continue;
          pending.push({
            activityId: activity.id,
            name: activity.name,
            type: activity.type,
            url: activity.url,
            section: { number: section.number, title: section.title },
            reason,
            completion: activity.completion?.state,
            availableToMe: activity.availableToMe,
            dates: activity.dates,
            restriction: activity.restriction,
          });
        }
      }
      const output = { completionTracked, pending };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
