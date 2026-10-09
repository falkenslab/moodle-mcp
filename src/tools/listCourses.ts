import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { callService } from "@falkenslab/moodle-driver";
import { decodeEntities } from "@falkenslab/moodle-driver";
import type { RegisterTool } from "./types.js";

// "all" includes the courses the person hid from their dashboard: an agent shouldn't miss them.
const CLASSIFICATIONS = { all: "allincludinghidden", inprogress: "inprogress", future: "future", past: "past" } as const;

const inputSchema = {
  classification: z
    .enum(["all", "inprogress", "future", "past"])
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

export type Course = z.infer<typeof course>;

/** A course as `core_course_get_enrolled_courses_by_timeline_classification` returns it (Moodle 5.2). */
export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  coursecategory?: string;
  viewurl: string;
  visible: boolean;
  startdate?: number;
  enddate?: number;
  progress?: number | null;
  hasprogress?: boolean;
  timeaccess?: number | null;
}

/** Unix seconds as ISO 8601; Moodle uses 0 for "none". */
function isoDate(seconds: number | null | undefined): string | undefined {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

export function toCourse(raw: MoodleCourse): Course {
  return {
    id: raw.id,
    shortname: decodeEntities(raw.shortname),
    fullname: decodeEntities(raw.fullname),
    category: raw.coursecategory ? decodeEntities(raw.coursecategory) : undefined,
    url: raw.viewurl,
    visible: raw.visible,
    startDate: isoDate(raw.startdate),
    endDate: isoDate(raw.enddate),
    progress: raw.hasprogress && typeof raw.progress === "number" ? raw.progress : undefined,
    lastAccess: isoDate(raw.timeaccess),
  };
}

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
      const siteUrl = requireSiteUrl(config);
      const { courses } = await callService<{ courses: MoodleCourse[] }>(
        await browser.context(),
        siteUrl,
        "core_course_get_enrolled_courses_by_timeline_classification",
        { classification: CLASSIFICATIONS[classification], limit: 0, offset: 0, sort: "fullname" },
      );
      const output = { courses: courses.map(toCourse) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
