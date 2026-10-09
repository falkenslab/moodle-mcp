import { z } from "zod";
import { redactUrl } from "../config.js";
import { whoAmI } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
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
      const output = await whoAmI(...(await onSite(config, browser)), courseId);
      // The site's URL may hold credentials: never in a tool's result (ADR-003).
      output.site.url = redactUrl(output.site.url);
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: { ...output } };
    },
  );
};
