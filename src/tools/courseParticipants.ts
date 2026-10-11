// Who is in a course and how they do: participants, groups, the grader report, the progress report and
// a quiz's results. Other people go through people.ts (ADR-013, ADR-016): aliases under pseudonymize.
import { z } from "zod";
import { completionReport, graderReport, groups, participants, quizResults, COMPLETION_STATES } from "@falkenslab/moodle-driver";
import { people, personFields, pseudonymizing, shown, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const group = z.number().int().positive().optional().describe("Only this group's members, by its id from list_groups");
const idAndName = z.object({ id: z.number().int(), name: z.string() });

export const registerListParticipants: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_participants",
    {
      title: "List a course's participants",
      description:
        "List a course's participants with their roles and groups, as the participants page does: people as aliases when the server pseudonymizes, never emails or profile fields. Filter by role, group, or those who haven't accessed the course since a date (inactiveSince).",
      inputSchema: {
        courseId,
        role: z.number().int().positive().optional().describe("Only this role's, by its id (as the participants' roles give it)"),
        group,
        inactiveSince: z.string().optional().describe("Only those who haven't accessed the course since this date (ISO 8601)"),
      },
      outputSchema: { participants: z.array(z.object({ ...personFields, roles: z.array(idAndName), groups: z.array(idAndName) })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, role, group: groupId, inactiveSince }) => {
      const since = inactiveSince === undefined ? undefined : new Date(inactiveSince);
      if (since && Number.isNaN(since.getTime())) throw new Error(`"${inactiveSince}" isn't an ISO 8601 date.`);
      const [context, siteUrl] = await onSite(config, browser);
      const found = await participants(context, siteUrl, id, { role, group: groupId, inactiveSince: since });
      const who = await people(config, context, siteUrl, found);
      // A group's name is the teacher's, but it may name a student ("Ana's team").
      const named = async (list: { id: number; name: string }[]) => Promise.all(list.map(async (g) => ({ id: g.id, name: await text(config, siteUrl, g.name) })));
      return reply({ participants: await Promise.all(found.map(async (p, i) => ({ ...shown(who[i]!), roles: p.roles, groups: await named(p.groups) }))) });
    },
  );
};

export const registerListGroups: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_groups",
    {
      title: "List a course's groups",
      description: "List the groups of a course the person can see, with their members (as aliases when the server pseudonymizes). Their ids are what the reports' group filter takes.",
      inputSchema: { courseId },
      outputSchema: { groups: z.array(z.object({ id: z.number().int(), name: z.string(), members: z.array(z.object(personFields)) })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await groups(context, siteUrl, id);
      // The driver gives members by id only: their names come from the participants, to give each an alias or a name.
      const everyone = await participants(context, siteUrl, id);
      const who = await people(config, context, siteUrl, everyone);
      const byId = new Map(everyone.map((p, i) => [p.userId, shown(who[i]!)]));
      const unknown = (userId: number) => (pseudonymizing(config) ? { user: "[participant]" } : { userId });
      return reply({ groups: await Promise.all(found.map(async (g) => ({ id: g.id, name: await text(config, siteUrl, g.name), members: g.members.map((m) => byId.get(m) ?? unknown(m)) }))) });
    },
  );
};

export const registerGetGraderReport: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_grader_report",
    {
      title: "Get a course's grades",
      description: "Read everyone's grades in a course as the grader report shows them, in one group when given: its columns (grade items, categories, the course total) and a row per participant (an alias when the server pseudonymizes) with their grades.",
      inputSchema: { courseId, group },
      outputSchema: {
        columns: z.array(z.object({ id: z.number().int(), name: z.string(), kind: z.enum(["item", "category", "course"]), activityId: z.number().int().optional(), activityType: z.string().optional() })),
        rows: z.array(z.object({ ...personFields, grades: z.array(z.object({ itemId: z.number().int(), grade: z.string().optional() })) })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, group: groupId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const report = await graderReport(context, siteUrl, id, { group: groupId });
      const who = await people(config, context, siteUrl, report.rows);
      return reply({ columns: report.columns, rows: report.rows.map((r, i) => ({ ...shown(who[i]!), grades: r.grades })) });
    },
  );
};

export const registerGetCompletionReport: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_completion_report",
    {
      title: "Get a course's activity completion",
      description: "Read a course's progress report: every participant's completion (an alias when the server pseudonymizes) of every activity that tracks it, in one group when given; whether it's manual or automatic, and whether a teacher overrode it.",
      inputSchema: { courseId, group },
      outputSchema: {
        activities: z.array(z.object({ id: z.number().int(), name: z.string(), type: z.string() })),
        participants: z.array(
          z.object({ ...personFields, completion: z.array(z.object({ activityId: z.number().int(), state: z.enum(COMPLETION_STATES), tracking: z.enum(["manual", "auto"]), overridden: z.boolean() })) }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, group: groupId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const report = await completionReport(context, siteUrl, id, { group: groupId });
      const who = await people(config, context, siteUrl, report.participants);
      return reply({ activities: report.activities, participants: report.participants.map((p, i) => ({ ...shown(who[i]!), completion: p.completion })) });
    },
  );
};

export const registerGetQuizResults: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_quiz_results",
    {
      title: "Get a quiz's results",
      description:
        "Read a quiz's attempts as its grades report shows them: per attempt the participant (an alias when the server pseudonymizes), state, dates, grade and the mark per question; with responses, also each answer given (redacted when pseudonymizing).",
      inputSchema: { quizId: z.number().int().positive().describe("The quiz's id (course module id), as get_course_structure gives it"), responses: z.boolean().optional().describe("Also the answer per question (default false)") },
      outputSchema: {
        quiz: z.object({ id: z.number().int() }),
        attempts: z.array(
          z.object({
            id: z.number().int(),
            ...personFields,
            state: z.string().optional(),
            started: z.string().optional(),
            completed: z.string().optional(),
            duration: z.string().optional(),
            grade: z.string().optional(),
            questions: z.array(z.object({ slot: z.number().int(), mark: z.string().optional(), response: z.string().optional(), result: z.string().optional() })),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ quizId, responses }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const results = await quizResults(context, siteUrl, quizId, { responses });
      const who = await people(config, context, siteUrl, results.attempts);
      const attempts = await Promise.all(
        results.attempts.map(async ({ id, state, started, completed, duration, grade, questions }, i) => ({
          id,
          ...shown(who[i]!),
          ...{ state, started, completed, duration, grade },
          questions: await Promise.all(questions.map(async (q) => (q.response === undefined ? q : { ...q, response: await text(config, siteUrl, q.response) }))),
        })),
      );
      return reply({ quiz: results.quiz, attempts });
    },
  );
};
