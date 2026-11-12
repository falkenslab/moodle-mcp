// An offline quiz's (mod_offlinequiz) groups and their bank questions, and its printed forms.
import { z } from "zod";
import { addQuestionsToOfflineQuiz, createOfflineQuizForms, offlineQuizGroups } from "../driver.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const offlineQuizId = z.number().int().positive().describe("The offline quiz's id (course module id), as get_course_structure gives it");

const group = z.object({
  number: z.number().int().describe("The group's number, from 1: what add_questions_to_offline_quiz takes"),
  letter: z.string().describe("Its letter on the forms: A, B…"),
  slots: z.array(
    z.object({
      id: z.number().int(),
      slot: z.number().int().describe("Its place in the group, from 1"),
      number: z.number().int().optional(),
      page: z.number().int(),
      questionId: z.number().int().optional(),
      type: z.string(),
      name: z.string(),
      mark: z.string().optional(),
    }),
  ),
  totalMarks: z.string().optional(),
});
const offlineQuiz = z.object({ id: z.number().int() });

export const registerGetOfflineQuizGroups: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_offline_quiz_groups",
    {
      title: "Get an offline quiz's groups",
      description:
        "An Offline Quiz activity's groups (A, B…, each printed on its own forms) with their questions in order (page, question, type, name, mark), its maximum grade, whether its forms exist and whether its questions can still change. Moodle makes a group it's set to have the first time its page opens.",
      inputSchema: { offlineQuizId },
      outputSchema: {
        offlineQuiz,
        maxGrade: z.string().optional(),
        formsCreated: z.boolean().describe("Its forms exist: the questions are fixed"),
        editable: z.boolean().describe("Questions can be added: no forms yet, and no results"),
        groups: z.array(group),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ offlineQuizId }) => reply(await offlineQuizGroups(...(await onSite(config, browser)), offlineQuizId)),
  );
};

export const registerAddQuestionsToOfflineQuiz: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_questions_to_offline_quiz",
    {
      title: "Add questions to an offline quiz",
      description:
        "Add bank questions (by id, as list_questions gives them) to a group of an Offline Quiz activity, at its end or on a page. Refused once its forms exist or it has results. Returns the group afterwards. Changes the course: confirm with the person first.",
      inputSchema: {
        offlineQuizId,
        questionIds: z.array(z.number().int().positive()).min(1),
        group: z.number().int().positive().optional().describe("The group's number, from 1 (A); 1 when missing"),
        page: z.number().int().positive().optional().describe("Add them on this page; at the end when missing"),
      },
      outputSchema: { changed: z.string(), offlineQuiz, group },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ offlineQuizId, ...input }) => reply(await addQuestionsToOfflineQuiz(...(await onSite(config, browser)), offlineQuizId, input)),
  );
};

export const registerCreateOfflineQuizForms: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_offline_quiz_forms",
    {
      title: "Create an offline quiz's forms",
      description:
        "Create an Offline Quiz activity's forms, as its \"Create forms\" button does: for every group, the question form, the answer form people fill in and the correction form, in the format it's set to (PDF by default). From then on its questions can't change. Every group needs questions first. When they exist already, gives them as they are. Returns each group's links, which download_file saves. Changes the course: confirm with the person first.",
      inputSchema: { offlineQuizId },
      outputSchema: {
        changed: z.string(),
        offlineQuiz,
        forms: z.array(z.object({ group: z.string(), questionForm: z.string().optional(), answerForm: z.string().optional(), correctionForm: z.string().optional() })),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ offlineQuizId }) => reply(await createOfflineQuizForms(...(await onSite(config, browser)), offlineQuizId)),
  );
};
