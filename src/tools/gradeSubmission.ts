import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { assignmentIds, fillGradingForm, gradingPanelHtml, panelGrade, submitGradingForm } from "../moodle/assign.js";
import type { FieldValue } from "../moodle/forms.js";
import type { RegisterTool } from "./types.js";

const FEEDBACK_FIELD = "assignfeedbackcomments_editor[text]";

export const registerGradeSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "grade_submission",
    {
      title: "Grade a submission",
      description:
        "Grade a participant in an assignment, as Moodle's grader does: a grade, feedback comments (HTML, when the assignment has them on), whether to notify the student, and any other grading field by name in fields (a rubric's or marking guide's). Works with or without a submission. Returns the grade saved. Changes grades students may see: confirm with the person first.",
      inputSchema: {
        assignmentId: z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it"),
        userId: z.number().int().positive().describe("The participant's user id, as get_submissions gives it"),
        grade: z.union([z.number(), z.string()]).optional().describe("The grade, within the assignment's range or scale"),
        feedback: z.string().optional().describe("Feedback comments (HTML)"),
        notify: z.boolean().optional().describe("Notify the student; Moodle's default when missing"),
        fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Other grading form fields by name, e.g. a rubric's levels"),
      },
      outputSchema: {
        changed: z.string(),
        grade: z.string().optional().describe("The grade Moodle has now for this participant"),
        feedback: z.string().optional().describe("The feedback comments Moodle has now (HTML)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ assignmentId, userId, grade, feedback, notify, fields }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const ids = await assignmentIds(context, siteUrl, assignmentId);
      const values: Record<string, FieldValue> = { ...fields };
      if (grade !== undefined) values.grade = String(grade);
      if (feedback !== undefined) values[FEEDBACK_FIELD] = feedback;
      if (notify !== undefined) values.sendstudentnotifications = notify ? 1 : 0;

      // A blank tab holds the panel's form: nothing of the grader's page needs to load.
      const page = await context.newPage();
      try {
        const serialized = await fillGradingForm(page, await gradingPanelHtml(context, siteUrl, ids.contextId, userId), values).catch((error: Error) => {
          if (feedback !== undefined && error.message.includes(FEEDBACK_FIELD)) {
            throw new Error("This assignment has no feedback comments: grade it without feedback, or turn feedback comments on in its settings (update_activity).");
          }
          throw error;
        });
        await submitGradingForm(context, siteUrl, ids.instanceId, userId, serialized);
        const saved = await panelGrade(page, await gradingPanelHtml(context, siteUrl, ids.contextId, userId));
        const output = { changed: `Graded user ${userId} in assignment ${assignmentId}${feedback !== undefined ? ", with feedback" : ""}.`, ...saved };
        return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
      } finally {
        await page.close().catch(() => undefined);
      }
    },
  );
};
