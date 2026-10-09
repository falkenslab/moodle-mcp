import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { myGrades } from "../moodle/grades.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  courseId: z.number().int().positive().describe("The course's id, as list_courses gives it"),
};

const outputSchema = {
  items: z.array(
    z.object({
      kind: z.enum(["item", "category", "courseTotal"]),
      name: z.string(),
      activityId: z.number().int().optional().describe("The graded activity's id, for items of an activity"),
      activityType: z.string().optional(),
      grade: z.string().optional().describe("As Moodle shows it; missing when not graded yet"),
      range: z.string().optional(),
      percentage: z.string().optional(),
      weight: z.string().optional(),
      letter: z.string().optional(),
      feedback: z.string().optional(),
      contribution: z.string().optional().describe("Contribution to the course total"),
    }),
  ),
};

export const registerGetMyGrades: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_my_grades",
    {
      title: "Get my grades",
      description:
        "Get the logged-in person's grade report for a course: each grade item (with its activity id), category and the course total, with grade, range, percentage, weight, letter, feedback and contribution, as Moodle shows them. Takes the course id from list_courses.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => {
      const siteUrl = requireSiteUrl(config);
      const output = { items: await myGrades(await browser.context(), siteUrl, courseId) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
