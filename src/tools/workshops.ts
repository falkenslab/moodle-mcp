// Workshops as a teacher runs them: the phase, every submission and assessment, and assessing one.
// Authors and reviewers as aliases under pseudonymize; titles redacted; no aliases in feedback.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import {
  WORKSHOP_PHASES,
  addWorkshopExample,
  assessWorkshopExample,
  assessWorkshopSubmission,
  calculateWorkshopGrades,
  deleteWorkshopExample,
  editWorkshopExample,
  overrideWorkshopGrade,
  saveWorkshopSubmission,
  setWorkshopPhase,
  workshopExamples,
  workshopInfo,
  workshopSubmission,
  type WorkshopInfo,
} from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { requireSiteUrl } from "../config.js";
import { people, personFields, pseudonymizing, refuseAliases, shown, targetUserId, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const workshopId = z.number().int().positive().describe("The workshop's id (course module id)");

const submissionSchema = z.object({ id: z.number().int(), title: z.string(), author: z.object(personFields), grade: z.number().optional(), gradeOverride: z.number().optional() });
const assessmentSchema = z.object({
  id: z.number().int(),
  submissionId: z.number().int().optional(),
  author: z.object(personFields).optional().describe("The submission's author"),
  reviewer: z.object(personFields).optional(),
  grade: z.number().optional(),
  gradingGrade: z.number().optional().describe("The grade for assessing"),
  gradingGradeOverride: z.number().optional(),
  weight: z.number(),
});

/** A workshop's submissions and assessments as tools give them: people as aliases or names, titles redacted. */
async function shownWorkshop(config: Config, context: BrowserContext, siteUrl: string, info: Pick<WorkshopInfo, "submissions" | "assessments">) {
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
  return { submissions, assessments };
}

/** An assessment as the agent gives it: a grade and comment per criterion, feedback, other fields. */
const assessmentInputs = {
  criteria: z
    .array(z.object({ grade: z.string().optional().describe("Points, or a level's name"), comment: z.string().optional().describe("No aliases in it") }))
    .optional()
    .describe("In the form's order"),
  feedback: z.string().optional().describe("Overall feedback for the author (HTML); no aliases in it"),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Any other field of the form, by name"),
};
type AssessmentInput = { criteria?: { grade?: string; comment?: string }[]; feedback?: string; fields?: Record<string, string | number | boolean | string[]> };
/** The agent's assessment in the driver's terms, checked for aliases first: a number of points as a number. */
function toAssessment(config: Config, { criteria, feedback, fields }: AssessmentInput) {
  refuseAliases(config, feedback, ...(criteria ?? []).map((c) => c.comment));
  const asCriteria = criteria?.map((c) => ({ ...c, ...(c.grade !== undefined && { grade: /^-?\d+(\.\d+)?$/.test(c.grade) ? Number(c.grade) : c.grade }) }));
  return { criteria: asCriteria, feedback, fields };
}

export const registerGetWorkshop: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_workshop",
    {
      title: "Read a workshop",
      description:
        "Read a workshop's phase and its report as a teacher sees it: every submission (author, title, grade once calculated) and every assessment (reviewer, the submission's author, the grade it gives, its weight, the grade for assessing). People as aliases when the server pseudonymizes. Empty lists before the submission phase, or for someone who can't see every submission.",
      inputSchema: { workshopId },
      outputSchema: { activityId: z.number().int(), phase: z.enum(WORKSHOP_PHASES), submissions: z.array(submissionSchema), assessments: z.array(assessmentSchema) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ workshopId: id }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const info = await workshopInfo(context, siteUrl, id);
      return reply({ activityId: info.activityId, phase: info.phase, ...(await shownWorkshop(config, context, siteUrl, info)) });
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
      inputSchema: { workshopId, submissionId: z.number().int().positive().describe("As get_workshop gives it"), ...assessmentInputs },
      outputSchema: { changed: z.string(), assessmentId: z.number().int(), grade: z.number().optional(), maxGrade: z.number().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, submissionId, ...input }) => reply(await assessWorkshopSubmission(...(await onSite(config, browser)), id, submissionId, toAssessment(config, input))),
  );
};

const content = {
  title: z.string().min(1).optional().describe("Its title; a new one needs it"),
  content: z.string().optional().describe("Its text (HTML), where the workshop takes online text; no aliases in it"),
  attachments: z.array(z.string()).optional().describe("Absolute local paths: they replace the files attached before"),
  embed: z.array(z.string()).optional().describe('Absolute local files to embed in the text, which names each by its file name: <img src="shot.png">'),
};
const attachment = z.object({ name: z.string(), url: z.string().optional().describe("None for someone else's when the server pseudonymizes") });
const submissionContent = z.object({
  id: z.number().int(),
  title: z.string(),
  content: z.string().describe("HTML; someone else's redacted when the server pseudonymizes"),
  author: z.object(personFields).optional().describe("Where Moodle shows authors' names"),
  attachments: z.array(attachment),
  editable: z.boolean().describe("Whether the person can edit it now"),
});
const exampleContent = z.object({ id: z.number().int(), title: z.string(), content: z.string(), attachments: z.array(attachment) });

export const registerGetWorkshopSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_workshop_submission",
    {
      title: "Read a workshop submission",
      description:
        "Read a workshop submission as its page shows it: title, text (HTML), attached files, author (an alias when the server pseudonymizes, where Moodle shows authors) and whether the person can edit it now. Without submissionId or author, the person's own (none when they haven't submitted); a teacher reads anyone's, a reviewer those allocated to them.",
      inputSchema: {
        workshopId,
        submissionId: z.number().int().positive().optional().describe("As get_workshop gives it"),
        author: z.string().optional().describe("Or its author's alias, when the server pseudonymizes"),
        authorId: z.number().int().positive().optional().describe("Or its author's user id, when the server shows names"),
      },
      outputSchema: { submission: submissionContent.optional().describe("None when there's no such submission") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, submissionId, author, authorId }) => {
      const byAuthor = author !== undefined || authorId !== undefined ? await targetUserId(config, requireSiteUrl(config), { user: author, userId: authorId }) : undefined;
      const [context, siteUrl] = await onSite(config, browser);
      const found = await workshopSubmission(context, siteUrl, id, { submissionId, authorId: byAuthor });
      if (!found) return reply({});
      const { authorId: who, author: name, ...rest } = found;
      const person = who !== undefined ? (await people(config, context, siteUrl, [{ userId: who, fullName: name ?? "" }]))[0]! : undefined;
      const others = Boolean(person?.alias);
      return reply({
        submission: {
          ...rest,
          ...(person && { author: shown(person) }),
          title: others ? await text(config, siteUrl, rest.title) : rest.title,
          content: others ? await text(config, siteUrl, rest.content) : rest.content,
          attachments: others && pseudonymizing(config) ? await Promise.all(rest.attachments.map(async (a) => ({ name: await text(config, siteUrl, a.name) }))) : rest.attachments,
        },
      });
    },
  );
};

export const registerSaveWorkshopSubmission: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "save_workshop_submission",
    {
      title: "Submit to a workshop",
      description:
        "Add the person's submission to a workshop, or change the one they have, through its submission form: title, text (HTML, with local images embedded), attached local files; only what is given changes (a new one needs a title). Moodle takes it in the submission phase, within its dates. Returns the submission. Reviewers will read it: confirm with the person first.",
      inputSchema: { workshopId, ...content },
      outputSchema: { changed: z.string(), submissionId: z.number().int(), submission: submissionContent },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, ...input }) => {
      refuseAliases(config, input.title, input.content);
      const result = await saveWorkshopSubmission(...(await onSite(config, browser)), id, input);
      const { id: submissionId, title, content: text_, attachments, editable } = result.submission;
      return reply({ changed: result.changed, submissionId: result.submissionId, submission: { id: submissionId, title, content: text_, attachments, editable } });
    },
  );
};

export const registerListWorkshopExamples: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_workshop_examples",
    {
      title: "List a workshop's example submissions",
      description: "List a workshop's example submissions as its page shows a teacher: title, and whether its reference assessment is made, with its grade. Moodle lists them in the setup phase, where the workshop uses examples.",
      inputSchema: { workshopId },
      outputSchema: { examples: z.array(z.object({ id: z.number().int(), title: z.string(), assessed: z.boolean(), grade: z.number().optional(), maxGrade: z.number().optional() })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ workshopId: id }) => reply({ examples: await workshopExamples(...(await onSite(config, browser)), id) }),
  );
};

export const registerAddWorkshopExample: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_workshop_example",
    {
      title: "Add an example submission to a workshop",
      description:
        "Add an example submission to a workshop, for participants to practise assessing: title, text (HTML, with local images embedded) and attached files. Then assess_workshop_example makes its reference assessment. Only where the workshop uses examples. Changes the course: confirm with the person first.",
      inputSchema: { workshopId, ...content, title: z.string().min(1) },
      outputSchema: { changed: z.string(), exampleId: z.number().int(), example: exampleContent },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ workshopId: id, ...input }) => reply(await addWorkshopExample(...(await onSite(config, browser)), id, input)),
  );
};

export const registerEditWorkshopExample: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_workshop_example",
    {
      title: "Change a workshop's example submission",
      description: "Change an example submission: only what is given (attachments replace those there). Changes the course: confirm with the person first.",
      inputSchema: { workshopId, exampleId: z.number().int().positive().describe("As list_workshop_examples gives it"), ...content },
      outputSchema: { changed: z.string(), example: exampleContent },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, exampleId, ...input }) => reply(await editWorkshopExample(...(await onSite(config, browser)), id, exampleId, input)),
  );
};

export const registerDeleteWorkshopExample: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_workshop_example",
    {
      title: "Delete a workshop's example submission",
      description: "Delete an example submission with its assessments (the reference one and participants' practice ones). Can't be undone: confirm with the person first.",
      inputSchema: { workshopId, exampleId: z.number().int().positive().describe("As list_workshop_examples gives it") },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, exampleId }) => reply(await deleteWorkshopExample(...(await onSite(config, browser)), id, exampleId)),
  );
};

export const registerAssessWorkshopExample: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "assess_workshop_example",
    {
      title: "Assess a workshop's example submission",
      description:
        "Assess an example submission through the workshop's assessment form, as assess_workshop_submission does a submission: a teacher's assessment is the reference participants' are compared with; a participant's is their practice, where the workshop lets them assess examples now. Returns the grade it gives.",
      inputSchema: { workshopId, exampleId: z.number().int().positive().describe("As list_workshop_examples gives it"), ...assessmentInputs },
      outputSchema: { changed: z.string(), assessmentId: z.number().int(), grade: z.number().optional(), maxGrade: z.number().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, exampleId, ...input }) => reply(await assessWorkshopExample(...(await onSite(config, browser)), id, exampleId, toAssessment(config, input))),
  );
};

export const registerCalculateWorkshopGrades: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "calculate_workshop_grades",
    {
      title: "Calculate a workshop's grades",
      description:
        "Calculate a workshop's grades in the evaluation phase, as \"Re-calculate grades\" does: each submission's grade from its assessments, each assessment's grade for assessing by the workshop's evaluation method, comparison its strictness. Overridden grades stay. Returns the submissions and assessments with their grades (people as aliases when the server pseudonymizes). Students will see the grades once the workshop is closed: confirm with the person first.",
      inputSchema: { workshopId, comparison: z.enum(["very strict", "strict", "fair", "lax", "very lax"]).optional().describe("How strictly assessments are compared with the best one; the form keeps the last one used") },
      outputSchema: { changed: z.string(), comparison: z.enum(["very strict", "strict", "fair", "lax", "very lax"]).optional(), phase: z.enum(WORKSHOP_PHASES), submissions: z.array(submissionSchema), assessments: z.array(assessmentSchema) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, comparison }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const result = await calculateWorkshopGrades(context, siteUrl, id, { comparison });
      return reply({ changed: result.changed, ...(result.comparison && { comparison: result.comparison }), phase: result.phase, ...(await shownWorkshop(config, context, siteUrl, result)) });
    },
  );
};

export const registerOverrideWorkshopGrade: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "override_workshop_grade",
    {
      title: "Override a workshop grade",
      description:
        "Override a grade Moodle calculated in a workshop: a submission's grade, or an assessment's grade for assessing (give one of the two ids, from get_workshop), with feedback for the author or the reviewer; remove: true takes the override away, so the calculated grade counts again. Returns the submission or assessment afterwards. Students see it: confirm with the person first.",
      inputSchema: {
        workshopId,
        submissionId: z.number().int().positive().optional(),
        assessmentId: z.number().int().positive().optional(),
        grade: z.number().int().min(0).optional().describe("A whole number up to the workshop's grade for submission (or for assessment)"),
        remove: z.boolean().optional().describe("Take the override away instead"),
        feedback: z.string().optional().describe("HTML; no aliases in it"),
      },
      outputSchema: { changed: z.string(), submission: submissionSchema.optional(), assessment: assessmentSchema.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId: id, submissionId, assessmentId, grade, remove, feedback }) => {
      if ((submissionId === undefined) === (assessmentId === undefined)) throw new Error("Give submissionId or assessmentId, one of them.");
      if ((grade === undefined) === !remove) throw new Error("Give the grade, or remove: true to take the override away.");
      refuseAliases(config, feedback);
      const [context, siteUrl] = await onSite(config, browser);
      const result = await overrideWorkshopGrade(context, siteUrl, id, { submissionId, assessmentId, grade: remove ? null : grade!, feedback });
      const shown_ = await shownWorkshop(config, context, siteUrl, { submissions: result.submission ? [result.submission] : [], assessments: result.assessment ? [result.assessment] : [] });
      return reply({ changed: result.changed, ...(shown_.submissions[0] && { submission: shown_.submissions[0] }), ...(shown_.assessments[0] && { assessment: shown_.assessments[0] }) });
    },
  );
};
