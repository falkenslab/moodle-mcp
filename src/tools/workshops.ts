// Workshops as a teacher runs them: the phase, every submission and assessment, and assessing one.
// Authors and reviewers as aliases under pseudonymize; titles redacted; no aliases in feedback.
import { z } from "zod";
import { WORKSHOP_PHASES, assessWorkshopSubmission, setWorkshopPhase, workshopInfo } from "@falkenslab/moodle-driver";
import { people, personFields, refuseAliases, shown, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const workshopId = z.number().int().positive().describe("The workshop's id (course module id)");

export const registerGetWorkshop: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_workshop",
    {
      title: "Read a workshop",
      description:
        "Read a workshop's phase and its report as a teacher sees it: every submission (author, title, grade once calculated) and every assessment (reviewer, the submission's author, the grade it gives, its weight, the grade for assessing). People as aliases when the server pseudonymizes. Empty lists before the submission phase, or for someone who can't see every submission.",
      inputSchema: { workshopId },
      outputSchema: {
        activityId: z.number().int(),
        phase: z.enum(WORKSHOP_PHASES),
        submissions: z.array(z.object({ id: z.number().int(), title: z.string(), author: z.object(personFields), grade: z.number().optional(), gradeOverride: z.number().optional() })),
        assessments: z.array(
          z.object({
            id: z.number().int(),
            submissionId: z.number().int().optional(),
            author: z.object(personFields).optional().describe("The submission's author"),
            reviewer: z.object(personFields).optional(),
            grade: z.number().optional(),
            gradingGrade: z.number().optional().describe("The grade for assessing"),
            gradingGradeOverride: z.number().optional(),
            weight: z.number(),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ workshopId: id }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const info = await workshopInfo(context, siteUrl, id);
      const everyone = new Map<number, { userId: number; fullName: string }>();
      for (const s of info.submissions) everyone.set(s.authorId, { userId: s.authorId, fullName: s.author });
      for (const a of info.assessments) {
        if (a.authorId && a.author) everyone.set(a.authorId, { userId: a.authorId, fullName: a.author });
        if (a.reviewerId && a.reviewer) everyone.set(a.reviewerId, { userId: a.reviewerId, fullName: a.reviewer });
      }
      const list = [...everyone.values()];
      const who = await people(config, context, siteUrl, list);
      const byId = new Map(list.map((p, i) => [p.userId, shown(who[i]!)]));
      const submissions = await Promise.all(
        info.submissions.map(async (s) => ({ id: s.id, title: await text(config, siteUrl, s.title), author: byId.get(s.authorId)!, grade: s.grade, gradeOverride: s.gradeOverride })),
      );
      const assessments = info.assessments.map((a) => ({
        id: a.id,
        submissionId: a.submissionId,
        ...(a.authorId && { author: byId.get(a.authorId) }),
        ...(a.reviewerId && { reviewer: byId.get(a.reviewerId) }),
        grade: a.grade,
        gradingGrade: a.gradingGrade,
        gradingGradeOverride: a.gradingGradeOverride,
        weight: a.weight,
      }));
      return reply({ activityId: info.activityId, phase: info.phase, submissions, assessments });
    },
  );
};

export const registerSetWorkshopPhase: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_workshop_phase",
    {
      title: "Switch a workshop's phase",
      description: "Switch a workshop to a phase (setup, submission, assessment, evaluation, closed), forwards or back, as its page's phase links do. Moodle allocates nothing and calculates no grades on its own when it switches. Changes what students can do: confirm with the person first.",
      inputSchema: { workshopId, phase: z.enum(WORKSHOP_PHASES) },
      outputSchema: { changed: z.string(), phase: z.enum(WORKSHOP_PHASES) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, phase }) => reply(await setWorkshopPhase(...(await onSite(config, browser)), id, phase)),
  );
};

export const registerAssessWorkshopSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "assess_workshop_submission",
    {
      title: "Assess a workshop submission",
      description:
        "Assess a workshop submission as the person, through the workshop's assessment form (its grading strategy's): a grade and comment per criterion in the form's order, overall feedback for the author (HTML), and any other field by name. A new assessment the first time, the same one changed after. Only in the assessment phase. Returns the grade it gives. The author reads it: confirm with the person first.",
      inputSchema: {
        workshopId,
        submissionId: z.number().int().positive().describe("As get_workshop gives it"),
        criteria: z
          .array(z.object({ grade: z.string().optional().describe("Points, or a level's name"), comment: z.string().optional().describe("No aliases in it") }))
          .optional()
          .describe("In the form's order"),
        feedback: z.string().optional().describe("Overall feedback for the author (HTML); no aliases in it"),
        fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Any other field of the form, by name"),
      },
      outputSchema: { changed: z.string(), assessmentId: z.number().int(), grade: z.number().optional(), maxGrade: z.number().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, submissionId, criteria, feedback, fields }) => {
      refuseAliases(config, feedback, ...(criteria ?? []).map((c) => c.comment));
      const asCriteria = criteria?.map((c) => ({ ...c, ...(c.grade !== undefined && { grade: /^-?\d+(\.\d+)?$/.test(c.grade) ? Number(c.grade) : c.grade }) }));
      return reply(await assessWorkshopSubmission(...(await onSite(config, browser)), id, submissionId, { criteria: asCriteria, feedback, fields }));
    },
  );
};
