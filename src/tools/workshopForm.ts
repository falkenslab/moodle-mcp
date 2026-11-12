// A workshop's assessment form, for its grading strategy: reading it and setting its aspects,
// assertions or criteria, as its "Assessment form" page does.
import { z } from "zod";
import { setWorkshopForm, workshopForm } from "../driver.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const workshopId = z.number().int().positive().describe("The workshop's id (course module id)");
const STRATEGIES = ["accumulative", "comments", "numerrors", "rubric"] as const;

const form = {
  activityId: z.number().int(),
  strategy: z.enum(STRATEGIES),
  criteria: z
    .array(
      z.object({
        id: z.number().int(),
        description: z.string().describe("HTML"),
        maxGrade: z.number().optional().describe("Accumulative: the best grade in points"),
        scaleId: z.number().int().optional().describe("Accumulative: the scale it's graded on, instead of points"),
        scale: z.string().optional(),
        weight: z.number().optional().describe("Accumulative and number of errors"),
        errorWord: z.string().optional().describe("Number of errors: the word for a failed assertion"),
        successWord: z.string().optional().describe("Number of errors: the word for a held assertion"),
        levels: z.array(z.object({ id: z.number().int(), grade: z.number(), definition: z.string() })).optional().describe("Rubric: in their grades' order"),
      }),
    )
    .describe("Its aspects (accumulative, comments), assertions (number of errors) or criteria (rubric), in order"),
  gradeMapping: z.array(z.object({ errors: z.number().int(), grade: z.number() })).optional().describe("Number of errors: the grade (a percentage) for each number of errors set"),
  layout: z.enum(["list", "grid"]).optional().describe("Rubric: how assessors see it"),
};

export const registerGetWorkshopAssessmentForm: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_workshop_assessment_form",
    {
      title: "Get a workshop's assessment form",
      description:
        "A workshop's assessment form: its grading strategy and its aspects, assertions or criteria in order, each with what the strategy gives it (a best grade or a scale and a weight; a weight and its two words; a rubric's levels), the number-of-errors grade mapping and the rubric's layout. Read before set_workshop_assessment_form.",
      inputSchema: { workshopId },
      outputSchema: form,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ workshopId }) => reply(await workshopForm(...(await onSite(config, browser)), workshopId)),
  );
};

export const registerSetWorkshopAssessmentForm: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_workshop_assessment_form",
    {
      title: "Set a workshop's assessment form",
      description:
        "Set a workshop's assessment form: the aspects (accumulative, comments), assertions (numerrors) or criteria (rubric) given, in order, replace those there. The strategy must be the workshop's own, chosen in its settings (update_activity). Accumulative takes a best grade (or a scale) and a weight per aspect; numerrors a weight and, optionally, its two words, and a grade for each number of errors; rubric its levels per criterion, each with a grade from 0 to 100, and the layout. Refused once assessments exist, unless evenIfAssessed: their grades then stay as they were given. Returns the form afterwards. Changes the course: confirm with the person first.",
      inputSchema: {
        workshopId,
        strategy: z.enum(STRATEGIES).describe("The workshop's grading strategy"),
        criteria: z
          .array(
            z.object({
              description: z.string().min(1).describe("HTML"),
              maxGrade: z.number().int().positive().optional().describe("Accumulative: the best grade in points; 10 when missing"),
              scaleId: z.number().int().positive().optional().describe("Accumulative: a course scale instead of points (list_scales)"),
              weight: z.number().int().min(0).max(16).optional().describe("Accumulative and number of errors: 1 when missing"),
              errorWord: z.string().optional().describe('Number of errors: the word when the assertion fails; "No" when missing'),
              successWord: z.string().optional().describe('Number of errors: the word when it holds; "Yes" when missing'),
              levels: z
                .array(z.object({ grade: z.number().min(0).max(100).describe("Unique in its criterion"), definition: z.string().min(1) }))
                .min(1)
                .optional()
                .describe("Rubric: its levels"),
            }),
          )
          .min(1),
        gradeMapping: z
          .array(z.object({ errors: z.number().int().positive(), grade: z.number().min(0).max(100).describe("A percentage of the grade for submission") }))
          .optional()
          .describe("Number of errors: the grade for each number of weighted errors; Moodle's proportional default for those missing"),
        layout: z.enum(["list", "grid"]).optional().describe("Rubric: how assessors see it; as it is when missing"),
        evenIfAssessed: z.boolean().optional().describe("Change it even when assessments made with it exist"),
      },
      outputSchema: { changed: z.string(), ...form },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ workshopId, ...input }) => reply(await setWorkshopForm(...(await onSite(config, browser)), workshopId, input)),
  );
};
