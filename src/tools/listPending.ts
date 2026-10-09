import { z } from "zod";
import { pendingActivities } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
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
      const output = await pendingActivities(...(await onSite(config, browser)), courseId);
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
