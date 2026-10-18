// A quiz's statistics report: how each question works. Aggregates only; responses others gave
// redacted under pseudonymize.
import { z } from "zod";
import { quizStatistics, type QuizQuestionStatistics } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const responseCount = z.object({
  part: z.string().optional(),
  model: z.string().optional(),
  response: z.string().optional().describe("As given; redacted when the server pseudonymizes"),
  credit: z.string().optional(),
  count: z.number().int(),
  tries: z.array(z.number().int()).optional(),
  frequency: z.string().optional(),
});
const questionFields = {
  number: z.string().optional(),
  name: z.string(),
  type: z.string().optional(),
  questionId: z.number().int().optional(),
  variant: z.number().int().optional(),
  attempts: z.string().optional(),
  facility: z.string().optional().describe("Facility index: how many got it right"),
  standardDeviation: z.string().optional(),
  randomGuessScore: z.string().optional(),
  intendedWeight: z.string().optional(),
  effectiveWeight: z.string().optional(),
  discriminationIndex: z.string().optional(),
  discriminativeEfficiency: z.string().optional(),
  dubious: z.literal(true).optional().describe("Moodle marks it as possibly not pulling its weight"),
  responses: z.array(responseCount).optional(),
};
const figure = z.string().optional();

async function redactResponses(config: Config, siteUrl: string, q: QuizQuestionStatistics) {
  return { ...q, ...(q.responses && { responses: await Promise.all(q.responses.map(async (r) => ({ ...r, ...(r.response !== undefined && { response: await text(config, siteUrl, r.response) }) }))) }) };
}

export const registerGetQuizStatistics: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_quiz_statistics",
    {
      title: "Read a quiz's statistics",
      description:
        "Read a quiz's statistics report, which tells which questions work: the quiz's figures (attempts, averages, median, standard deviation, skewness, kurtosis, internal consistency, error ratio, standard error) and per question its facility index, standard deviation, weights, discrimination index and efficiency, dubious ones marked; a random slot's questions and variants each with their own; with responses, how often each response was given (one page read per question). Figures as the report shows them. attempts chooses which attempts count; recalculate clears what Moodle stored. Aggregates only: no person.",
      inputSchema: {
        quizId: z.number().int().positive().describe("The quiz's id (course module id), as get_course_structure gives it"),
        attempts: z.enum(["highest", "all", "first", "last"]).optional().describe("The quiz's grading method by default"),
        recalculate: z.boolean().optional().describe("Calculate again now, for attempts finished since"),
        responses: z.boolean().optional().describe("Also each question's analysis of responses"),
      },
      outputSchema: {
        quiz: z.object({ id: z.number().int() }),
        attempts: z.enum(["highest", "all", "first", "last"]).optional(),
        calculatedNow: z.boolean(),
        calculated: z.object({ ago: z.string(), attemptsSince: z.number().int() }).optional().describe("When Moodle calculated what it stored, and attempts since"),
        figures: z.object({
          firstAttemptsCount: z.number().int().optional(),
          allAttemptsCount: z.number().int().optional(),
          firstAttemptsAverage: figure,
          allAttemptsAverage: figure,
          lastAttemptsAverage: figure,
          highestAttemptsAverage: figure,
          median: figure,
          standardDeviation: figure,
          skewness: figure,
          kurtosis: figure,
          internalConsistency: figure.describe("Cronbach's alpha"),
          errorRatio: figure,
          standardError: figure,
        }),
        questions: z.array(z.object({ slot: z.number().int(), ...questionFields, parts: z.array(z.object(questionFields)).optional().describe("A random slot's questions, or the variants") })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ quizId, ...options }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const report = await quizStatistics(context, siteUrl, quizId, options);
      const questions = await Promise.all(
        report.questions.map(async (q) => ({ ...(await redactResponses(config, siteUrl, q)), slot: q.slot, ...(q.parts && { parts: await Promise.all(q.parts.map((p) => redactResponses(config, siteUrl, p))) }) })),
      );
      return reply({ ...report, questions });
    },
  );
};
