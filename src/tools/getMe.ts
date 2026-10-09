import { z } from "zod";
import { redactUrl, requireSiteUrl } from "../config.js";
import { callService, readPageConfig } from "../moodle/ajax.js";
import { courseAbilities, courseRoles, siteName, userById } from "../moodle/user.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  courseId: z.number().int().positive().optional().describe("A course id (from list_courses) to also get the person's roles and abilities there"),
};

const outputSchema = {
  userId: z.number().int(),
  username: z.string().optional(),
  fullName: z.string(),
  email: z.string().optional(),
  language: z.string().describe("The interface language in use"),
  timeZone: z.string(),
  firstAccess: z.string().optional().describe("ISO 8601"),
  lastAccess: z.string().optional().describe("ISO 8601"),
  site: z.object({ name: z.string().optional(), url: z.string() }),
  course: z
    .object({
      id: z.number().int(),
      roles: z.array(z.object({ id: z.number().int(), name: z.string().describe("In the site's language") })),
      canEdit: z.boolean().describe("Can add and edit activities"),
      canGrade: z.boolean().describe("Can see the grader report and grade"),
    })
    .optional(),
};

type Me = z.infer<z.ZodObject<typeof outputSchema>>;

/** Unix seconds as ISO 8601; Moodle uses 0 for "never". */
function isoDate(seconds: number | undefined): string | undefined {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

export const registerGetMe: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_me",
    {
      title: "Who am I",
      description:
        "Tell who the logged-in person is: user id, username, full name, email, language, time zone, first and last access, and the site. With courseId, also their roles in that course and whether they can edit it and grade in it.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const cfg = await readPageConfig(context, siteUrl);
      const user = await userById(context, siteUrl, cfg.userId);
      const output: Me = {
        userId: cfg.userId,
        username: user?.username,
        fullName: user?.fullname ?? "",
        email: user?.email,
        language: cfg.language,
        timeZone: cfg.timeZone,
        firstAccess: isoDate(user?.firstaccess),
        lastAccess: isoDate(user?.lastaccess),
        site: { name: await siteName(context, siteUrl), url: redactUrl(siteUrl) },
      };
      if (courseId !== undefined) {
        // The course's state checks that it exists and the person can see it, and gives a section.
        const state = JSON.parse(await callService<string>(context, siteUrl, "core_courseformat_get_state", { courseid: courseId })) as { section: { id: string }[] };
        const abilities = await courseAbilities(context, siteUrl, courseId, Number(state.section[0]?.id ?? 0));
        output.course = { id: courseId, roles: await courseRoles(context, siteUrl, cfg.userId, courseId), ...abilities };
      }
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
