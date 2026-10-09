// The student's assignment tools: one file for three tools that share the assignment's schema.
import { access } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { saveSubmission, studentAssignment, submitForGrading } from "../moodle/submission.js";
import type { RegisterTool } from "./types.js";

const assignmentId = z.number().int().positive().describe("The assignment's id (course module id), as get_course_structure gives it");
const detail = z.object({ label: z.string(), value: z.string() });
const link = z.object({ name: z.string(), url: z.string() });

const assignmentSchema = {
  description: z.string(),
  descriptionFiles: z.array(link).describe("Files attached to the brief (templates…)"),
  dates: z.array(detail),
  status: z.array(detail).describe("The submission status table as Moodle shows it"),
  submissionState: z.string().optional().describe('"new", "draft", "submitted", "reopened"…'),
  graded: z.boolean(),
  submittedFiles: z.array(link),
  feedback: z.array(detail).describe("Grade and feedback, once released"),
  canEdit: z.boolean().describe("save_submission can change the submission now"),
  canSubmit: z.boolean().describe("submit_assignment can submit the draft now"),
};

const reply = <T extends Record<string, unknown>>(output: T) => ({ content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output });

async function checkFiles(files: string[]): Promise<void> {
  for (const file of files) {
    if (!path.isAbsolute(file)) throw new Error(`Give files as absolute paths: "${file}".`);
    await access(file).catch(() => {
      throw new Error(`There's no file at ${file}.`);
    });
  }
}

export const registerGetAssignment: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_assignment",
    {
      title: "Get an assignment as a student",
      description: "Read an assignment as the logged-in student sees it: the brief and its files, dates, the submission's status and content, grade and feedback, and whether it can be edited or submitted now.",
      inputSchema: { assignmentId },
      outputSchema: assignmentSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assignmentId }) => reply({ ...(await studentAssignment(await browser.context(), requireSiteUrl(config), assignmentId)) }),
  );
};

export const registerSaveSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "save_submission",
    {
      title: "Save my submission",
      description:
        "Save the logged-in student's submission to an assignment: its online text (HTML, replacing what was there) and files to add (absolute local paths). Doesn't submit it for grading when the assignment asks students to click submit: submit_assignment does. Returns the assignment as the student sees it. Changes the submission: confirm with the person first.",
      inputSchema: { assignmentId, onlineText: z.string().optional(), files: z.array(z.string()).optional() },
      outputSchema: assignmentSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ assignmentId, onlineText, files }) => {
      if (onlineText === undefined && (!files || files.length === 0)) throw new Error("Give onlineText, files or both.");
      if (files) await checkFiles(files);
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      await saveSubmission(context, siteUrl, assignmentId, { onlineText, files });
      return reply({ ...(await studentAssignment(context, siteUrl, assignmentId)) });
    },
  );
};

export const registerSubmitAssignment: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "submit_assignment",
    {
      title: "Submit my assignment for grading",
      description:
        "Submit the saved submission for grading: it can't be changed afterwards unless the teacher reopens it. When the site asks to accept a statement (it's your own work…), the call fails quoting it until acceptStatement is true. Final: confirm with the person first, after checking the submission with get_assignment.",
      inputSchema: { assignmentId, acceptStatement: z.boolean().optional().describe("The person accepts the site's submission statement") },
      outputSchema: assignmentSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ assignmentId, acceptStatement = false }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      await submitForGrading(context, siteUrl, assignmentId, acceptStatement);
      return reply({ ...(await studentAssignment(context, siteUrl, assignmentId)) });
    },
  );
};
