import { z } from "zod";
import { WORKFLOW_STATES, gradeSubmission } from "@falkenslab/moodle-driver";
import { refuseAliases, targetFields, targetName, targetUserId } from "../people.js";
import { requireSiteUrl } from "../config.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerGradeSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "grade_submission",
    {
      title: "Grade a submission",
      description:
        "Grade a participant in an assignment, as Moodle's grader does: a grade (simple grading), a rubric's levels or a marking guide's scores per criterion (ids from get_rubric) with remarks, feedback comments (HTML, when the assignment has them on), whether to notify the student, and any other grading field by name in fields. Takes the participant as get_submissions gives them: user (an alias) when the server pseudonymizes, else userId. Works with or without a submission. Returns the grade saved. Changes grades students may see: confirm with the person first.",
      inputSchema: {
        assignmentId: z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it"),
        ...targetFields,
        // One type only: some clients reject a union of types (the Inspector's --strict).
        grade: z.string().optional().describe('The grade as text: a number within the range ("7.5"), or a scale item'),
        feedback: z.string().optional().describe("Feedback comments (HTML); no aliases in it, since the student reads it"),
        notify: z.boolean().optional().describe("Notify the student; Moodle's default when missing"),
        rubric: z.record(z.string(), z.number().int()).optional().describe("A rubric's level per criterion: criterion id → level id, as get_rubric gives them"),
        guide: z.record(z.string(), z.number()).optional().describe("A marking guide's score per criterion: criterion id → score"),
        remarks: z.record(z.string(), z.string()).optional().describe("Remarks per criterion of a rubric or guide: criterion id → text; no aliases"),
        feedbackFiles: z.array(z.string()).optional().describe("Absolute local paths of feedback files to return to the student"),
        workflowState: z.enum(WORKFLOW_STATES).optional().describe('With the marking workflow on: the state to leave the submission in ("released" shows the student the grade)'),
        applyToGroup: z.boolean().optional().describe("In a group assignment: give the same grade and feedback to the whole group"),
        fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Other grading form fields by name, e.g. a rubric's levels"),
      },
      outputSchema: {
        changed: z.string(),
        grade: z.string().optional().describe("The grade Moodle has now for this participant"),
        gradebookGrade: z.string().optional().describe("The gradebook's grade: the total Moodle computes for a rubric or a guide"),
        feedback: z.string().optional().describe("The feedback comments Moodle has now (HTML)"),
        feedbackFiles: z.array(z.object({ name: z.string(), url: z.string() })).optional().describe("The feedback files Moodle has now"),
        workflowState: z.enum(WORKFLOW_STATES).optional().describe("The marking workflow state now, when the assignment uses it"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ assignmentId, user, userId, ...grading }) => {
      refuseAliases(config, grading.feedback, ...Object.values(grading.remarks ?? {}), ...Object.values(grading.fields ?? {}).flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v : [])));
      const siteUrl = requireSiteUrl(config);
      const target = await targetUserId(config, siteUrl, { user, userId });
      const byId = <T>(record?: Record<string, T>) => record && Object.fromEntries(Object.entries(record).map(([id, value]) => [Number(id), value]));
      const { rubric, guide, remarks, ...rest } = grading;
      const graded = await gradeSubmission(...(await onSite(config, browser)), assignmentId, target, { ...rest, rubric: byId(rubric), guide: byId(guide), remarks: byId(remarks) });
      // The driver's message names the user id: the agent gets the alias it gave instead.
      return reply({ ...graded, changed: `Graded ${targetName({ user, userId })} in assignment ${assignmentId}${grading.feedback !== undefined ? ", with feedback" : ""}.` });
    },
  );
};
