// get_survey and submit_survey: the questionnaire plugin and Moodle's feedback, through their forms.
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { getSurvey, submitSurvey } from "@falkenslab/moodle-driver";
import type { RegisterTool } from "./types.js";

const activityId = z.number().int().positive().describe("The survey's id (course module id), as get_course_structure gives it");
const type = z.enum(["questionnaire", "feedback"]).describe("The activity's type, as get_course_structure gives it");

const field = z.object({
  name: z.string().describe("The field's form name: submit_survey takes it"),
  kind: z.enum(["choice", "checkbox", "text", "select"]).describe('choice and select: one option\'s value; checkbox: "1" or "0"; text: free text or a number'),
  label: z.string().optional().describe("A checkbox's option, or a rating row's item"),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  value: z.string().optional(),
});

const reply = <T extends Record<string, unknown>>(output: T) => ({ content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output });

export const registerGetSurvey: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_survey",
    {
      title: "Get a survey's questions",
      description:
        "Read a survey (the questionnaire plugin, or Moodle's feedback) as the person: whether they can answer it now, its messages (completed, closed…), and every question on every page, with whether it's required and its fields (names, options).",
      inputSchema: { activityId, type },
      outputSchema: {
        canAnswer: z.boolean(),
        intro: z.string(),
        messages: z.array(z.string()),
        questions: z.array(z.object({ page: z.number().int(), number: z.string().optional(), text: z.string(), required: z.boolean(), fields: z.array(field) })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId, type }) => reply({ ...(await getSurvey(await browser.context(), requireSiteUrl(config), activityId, type)) }),
  );
};

export const registerSubmitSurvey: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "submit_survey",
    {
      title: "Answer and submit a survey",
      description:
        'Answer a survey and submit it, page by page as its form goes: responses maps field names (from get_survey) to values ("1"/"0" for checkboxes, an option\'s value for choices and selects, text otherwise). Every name is checked first; Moodle\'s complaints (a required question left out) come back by page. Usually one response per person: confirm the answers with the person first, and ask them for personal data instead of guessing.',
      inputSchema: { activityId, type, responses: z.record(z.string(), z.string()) },
      outputSchema: { changed: z.string(), messages: z.array(z.string()).describe("The survey's page afterwards") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ activityId, type, responses }) => {
      const { messages } = await submitSurvey(await browser.context(), requireSiteUrl(config), activityId, type, responses);
      return reply({ changed: `Submitted ${type} ${activityId}.`, messages });
    },
  );
};
