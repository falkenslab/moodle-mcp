import { z } from "zod";
import { gradeSubmission } from "@falkenslab/moodle-driver";
import { pseudonymizing, refuseAliases, userIdOf } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerGradeSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "grade_submission",
    {
      title: "Grade a submission",
      description:
        "Grade a participant in an assignment, as Moodle's grader does: a grade, feedback comments (HTML, when the assignment has them on), whether to notify the student, and any other grading field by name in fields (a rubric's or marking guide's). Takes the participant as get_submissions gives them: user (an alias) when the server pseudonymizes, else userId. Works with or without a submission. Returns the grade saved. Changes grades students may see: confirm with the person first.",
      inputSchema: {
        assignmentId: z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it"),
        user: z.string().optional().describe("The participant's alias, as get_submissions gives it when the server pseudonymizes"),
        userId: z.number().int().positive().optional().describe("The participant's user id, as get_submissions gives it when the server shows names"),
        // One type only: some clients reject a union of types (the Inspector's --strict).
        grade: z.string().optional().describe('The grade as text: a number within the range ("7.5"), or a scale item'),
        feedback: z.string().optional().describe("Feedback comments (HTML); no aliases in it, since the student reads it"),
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
    async ({ assignmentId, user, userId, ...grading }) => {
      const pseudonymous = pseudonymizing(config);
      if (pseudonymous ? user === undefined || userId !== undefined : userId === undefined || user !== undefined)
        throw new Error(pseudonymous ? "This server pseudonymizes: give the participant as user, the alias get_submissions gives." : "Give the participant as userId, as get_submissions gives it.");
      refuseAliases(config, grading.feedback, ...Object.values(grading.fields ?? {}).flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v : [])));
      const [context, siteUrl] = await onSite(config, browser);
      const graded = await gradeSubmission(context, siteUrl, assignmentId, user !== undefined ? await userIdOf(siteUrl, user) : userId!, grading);
      // The driver's message names the user id: the agent gets the alias it gave instead.
      return reply({ ...graded, changed: `Graded ${user ?? `user ${userId}`} in assignment ${assignmentId}${grading.feedback !== undefined ? ", with feedback" : ""}.` });
    },
  );
};
