import { z } from "zod";
import { COURSE_CLASSIFICATIONS, listCourses } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  classification: z
    .enum(COURSE_CLASSIFICATIONS)
    .optional()
    .describe('Which courses by their dates: "all" (default), "inprogress", "future" or "past"'),
};

const course = z.object({
  id: z.number().int(),
  shortname: z.string(),
  fullname: z.string(),
  category: z.string().optional(),
  url: z.string(),
  visible: z.boolean().describe("Whether students can see the course"),
  startDate: z.string().optional().describe("ISO 8601"),
  endDate: z.string().optional().describe("ISO 8601"),
  progress: z.number().optional().describe("The person's completion percentage, when the course tracks it"),
  lastAccess: z.string().optional().describe("When the person last opened the course, ISO 8601"),
});

const outputSchema = { courses: z.array(course) };

export const registerListCourses: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_courses",
    {
      title: "List my courses",
      description:
        "List the Moodle courses the logged-in person is enrolled in (as teacher or student), with their ids, names, category, URL, visibility, dates and the person's progress. Filter by dates with classification.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ classification = "all" }) => {
      const output = { courses: await listCourses(...(await onSite(config, browser)), classification) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
