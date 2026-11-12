// A questionnaire's (mod_questionnaire) questions as its teacher builds them: reading them, and adding
// questions of its own types, page breaks among them.
import { z } from "zod";
import { addQuestionnaireQuestions, questionnaireQuestions } from "../driver.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const questionnaireId = z.number().int().positive().describe("The questionnaire's id (course module id), as get_course_structure gives it");
const TYPES = ["yesno", "text", "essay", "radio", "check", "drop", "rate", "date", "numeric", "slider", "file", "label", "pagebreak"] as const;
// The driver builds every type but these two yet.
const ADDABLE = ["yesno", "text", "essay", "radio", "check", "drop", "rate", "date", "numeric", "label", "pagebreak"] as const;
const RATE_KINDS = ["normal", "na-column", "no-duplicates", "osgood"] as const;

// What a type's settings are, for reading and for adding.
const settings = {
  choices: z.array(z.string()).optional().describe('Radio, check, drop and rate: its choices (a rate\'s rows) in order, one line each; "!other=Other:" adds an "Other" field'),
  horizontal: z.boolean().optional().describe("Radio: side by side"),
  minChecked: z.number().int().min(0).optional().describe("Check: how many must be ticked at least (0, no limit)"),
  maxChecked: z.number().int().min(0).optional().describe("Check: at most (0, no limit)"),
  width: z.number().int().positive().optional().describe("Text: the box's width"),
  maxLength: z.number().int().min(0).optional().describe("Text: the most characters it takes"),
  lines: z.number().int().positive().optional().describe("Essay: how many lines it shows"),
  editor: z.boolean().optional().describe("Essay: an HTML editor, else plain text"),
  maxDigits: z.number().int().positive().optional().describe("Numeric: its most digits"),
  decimals: z.number().int().min(0).optional().describe("Numeric: its decimal places"),
  scale: z.number().int().positive().optional().describe("Rate: how many values its scale has"),
  rateKind: z.enum(RATE_KINDS).optional().describe('Rate: "normal", "na-column" (a not applicable column), "no-duplicates" or "osgood" (two opposite ends)'),
  namedDegrees: z.array(z.object({ value: z.number().int(), text: z.string() })).optional().describe("Rate: texts shown instead of some values"),
};

const question = z.object({
  id: z.number().int(),
  type: z.enum(TYPES),
  position: z.number().int().describe("Its place, from 1, page breaks counted"),
  page: z.number().int().describe("The page it's on, from 1; a page break's is the page it starts"),
  name: z.string().describe("Its short name for reports; empty when none"),
  question: z.string().describe("Its text as HTML; a label's contents; empty for a page break"),
  required: z.boolean(),
  ...settings,
});

export const registerGetQuestionnaireQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_questionnaire_questions",
    {
      title: "Get a questionnaire's questions",
      description:
        "A Questionnaire activity's questions as its teacher defines them, in order and page by page: each one's id, type, place, page, name, text, whether it's required, its choices and its type's settings; page breaks are listed too. For the questions as a participant answers them, get_survey.",
      inputSchema: { questionnaireId },
      outputSchema: { questions: z.array(question) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ questionnaireId }) => reply({ questions: await questionnaireQuestions(...(await onSite(config, browser)), questionnaireId) }),
  );
};

export const registerAddQuestionnaireQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_questionnaire_questions",
    {
      title: "Add questions to a questionnaire",
      description:
        'Add questions to a Questionnaire activity, after those it has, in the order given: yes/no, text, essay, radio, check, drop (a drop-down), rate, date, numeric, label (text between questions), and "pagebreak" to start a new page (not first, last nor two in a row). Everything is checked before anything is saved. A questionnaire someone has answered is refused unless evenWithResponses: their responses stay without the new questions. Returns the new questions\' ids and every question afterwards. Changes the course: confirm with the person first.',
      inputSchema: {
        questionnaireId,
        questions: z
          .array(
            z.object({
              type: z.enum(ADDABLE),
              question: z.string().optional().describe("Its text (HTML); every type but a page break needs one (a label's contents)"),
              name: z.string().optional().describe("A short name for reports"),
              required: z.boolean().optional().describe("Not for labels and page breaks; not required when missing"),
              ...settings,
            }),
          )
          .min(1),
        evenWithResponses: z.boolean().optional().describe("Add them even when people have answered"),
      },
      outputSchema: { changed: z.string(), questionIds: z.array(z.number().int()), questions: z.array(question) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ questionnaireId, questions, evenWithResponses }) =>
      reply(await addQuestionnaireQuestions(...(await onSite(config, browser)), questionnaireId, questions, evenWithResponses === undefined ? {} : { evenWithResponses })),
  );
};
