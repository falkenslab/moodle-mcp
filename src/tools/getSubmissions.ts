import { z } from "zod";
import { assignmentSubmissions } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  assignmentId: z.number().int().positive().describe("The assignment's id (its course module id), as list_assignments gives it"),
  includeContent: z.boolean().optional().describe("Include each submission's content: online text and file links (default true)"),
};

const submission = z.object({
  userId: z.number().int(),
  fullName: z.string(),
  status: z.string().describe('Moodle\'s submission status: "submitted", "draft", "new", "reopened", or "none" when there is no submission'),
  submitted: z.boolean(),
  needsGrading: z.boolean(),
  extensionGranted: z.boolean(),
  allowSubmissionsFrom: z.string().optional().describe("ISO 8601, for this participant"),
  dueDate: z.string().optional().describe("ISO 8601, for this participant (overrides and extensions included)"),
  cutoffDate: z.string().optional().describe("ISO 8601, for this participant"),
  content: z
    .array(z.object({ plugin: z.string().describe('"onlinetext", "file"…'), text: z.string(), files: z.array(z.object({ name: z.string(), url: z.string() })) }))
    .optional()
    .describe("Per submission plugin; only for submitted and draft submissions"),
});

const outputSchema = {
  assignment: z.object({ id: z.number().int() }),
  submissions: z.array(submission),
};

export const registerGetSubmissions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_submissions",
    {
      title: "Get an assignment's submissions",
      description:
        "Get every participant's submission to a Moodle assignment: status (submitted, draft, none), whether it needs grading, extensions, the participant's dates and, by default, the content (online text and file links). Takes the assignment id from list_assignments.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assignmentId, includeContent = true }) =>
      reply({ assignment: { id: assignmentId }, submissions: await assignmentSubmissions(...(await onSite(config, browser)), assignmentId, { includeContent }) }),
  );
};
