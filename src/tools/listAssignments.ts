import { z } from "zod";
import { listAssignments } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
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
      const output = { assignments: await listAssignments(...(await onSite(config, browser)), courseId) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
