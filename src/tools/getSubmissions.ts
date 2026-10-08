import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { assignmentIds, gradingPanelHtml, listParticipants, participantDates, readSubmissionContent } from "../moodle/assign.js";
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
  assignment: z.object({ id: z.number().int(), instanceId: z.number().int() }),
  submissions: z.array(submission),
};

type Submission = z.infer<typeof submission>;

/** Unix seconds as ISO 8601; Moodle uses 0 for "none". */
function isoDate(seconds: number | undefined): string | undefined {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

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
    async ({ assignmentId, includeContent = true }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const ids = await assignmentIds(context, siteUrl, assignmentId);
      const participants = await listParticipants(context, siteUrl, ids.instanceId);

      // A blank tab parses the panels' HTML: nothing of Moodle's loads there.
      const parser = includeContent ? await context.newPage() : undefined;
      const submissions: Submission[] = [];
      try {
        // One participant at a time: the calls share the kept service tab (ADR-008).
        for (const participant of participants) {
          const dates = await participantDates(context, siteUrl, ids.instanceId, participant.id);
          const status = participant.submissionstatus || "none";
          const withContent = parser && (status === "submitted" || status === "draft");
          submissions.push({
            userId: participant.id,
            fullName: participant.fullname,
            status,
            submitted: participant.submitted,
            needsGrading: participant.requiregrading,
            extensionGranted: participant.grantedextension,
            allowSubmissionsFrom: isoDate(dates.allowsubmissionsfromdate),
            dueDate: isoDate(dates.duedate),
            cutoffDate: isoDate(dates.cutoffdate),
            content: withContent ? await readSubmissionContent(parser, await gradingPanelHtml(context, siteUrl, ids.contextId, participant.id)) : undefined,
          });
        }
      } finally {
        await parser?.close().catch(() => undefined);
      }

      const output = { assignment: { id: assignmentId, instanceId: ids.instanceId }, submissions };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
