// Grading beyond one assignment submission: a grade in the gradebook, whole-forum grades, quiz questions
// graded by hand, the marking workflow and markers, ratings, and exporting a course's grades.
// People as the reading tools give them (people.ts); text that reaches students holds no aliases.
import { z } from "zod";
import {
  GRADE_EXPORT_FORMATS,
  WORKFLOW_STATES,
  allocateMarker,
  exportGrades,
  forumGrades,
  gradeForumUser,
  gradeQuizQuestion,
  questionsToGrade,
  rate,
  setGrade,
  setWorkflowState,
} from "@falkenslab/moodle-driver";
import { requireSiteUrl } from "../config.js";
import { people, personByName, personFields, pseudonymizing, refuseAliases, shown, targetFields, targetName, targetsFields, targetsName, targetUserId, targetUserIds } from "../people.js";
import { onSite, reply } from "./reply.js";
import { OutOfScopeError, othersFilesAllowed } from "./scopes.js";
import type { RegisterTool } from "./types.js";

/** A grade as text: a number for points, a scale item's name, "none" to take it away. */
function gradeValue(grade: string): number | string | null {
  if (grade === "none") return null;
  return /^-?\d+(\.\d+)?$/.test(grade.trim()) ? Number(grade) : grade;
}

/** The person a grade belongs to, as the agent named them. */
const whoGraded = (target: { user?: string; userId?: number }) => (target.user ? { user: target.user } : { userId: target.userId });

export const registerSetGrade: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_grade",
    {
      title: "Set a grade in the gradebook",
      description:
        'Set a participant\'s grade in a grade item, as the gradebook\'s single view does: a manual item takes it; an activity\'s or a category\'s is overridden (until override false takes it off). Also feedback and excluding it from the totals. The grade as text: points ("7.5"), a scale item, or "none" to empty it. Students may see it: confirm with the person first.',
      inputSchema: {
        courseId: z.number().int().positive(),
        itemId: z.number().int().positive().describe("The grade item, as get_gradebook_setup or get_grader_report gives it"),
        ...targetFields,
        grade: z.string().optional(),
        feedback: z.string().optional().describe("No aliases in it, since the student reads it"),
        override: z.boolean().optional().describe("false: take an activity's or category's override off"),
        excluded: z.boolean().optional().describe("Exclude it from the totals"),
      },
      outputSchema: {
        changed: z.string(),
        grade: z.object({ itemId: z.number().int(), ...personFields, grade: z.string().optional(), feedback: z.string().optional(), overridden: z.boolean(), excluded: z.boolean() }),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId, itemId, user, userId, grade, ...rest }) => {
      refuseAliases(config, rest.feedback);
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const result = await setGrade(...(await onSite(config, browser)), courseId, itemId, target, { ...rest, ...(grade !== undefined && { grade: gradeValue(grade) }) });
      const { grade: value, feedback, overridden, excluded } = result.grade;
      return reply({ changed: `Grade item ${itemId} set for ${targetName({ user, userId })}.`, grade: { itemId, ...whoGraded({ user, userId }), grade: value, feedback, overridden, excluded } });
    },
  );
};

const forumId = z.number().int().positive().describe("The forum's id (course module id)");

export const registerGetForumGrades: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_forum_grades",
    {
      title: "Get a forum's whole-forum grades",
      description: "Read the whole-forum grades of a forum graded as a whole, as its grader shows them: one per person it can grade (aliases when the server pseudonymizes), with how it's graded (points or scale) and who graded.",
      inputSchema: { forumId, groupId: z.number().int().positive().optional() },
      outputSchema: {
        activityId: z.number().int(),
        method: z.enum(["point", "scale"]),
        maxGrade: z.number().optional(),
        scale: z.array(z.object({ value: z.number(), name: z.string() })).optional(),
        grades: z.array(z.object({ ...personFields, grade: z.string().optional(), value: z.number().optional(), gradedBy: z.string().optional(), gradedAt: z.string().optional() })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ forumId: id, groupId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await forumGrades(context, siteUrl, id, { groupId });
      const who = await people(config, context, siteUrl, found.grades);
      const grades = await Promise.all(
        found.grades.map(async ({ grade, value, gradedBy, gradedAt }, i) => ({ ...shown(who[i]!), grade, value, gradedAt, ...(gradedBy !== undefined && { gradedBy: await personByName(config, context, siteUrl, gradedBy) }) })),
      );
      return reply({ ...found, grades });
    },
  );
};

export const registerGradeForumUser: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "grade_forum_user",
    {
      title: "Give a whole-forum grade",
      description: 'Give a participant their whole-forum grade, as the forum\'s grader does: points ("7"), a scale item, or "none" to take it away; notify sends them Moodle\'s notification. Students may see it: confirm with the person first.',
      inputSchema: { forumId, ...targetFields, grade: z.string(), notify: z.boolean().optional() },
      outputSchema: { changed: z.string(), grade: z.object({ ...personFields, grade: z.string().optional(), value: z.number().optional(), gradedBy: z.string().optional(), gradedAt: z.string().optional() }) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ forumId: id, user, userId, grade, notify }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const [context, siteUrl] = await onSite(config, browser);
      const result = await gradeForumUser(context, siteUrl, id, target, { grade: gradeValue(grade), notify });
      const { grade: saved, value, gradedBy, gradedAt } = result.grade;
      return reply({
        changed: `Whole-forum grade of ${targetName({ user, userId })} in forum ${id} set.`,
        grade: { ...whoGraded({ user, userId }), grade: saved, value, gradedAt, ...(gradedBy !== undefined && { gradedBy: await personByName(config, context, siteUrl, gradedBy) }) },
      });
    },
  );
};

export const registerListQuestionsToGrade: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_questions_to_grade",
    {
      title: "List a quiz's questions to grade by hand",
      description: "List a quiz's questions that wait for grading by hand (essays…), each with how many to grade and the finished attempts whose answer needs it (by attempt id, with the participant as an alias when the server pseudonymizes). Read an answer with get_attempt_review; grade it with grade_quiz_question.",
      inputSchema: { quizId: z.number().int().positive().describe("The quiz's id (course module id)") },
      outputSchema: {
        quiz: z.object({ id: z.number().int() }),
        questions: z.array(
          z.object({
            slot: z.number().int(),
            questionId: z.number().int().optional(),
            name: z.string(),
            type: z.string(),
            toGrade: z.number().int(),
            graded: z.number().int(),
            total: z.number().int(),
            attempts: z.array(z.object({ id: z.number().int().describe("The attempt id"), ...personFields })),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ quizId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await questionsToGrade(context, siteUrl, quizId);
      const everyone = [...new Map(found.questions.flatMap((q) => q.attempts).map((a) => [a.userId, { userId: a.userId, fullName: a.fullName }])).values()];
      const who = await people(config, context, siteUrl, everyone);
      const byId = new Map(everyone.map((p, i) => [p.userId, shown(who[i]!)]));
      return reply({ quiz: found.quiz, questions: found.questions.map((q) => ({ ...q, attempts: q.attempts.map((a) => ({ id: a.id, ...byId.get(a.userId)! })) })) });
    },
  );
};

export const registerGradeQuizQuestion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "grade_quiz_question",
    {
      title: "Grade a quiz question by hand",
      description:
        "Grade one question of a finished attempt by hand, with a comment, as the review's \"Make comment or override mark\" does: an essay waiting for grading, or any question whose mark is overridden. The mark is in the question's points (0 to its maximum). Returns the attempt's grade afterwards when shown. Students may see it: confirm with the person first.",
      inputSchema: {
        attemptId: z.number().int().positive().describe("As list_questions_to_grade gives it"),
        slot: z.number().int().positive(),
        mark: z.number().min(0),
        comment: z.string().optional().describe("No aliases in it, since the student reads it"),
      },
      outputSchema: { changed: z.string(), attemptId: z.number().int(), slot: z.number().int(), mark: z.number(), maxMark: z.number().optional(), grade: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ attemptId, slot, mark, comment }) => {
      refuseAliases(config, comment);
      return reply(await gradeQuizQuestion(...(await onSite(config, browser)), attemptId, slot, { mark, comment }));
    },
  );
};

const assignmentId = z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it");

export const registerSetWorkflowState: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_workflow_state",
    {
      title: "Set the marking workflow state",
      description:
        'Set the marking workflow state of participants\' submissions, as the grading table\'s bulk action does: "released" shows them their grades (notify tells them). Takes them as get_submissions gives them. Students may see it: confirm with the person first.',
      inputSchema: { assignmentId, ...targetsFields, state: z.enum(WORKFLOW_STATES.filter((s) => s !== "notmarked") as [string, ...string[]]), notify: z.boolean().optional() },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ assignmentId: id, users, userIds, state, notify }) => {
      const ids = await targetUserIds(config, requireSiteUrl(config), { users, userIds });
      await setWorkflowState(...(await onSite(config, browser)), id, ids, state as Parameters<typeof setWorkflowState>[4], { notify });
      return reply({ changed: `Marking workflow of ${targetsName({ users, userIds })} in assignment ${id} set to ${state}.` });
    },
  );
};

export const registerAllocateMarker: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "allocate_marker",
    {
      title: "Allocate a marker to submissions",
      description:
        "Allocate a marker (someone who can grade; several where the assignment uses several per submission) to participants' submissions, as the grading table's bulk action does; Moodle leaves submissions past marking alone. Participants and markers as get_submissions gives them: aliases when the server pseudonymizes. Confirm with the person first.",
      inputSchema: {
        assignmentId,
        ...targetsFields,
        markers: z.array(z.string()).min(1).optional().describe("The markers' aliases, when the server pseudonymizes"),
        markerIds: z.array(z.number().int().positive()).min(1).optional().describe("The markers' user ids, when the server shows names"),
      },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ assignmentId: id, users, userIds, markers, markerIds }) => {
      const siteUrl = requireSiteUrl(config);
      const ids = await targetUserIds(config, siteUrl, { users, userIds });
      const markerList = await targetUserIds(config, siteUrl, { users: markers, userIds: markerIds });
      await allocateMarker(...(await onSite(config, browser)), id, ids, markerList.length === 1 ? markerList[0]! : markerList);
      return reply({ changed: `Marker ${targetsName({ users: markers, userIds: markerIds })} allocated to ${targetsName({ users, userIds })} in assignment ${id}.` });
    },
  );
};

export const registerRate: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "rate",
    {
      title: "Rate a post, entry or record",
      description:
        'Rate a forum post, a glossary entry or a database record as the person, as the rating menu under it does: a scale item\'s name, or a number (a point scale\'s points); "none" takes the person\'s rating away. Returns the item\'s aggregate afterwards. Students may see it: confirm with the person first.',
      inputSchema: {
        itemType: z.enum(["forum-post", "glossary-entry", "database-record"]),
        itemId: z.number().int().positive().describe("The post's, entry's or record's id"),
        discussionId: z.number().int().positive().optional().describe("For a forum post: its discussion"),
        rating: z.string(),
      },
      outputSchema: { changed: z.string(), aggregate: z.string().optional(), count: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ itemType, itemId, discussionId, rating }) => {
      if (itemType === "forum-post" && discussionId === undefined) throw new Error("A forum post needs its discussionId.");
      const item = itemType === "forum-post" ? { type: itemType, id: itemId, discussionId: discussionId! } : { type: itemType, id: itemId };
      return reply(await rate(...(await onSite(config, browser)), item, gradeValue(rating)));
    },
  );
};

export const registerExportGrades: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "export_grades",
    {
      title: "Export a course's grades to a file",
      description:
        "Save a course's grades into a local folder as Moodle exports them for a teacher: a spreadsheet (xlsx, ods), CSV or XML, with the items, group, display and feedback chosen. The file names every participant: only with names in clear (the server's student data level), since a file can't be pseudonymized.",
      inputSchema: {
        courseId: z.number().int().positive(),
        format: z.enum(GRADE_EXPORT_FORMATS),
        destDir: z.string().describe("An absolute local folder"),
        itemIds: z.array(z.number().int().positive()).optional().describe("Only these grade items"),
        groupId: z.number().int().positive().optional(),
        display: z.array(z.enum(["real", "percentage", "letter"])).optional(),
        feedback: z.boolean().optional().describe("Include feedback"),
      },
      outputSchema: { path: z.string(), name: z.string(), size: z.number(), contentType: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId, ...options }) => {
      if (!othersFilesAllowed(config)) throw new OutOfScopeError(pseudonymizing(config) ? "A grades export names every participant, and this server pseudonymizes them: export it in Moodle yourself, or read the grades with get_grader_report." : "A grades export holds students' data: this server is configured without it.");
      return reply(await exportGrades(...(await onSite(config, browser)), courseId, options));
    },
  );
};
