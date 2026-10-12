import { z } from "zod";
import { WORKFLOW_STATES, assignmentSubmissions } from "@falkenslab/moodle-driver";
import { people, personFields, pseudonymizing, shown, text } from "../people.js";
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
  extensionDueDate: z.string().optional().describe("ISO 8601: the date the participant's extension runs to, when granted"),
  allowSubmissionsFrom: z.string().optional().describe("ISO 8601, for this participant"),
  dueDate: z.string().optional().describe("ISO 8601, for this participant (overrides included; an extension is in extensionDueDate)"),
  cutoffDate: z.string().optional().describe("ISO 8601, for this participant"),
  group: z.object({ id: z.number().int(), name: z.string() }).optional().describe("The participant's group, in a group assignment"),
  workflowState: z.enum(WORKFLOW_STATES).optional().describe("The marking workflow state, when the assignment uses it"),
  markers: z.array(z.object(personFields)).optional().describe("Who marks it (aliases when the server pseudonymizes), when markers are allocated"),
  feedbackFiles: z.array(z.object({ name: z.string(), url: z.string().optional().describe("None when pseudonymizing") })).optional().describe("Feedback files returned to the participant"),
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
      // Markers are people too: one list for all of them, so each gets one alias.
      const markerList = [...new Map(found.flatMap((s) => s.markers ?? []).map((m) => [m.id, { userId: m.id, fullName: m.name }])).values()];
      const markerShown = new Map((await people(config, context, siteUrl, markerList)).map((p, i) => [markerList[i]!.userId, shown(p)]));
      const submissions = await Promise.all(
        found.map(async ({ status, submitted, needsGrading, extensionGranted, extensionDueDate, allowSubmissionsFrom, dueDate, cutoffDate, content, group, workflowState, markers, feedbackFiles }, i) => ({
          ...(who[i]!.alias ? { user: who[i]!.alias } : { userId: who[i]!.userId, fullName: who[i]!.fullName }),
          ...{ status, submitted, needsGrading, extensionGranted, extensionDueDate, allowSubmissionsFrom, dueDate, cutoffDate, workflowState },
          ...(group && { group: { id: group.id, name: await text(config, siteUrl, group.name) } }),
          ...(markers && { markers: markers.map((m) => markerShown.get(m.id)!) }),
          // Feedback files are often named after the student, and so are their links.
          ...(feedbackFiles && { feedbackFiles: await Promise.all(feedbackFiles.map(async (f) => (pseudonymizing(config) ? { name: await text(config, siteUrl, f.name) } : f))) }),
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
