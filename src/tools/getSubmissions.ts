import { z } from "zod";
import { assignmentSubmissions } from "@falkenslab/moodle-driver";
import { people, pseudonymizing, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  assignmentId: z.number().int().positive().describe("The assignment's id (its course module id), as list_assignments gives it"),
  includeContent: z.boolean().optional().describe("Include each submission's content: online text and file links (default true)"),
};

const submission = z.object({
  user: z.string().optional().describe("The participant's alias, when the server pseudonymizes; grade_submission takes it"),
  userId: z.number().int().optional().describe("The participant's user id, when the server shows names"),
  fullName: z.string().optional(),
  status: z.string().describe('Moodle\'s submission status: "submitted", "draft", "new", "reopened", or "none" when there is no submission'),
  submitted: z.boolean(),
  needsGrading: z.boolean(),
  extensionGranted: z.boolean(),
  allowSubmissionsFrom: z.string().optional().describe("ISO 8601, for this participant"),
  dueDate: z.string().optional().describe("ISO 8601, for this participant (overrides and extensions included)"),
  cutoffDate: z.string().optional().describe("ISO 8601, for this participant"),
  content: z
    .array(z.object({ plugin: z.string().describe('"onlinetext", "file"…'), text: z.string(), files: z.array(z.object({ name: z.string(), url: z.string().optional().describe("None when pseudonymizing: the link carries the file's name") })) }))
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
        "Get every participant's submission to a Moodle assignment: who (an alias when the server pseudonymizes, else id and name), status (submitted, draft, none), whether it needs grading, extensions, the participant's dates and, by default, the content (online text and file links; names and contact data in it redacted when pseudonymizing). Takes the assignment id from list_assignments.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assignmentId, includeContent = true }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await assignmentSubmissions(context, siteUrl, assignmentId, { includeContent });
      const who = await people(config, context, siteUrl, found);
      const submissions = await Promise.all(
        found.map(async ({ status, submitted, needsGrading, extensionGranted, allowSubmissionsFrom, dueDate, cutoffDate, content }, i) => ({
          ...(who[i]!.alias ? { user: who[i]!.alias } : { userId: who[i]!.userId, fullName: who[i]!.fullName }),
          ...{ status, submitted, needsGrading, extensionGranted, allowSubmissionsFrom, dueDate, cutoffDate },
          ...(content && {
            content: await Promise.all(
              content.map(async (c) => ({
                plugin: c.plugin,
                text: await text(config, siteUrl, c.text),
                // A file name can carry its author's name, and so can its link (download_file refuses it anyway unless names are shown).
                files: await Promise.all(c.files.map(async (f) => (pseudonymizing(config) ? { name: await text(config, siteUrl, f.name) } : f))),
              })),
            ),
          }),
        })),
      );
      return reply({ assignment: { id: assignmentId }, submissions });
    },
  );
};
