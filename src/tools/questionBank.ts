// The question bank tools: banks, their questions, importing and creating questions.
import { z } from "zod";
import { QUESTION_TYPES, createQuestion, deleteQuestions, importQuestions, questionBanks, questionTypes, questions, setQuestionStatus, updateQuestion } from "@falkenslab/moodle-driver";
import { formSettings } from "./courseSettings.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";
import { more, pageInputs, pagedText } from "./paging.js";

const bankId = z.number().int().positive().describe("The bank's id (a course module id), as list_question_banks gives it");
const categoryId = z.number().int().positive().optional().describe("The bank category, as list_questions gives it; the bank's default when missing");

/** What create_question and update_question share, beyond the type, name and text. */
const questionFields = {
  answers: z
    .array(
      z.object({
        text: z.string(),
        fraction: z.number().min(-1).max(1).describe("Its share of the mark: 1 right, 0 wrong, negatives as penalties (the nearest one Moodle offers)"),
        feedback: z.string().optional(),
        tolerance: z.number().min(0).optional().describe("Numerical answers: the error accepted"),
      }),
    )
    .optional()
    .describe("Multichoice, shortanswer and numerical answers"),
  correct: z.boolean().optional().describe("Truefalse: the right answer"),
  pairs: z.array(z.object({ question: z.string(), answer: z.string() })).optional().describe("match, ddmatch: each question and its answer; an answer without a question is a distractor"),
  choose: z.number().int().positive().optional().describe("randomsamatch: how many short-answer questions of the category it draws"),
  choices: z
    .array(z.object({ text: z.string(), group: z.number().int().positive().optional().describe("Choices of one group go in the same places (1 by default)"), unlimited: z.boolean().optional().describe("ddwtos: usable more than once") }))
    .optional()
    .describe("ddwtos, gapselect: the choices [[1]], [[2]]… in the text name, by position"),
  image: z.string().optional().describe("ddimageortext, ddmarker: the background image, an absolute local path"),
  drags: z
    .array(z.object({ text: z.string().optional().describe("A word, or an image's alternative text"), image: z.string().optional().describe("Or an absolute local image"), group: z.number().int().positive().optional(), unlimited: z.boolean().optional() }))
    .optional()
    .describe("ddimageortext: the draggable items"),
  markers: z.array(z.object({ text: z.string(), count: z.number().int().positive().optional().describe("How many times it can be placed; unlimited by default") })).optional().describe("ddmarker: the markers"),
  drops: z
    .array(
      z.object({
        choice: z.number().int().positive().describe("The item or marker that goes there, from 1, in the order given"),
        left: z.number().optional().describe("ddimageortext: the zone's left, in the image's pixels"),
        top: z.number().optional(),
        label: z.string().optional().describe("ddimageortext: the zone's label, for screen readers"),
        shape: z.enum(["circle", "rectangle", "polygon"]).optional().describe("ddmarker"),
        coords: z.string().optional().describe('ddmarker: a circle "x,y;r", a rectangle "x,y;width,height", a polygon "x1,y1;x2,y2;…"'),
      }),
    )
    .optional()
    .describe("ddimageortext, ddmarker: where the items or markers go"),
  items: z.array(z.string()).optional().describe("ordering: the items, in the right order"),
  wildcards: z
    .array(
      z.object({
        name: z.string(),
        min: z.number().optional(),
        max: z.number().optional(),
        decimals: z.number().int().min(0).optional(),
        distribution: z.enum(["uniform", "loguniform"]).optional(),
        values: z.array(z.number()).optional().describe("Given values, one per set, instead of a range"),
      }),
    )
    .optional()
    .describe("calculated, calculatedsimple, calculatedmulti: each {wildcard}'s values; Moodle's 1 to 10 without them"),
  sets: z.number().int().positive().optional().describe("Calculated types: how many sets of values (10 by default)"),
  coderunner: z
    .object({
      type: z.string().describe('Its CodeRunner type: the language and how it runs ("python3"…)'),
      answer: z.string().optional().describe("A sample answer it's checked with when saved"),
      testCases: z.array(z.object({ code: z.string(), expected: z.string(), stdin: z.string().optional(), extra: z.string().optional(), useAsExample: z.boolean().optional(), mark: z.number().optional() })).min(1),
    })
    .optional()
    .describe("coderunner (a plugin)"),
  formulas: z
    .object({
      randomVariables: z.string().optional(),
      globalVariables: z.string().optional(),
      parts: z
        .array(z.object({ answer: z.string(), text: z.string().optional(), mark: z.number().optional(), unit: z.string().optional(), localVariables: z.string().optional(), gradingVariables: z.string().optional(), gradingCriterion: z.string().optional(), feedback: z.string().optional() }))
        .min(1),
    })
    .optional()
    .describe("formulas (a plugin)"),
  categoryId,
  defaultMark: z.number().positive().optional(),
  fields: formSettings.describe("Any other field of the type's form, by name"),
};

const question = z.object({
  id: z.number().int().describe("The question's id, which add_questions_to_quiz takes"),
  name: z.string(),
  type: z.string().describe('"multichoice", "truefalse", "shortanswer", "essay"…'),
  status: z.string().optional().describe('"ready" or "draft"'),
  version: z.string().optional(),
  categoryId: z.number().int(),
});

export const registerListQuestionBanks: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_question_banks",
    {
      title: "List a course's question banks",
      description:
        "List the question banks of a course: its shared banks (usable by any quiz in the course) and the activities' own banks (a quiz's, usable only there). Returns their ids, which list_questions, import_questions and create_question take. On Moodle 4.x a course has one bank, its own, whose id is the course's.",
      inputSchema: { courseId: z.number().int().positive() },
      outputSchema: { banks: z.array(z.object({ id: z.number().int(), name: z.string(), type: z.string().describe('"qbank" for a shared bank, "quiz"… for an activity\'s own'), shared: z.boolean() })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => reply({ banks: await questionBanks(...(await onSite(config, browser)), courseId) }),
  );
};

export const registerListQuestionTypes: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_question_types",
    {
      title: "List the question types the site offers",
      description: `List the question types the site has enabled, as the bank's "Create a new question" chooser offers them to you: each one's internal name (the type create_question takes), the name and description Moodle shows, whether it's a plugin, and its group ("question" for the types that ask something, "other" for a description). Check it before choosing a question type: it may hold more types than create_question can make (${QUESTION_TYPES.length} of them) or fewer, and it works in a course with no questions yet. Empty when you may see the bank but not add questions to it. Takes the bank id from list_question_banks.`,
      inputSchema: { bankId },
      outputSchema: {
        types: z.array(
          z.object({
            type: z.string().describe('Moodle\'s internal name: "multichoice", "coderunner"…'),
            name: z.string().describe("The name Moodle shows, in the site's language"),
            summary: z.string(),
            plugin: z.boolean().describe("An installed plugin, not one of Moodle's own types"),
            group: z.enum(["question", "other"]),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bankId }) => reply({ types: await questionTypes(...(await onSite(config, browser)), bankId) }),
  );
};

export const registerListQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_questions",
    {
      title: "List a bank's questions",
      description: `List a question bank's categories and the questions in them, category by category: id, name, type, status and category. ${pagedText("questions", 100)} Takes the bank id from list_question_banks.`,
      inputSchema: { bankId, ...pageInputs("questions", 100, 1000, ", category by category") },
      outputSchema: { categories: z.array(z.object({ id: z.number().int(), name: z.string() })), questions: z.array(question), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bankId: id, limit = 100, offset }) => {
      const { categories, questions: page } = await questions(...(await onSite(config, browser)), id, { limit, offset });
      return reply({ categories, questions: page.items, more: page.more });
    },
  );
};

export const registerImportQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "import_questions",
    {
      title: "Import questions into a bank",
      description:
        "Import questions into a question bank from GIFT or Moodle XML, given as text or as a local file, through the bank's import form: the way to add several at once. Moodle checks the whole file first: when it can't parse it, nothing is imported and its messages come back. Returns the questions created. Changes the bank: confirm with the person first.",
      inputSchema: {
        bankId,
        format: z.enum(["gift", "xml"]),
        text: z.string().min(1).optional().describe("The questions in that format"),
        file: z.string().optional().describe("Or an absolute path to a local file in that format"),
        categoryId,
      },
      outputSchema: { changed: z.string(), questions: z.array(question) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ bankId: id, ...input }) => {
      if ((input.text === undefined) === (input.file === undefined)) throw new Error("Give the questions either as text or as a file, one of them.");
      return reply(await importQuestions(...(await onSite(config, browser)), id, input));
    },
  );
};

export const registerCreateQuestion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_question",
    {
      title: "Create a question in a bank",
      description:
        "Create one question in a question bank through its type's form, of any type: multichoice, truefalse, shortanswer, numerical, essay, calculated (simple and multichoice too), match, randomsamatch, drag and drop into text (ddwtos), onto an image (ddimageortext), markers (ddmarker), select missing words (gapselect), Cloze (multianswer, its answers in the text), ordering, description, and the plugins coderunner, formulas, gapfill and ddmatch where the site has them. Each type takes its own inputs, checked before Moodle. The text holds the type's places: [[1]] for ddwtos and gapselect, {1:SHORTANSWER:=Paris} for Cloze, [gaps] for gapfill, {wildcards} for calculated. For several, import_questions is faster. Returns the new question's id. Changes the bank: confirm with the person first.",
      inputSchema: {
        bankId,
        type: z.enum(QUESTION_TYPES),
        name: z.string().min(1),
        text: z.string().min(1).describe("The question text (HTML)"),
        ...questionFields,
      },
      outputSchema: { changed: z.string(), questionId: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ bankId: id, ...input }) => reply(await createQuestion(...(await onSite(config, browser)), id, input)),
  );
};

export const registerUpdateQuestion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "update_question",
    {
      title: "Change a question in a bank",
      description:
        "Change a question of a bank through its type's form, with create_question's inputs: only what's given changes (a list given, such as answers, pairs, choices, items, drags, markers, drops or a wildcard's values, replaces the question's). Saving makes a new version with its own id, the one returned, which quizzes using the latest version get from then on. Changes the bank: confirm with the person first.",
      inputSchema: {
        bankId,
        questionId: z.number().int().positive().describe("As list_questions gives it"),
        name: z.string().min(1).optional(),
        text: z.string().min(1).optional().describe("The question text (HTML)"),
        ...questionFields,
      },
      outputSchema: { changed: z.string(), questionId: z.number().int().optional().describe("The new version's id") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ bankId: id, questionId, ...input }) => reply(await updateQuestion(...(await onSite(config, browser)), id, questionId, input)),
  );
};

export const registerDeleteQuestions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_questions",
    {
      title: "Delete questions from a bank",
      description: "Delete questions from a bank, every version of each, as the bank's delete action does. Moodle doesn't delete a question a quiz uses: it hides it, and hidden lists those. Can't be undone: confirm with the person first.",
      inputSchema: { bankId, questionIds: z.array(z.number().int().positive()).min(1).describe("As list_questions gives them") },
      outputSchema: { changed: z.string(), deleted: z.array(z.number().int()), hidden: z.array(z.number().int()).describe("Used by a quiz: hidden instead of deleted") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ bankId: id, questionIds }) => reply(await deleteQuestions(...(await onSite(config, browser)), id, questionIds)),
  );
};

export const registerSetQuestionStatus: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_question_status",
    {
      title: "Set a question ready or draft",
      description: "Set a bank question ready (quizzes can use it) or draft, as the bank's status menu does.",
      inputSchema: { questionId: z.number().int().positive().describe("As list_questions gives it"), status: z.enum(["ready", "draft"]) },
      outputSchema: { changed: z.string(), questionId: z.number().int(), status: z.enum(["ready", "draft"]) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ questionId, status }) => reply(await setQuestionStatus(...(await onSite(config, browser)), questionId, status)),
  );
};
