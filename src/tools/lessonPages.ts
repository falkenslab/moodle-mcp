// A lesson's pages, as its teacher builds them in Moodle's lesson editor: content pages with their
// buttons, question pages with their answers, and the jumps between them.
import { z } from "zod";
import { LESSON_JUMPS, LESSON_PAGE_TYPES, addLessonPage, deleteLessonPage, editLessonPage, lessonPages, moveLessonPage, type LessonJump, type LessonPageDefinition } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const lessonId = z.number().int().positive().describe("The lesson's id (course module id), as get_course_structure gives it");
const pageId = z.number().int().positive().describe("The page's id, as get_lesson_pages gives it");
const JUMP_NAMES = Object.keys(LESSON_JUMPS);
const jumpTo = z
  .string()
  .regex(new RegExp(`^(\\d+|${JUMP_NAMES.join("|")})$`))
  .describe(`Where it leads: a page's id, or one of ${JUMP_NAMES.join(", ")}`);
const after = z.number().int().min(0).optional().describe("The page it goes after (0: first); last without it");

/** A jump as the agent gives it: a page's id in digits, or a jump's name. */
const toJump = (jump: string): LessonJump => (/^\d+$/.test(jump) ? Number(jump) : (jump as keyof typeof LESSON_JUMPS));

const answer = {
  text: z.string().optional().describe("The answer (HTML for multichoice, true/false and matching). Matching: the first two rows' are the responses to a right and a wrong match, the pairs' the questions"),
  response: z.string().optional().describe("The response shown after it (HTML); a matching pair's, the answer that matches its text"),
  score: z.number().optional().describe("Its score, with the lesson's custom scoring"),
  others: z.boolean().optional().describe('Short answer and numerical: the row for any other answer ("All other answers")'),
};

const page = z.object({
  id: z.number().int(),
  type: z.enum(LESSON_PAGE_TYPES),
  title: z.string(),
  contents: z.string().describe("HTML"),
  buttons: z.array(z.object({ label: z.string(), jumpTo: z.string() })).optional().describe("A content page's buttons"),
  answers: z.array(z.object({ ...answer, jumpTo: z.string().optional() })).optional().describe("A question's answers, or the single row of an essay or structural page"),
  multipleAnswers: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
});

/** A page with its jumps as text, as the output schema has them. */
function shownPage(p: LessonPageDefinition) {
  return {
    ...p,
    ...(p.buttons && { buttons: p.buttons.map((b) => ({ ...b, jumpTo: String(b.jumpTo) })) }),
    ...(p.answers && { answers: p.answers.map(({ jumpTo: jump, ...a }) => ({ ...a, ...(jump !== undefined && { jumpTo: String(jump) }) })) }),
  };
}

const pageInputs = {
  title: z.string().optional(),
  contents: z.string().optional().describe('The page\'s contents (HTML); local files it names (<img src="shot.png">) go in embed'),
  embed: z.array(z.string()).optional().describe("Absolute local files to embed in the contents, answers or responses"),
  buttons: z.array(z.object({ label: z.string(), jumpTo: jumpTo.optional() })).optional().describe("A content page's buttons, in order; given, they replace them all"),
  answers: z.array(z.object({ ...answer, jumpTo: jumpTo.optional() })).optional().describe("A question page's answers, in order (given, they replace them all); an essay or structural page's single row"),
  multipleAnswers: z.boolean().optional().describe("Multichoice: more than one answer can be right"),
  caseSensitive: z.boolean().optional().describe("Short answer: answers compared case-sensitively"),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe("Any other field of the page's form, by name (layout, display…)"),
};

type AgentAnswer = { text?: string; response?: string; score?: number; others?: boolean; jumpTo?: string };
/** The agent's buttons and answers, their jumps in the driver's terms. */
function withJumps<T extends { buttons?: { label: string; jumpTo?: string }[]; answers?: AgentAnswer[] }>({ buttons, answers, ...rest }: T) {
  return {
    ...rest,
    ...(buttons && { buttons: buttons.map((b) => ({ label: b.label, ...(b.jumpTo !== undefined && { jumpTo: toJump(b.jumpTo) }) })) }),
    ...(answers && { answers: answers.map(({ jumpTo: jump, ...a }) => ({ ...a, ...(jump !== undefined && { jumpTo: toJump(jump) }) })) }),
  };
}

const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerGetLessonPages: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_lesson_pages",
    {
      title: "Read a lesson's pages as its teacher",
      description:
        "Read a lesson's pages as its teacher has them in Moodle's lesson editor, in order: type (content, a question type, cluster, end of cluster, end of branch), title, contents, and a content page's buttons or a question's answers with their responses, scores and jumps (a page's id, or next-page, end-of-lesson…). Takes a teacher's role; a student plays a lesson with get_lesson_page.",
      inputSchema: { lessonId },
      outputSchema: { pages: z.array(page) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ lessonId: id }) => reply({ pages: (await lessonPages(...(await onSite(config, browser)), id)).map(shownPage) }),
  );
};

export const registerAddLessonPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_lesson_page",
    {
      title: "Add a page to a lesson",
      description:
        "Add a page to a lesson through Moodle's lesson editor: a content page with its buttons, a question page (multichoice, truefalse, shortanswer, numerical, matching, essay) with its answers, responses, scores and jumps, or a cluster, end of cluster or end of branch; after a page, or last. A jump to a page the lesson doesn't have is refused before anything is saved, so add the pages first and set their jumps after with edit_lesson_page when they point forward. Returns the new page's id and the lesson's page ids in order. Changes the course: confirm with the person first.",
      inputSchema: { lessonId, type: z.enum(LESSON_PAGE_TYPES), ...pageInputs, after },
      outputSchema: { changed: z.string(), pageId: z.number().int(), pageIds: z.array(z.number().int()).describe("The lesson's pages, in order") },
      annotations: writes,
    },
    async ({ lessonId: id, after: place, ...input }) => reply(await addLessonPage(...(await onSite(config, browser)), id, withJumps(input), { after: place })),
  );
};

export const registerEditLessonPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_lesson_page",
    {
      title: "Change a lesson's page",
      description:
        "Change a lesson's page through its form in the lesson editor: title, contents, buttons or answers (given, they replace them all), options and other fields; only what is given changes, and a page keeps its type. A jump to a page the lesson doesn't have is refused before anything is saved. Changes the course: confirm with the person first.",
      inputSchema: { lessonId, pageId, ...pageInputs },
      outputSchema: { changed: z.string(), pageId: z.number().int() },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ lessonId: id, pageId: pageToEdit, ...changes }) => reply(await editLessonPage(...(await onSite(config, browser)), id, pageToEdit, withJumps(changes))),
  );
};

export const registerMoveLessonPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "move_lesson_page",
    {
      title: "Move a lesson's page",
      description: "Move a lesson's page after another (0: first), as the lesson editor's move link does. Jumps by page id still lead to the same pages; next-page and previous-page follow the new order. Returns the page ids in order. Changes the course: confirm with the person first.",
      inputSchema: { lessonId, pageId, after: z.number().int().min(0).describe("The page it goes after (0: first)") },
      outputSchema: { changed: z.string(), pageIds: z.array(z.number().int()) },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ lessonId: id, pageId: pageToMove, after: place }) => reply(await moveLessonPage(...(await onSite(config, browser)), id, pageToMove, place)),
  );
};

export const registerDeleteLessonPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_lesson_page",
    {
      title: "Delete a lesson's page",
      description: "Delete a lesson's page. Answers of other pages that jumped to it are left as Moodle leaves them: check them with get_lesson_pages. Returns the page ids left, in order. Can't be undone: confirm with the person first.",
      inputSchema: { lessonId, pageId },
      outputSchema: { changed: z.string(), pageIds: z.array(z.number().int()) },
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ lessonId: id, pageId: pageToDelete }) => reply(await deleteLessonPage(...(await onSite(config, browser)), id, pageToDelete)),
  );
};
