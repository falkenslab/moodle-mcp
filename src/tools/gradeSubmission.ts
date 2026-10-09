import { z } from "zod";
import { gradeSubmission } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

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
        // One type only: some clients reject a union of types (the Inspector's --strict).
        grade: z.string().optional().describe('The grade as text: a number within the range ("7.5"), or a scale item'),
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
    async ({ assignmentId, userId, ...grading }) => reply(await gradeSubmission(...(await onSite(config, browser)), assignmentId, userId, grading)),
  );
};
