// Course completion: its criteria, each participant's status, and marking it by hand.
// Participants as aliases under pseudonymize.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { courseCompletionCriteria, courseCompletionStatus, markCourseComplete, setCourseCompletionCriteria, type CourseCompletionChanges, type CourseCompletionStatus } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { requireSiteUrl } from "../config.js";
import { people, personFields, shown, targetFields, targetName, targetUserId } from "../people.js";
import { more, pageInputs, pagedText } from "./paging.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();
const aggregation = z.enum(["all", "any"]);

const criteria = z.object({
  enabled: z.boolean().describe("Whether completion is on in the site and the course; Moodle tracks nobody while it's off"),
  locked: z.boolean().describe("Someone has met a criterion: changing them takes unlock"),
  overall: aggregation.describe("The course completes when all criteria are met, or any one"),
  activities: z.object({ activityIds: z.array(z.number().int()), all: z.boolean() }).optional(),
  courses: z.object({ courseIds: z.array(z.number().int()), all: z.boolean() }).optional().describe("Other courses to complete first"),
  date: z.string().optional().describe("Complete on this day (ISO)"),
  enrolmentDays: z.number().int().optional(),
  unenrolment: z.literal(true).optional(),
  grade: z.number().optional().describe("A course grade of at least this"),
  self: z.literal(true).optional().describe("Participants mark it complete themselves"),
  roles: z.object({ roleIds: z.array(z.number().int()), all: z.boolean() }).optional().describe("Marked complete by people with these roles"),
  offered: z.object({ activities: z.array(z.object({ id: z.number().int(), name: z.string() })), roles: z.array(z.object({ id: z.number().int(), name: z.string() })) }).describe("The activities with completion tracking and the roles that may mark completion"),
});

const status = z.object({
  participant: z.object(personFields),
  complete: z.boolean(),
  completedAt: z.string().optional(),
  criteria: z.array(z.object({ type: z.string().describe("activity, course, date, duration, unenrolment, grade, self, role or other"), activityId: z.number().int().optional(), courseId: z.number().int().optional(), name: z.string(), met: z.boolean(), metAt: z.string().optional() })),
  markable: z.boolean().describe("Whether the person may mark them complete (mark_course_complete)"),
});

/** Statuses as tools give them: participants as aliases or names. */
async function shownStatuses(config: Config, context: BrowserContext, siteUrl: string, list: CourseCompletionStatus[]) {
  const who = await people(config, context, siteUrl, list.map((s) => ({ userId: s.userId, fullName: s.fullName })));
  return list.map((s, i) => ({ participant: shown(who[i]!), complete: s.complete, ...(s.completedAt && { completedAt: s.completedAt }), criteria: s.criteria, markable: s.markable }));
}

export const registerGetCourseCompletionCriteria: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_course_completion_criteria",
    {
      title: "Read a course's completion criteria",
      description:
        "Read what completes a course, from its \"Course completion\" settings: activities, other courses, a date, days enrolled, unenrolment, a course grade, self completion, roles that mark it, how they combine, what the form offers, whether completion is on and whether the criteria are locked. Course completion, not activity completion (get_completion_report).",
      inputSchema: { courseId },
      outputSchema: criteria.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id }) => reply(await courseCompletionCriteria(...(await onSite(config, browser)), id)),
  );
};

export const registerSetCourseCompletionCriteria: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_course_completion_criteria",
    {
      title: "Set what completes a course",
      description:
        "Set a course's completion criteria: a criterion given replaces that kind's settings, one in remove goes, one not given stays; overall says whether all criteria or any one complete the course. Activities need completion tracking, roles the right to mark completion (get_course_completion_criteria's offered lists both). Once someone has met a criterion Moodle locks them: unlock deletes every participant's course completion data first (not their activity completion). Returns the criteria. Confirm with the person first, and twice with unlock.",
      inputSchema: {
        courseId,
        overall: aggregation.optional(),
        activities: z.object({ activityIds: z.array(z.number().int().positive()).min(1), all: z.boolean().optional().describe("All of them (default) or any one") }).optional(),
        courses: z.object({ courseIds: z.array(z.number().int().positive()).min(1), all: z.boolean().optional() }).optional(),
        date: z.string().datetime({ offset: true }).optional().describe("Complete on this day"),
        enrolmentDays: z.number().int().positive().optional().describe("1 to 30, 40 to 180 by tens, or 365"),
        unenrolment: z.boolean().optional(),
        grade: z.number().min(0).optional().describe("In the course total's points"),
        self: z.boolean().optional(),
        roles: z.object({ roleIds: z.array(z.number().int().positive()).min(1), all: z.boolean().optional() }).optional(),
        remove: z.array(z.enum(["activities", "courses", "date", "enrolmentDays", "grade", "roles"])).optional().describe("Criteria to take away"),
        unlock: z.boolean().optional().describe("Unlock locked criteria first, deleting everyone's course completion data"),
      },
      outputSchema: { changed: z.string(), criteria },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, remove, unlock, date, ...given }) => {
      const changes: CourseCompletionChanges = { ...given, ...(date && { date: new Date(date) }) };
      for (const kind of remove ?? []) {
        if (changes[kind] !== undefined) throw new Error(`${kind} is both given and removed.`);
        changes[kind] = null;
      }
      return reply(await setCourseCompletionCriteria(...(await onSite(config, browser)), id, changes, { unlock }));
    },
  );
};

export const registerGetCourseCompletionStatus: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_course_completion_status",
    {
      title: "Read who has completed a course",
      description: `Read each participant's course completion from the course completion report: whether and when they completed the course, and each criterion met and when; participants as aliases when the server pseudonymizes. Some criteria (a grade, a date, days enrolled) are worked out by Moodle's scheduled tasks, so a criterion just met may not show yet. ${pagedText("participants", 50)}`,
      inputSchema: { courseId, ...targetFields, groupId: z.number().int().positive().optional().describe("Only this group's participants"), ...pageInputs("participants", 50, 200) },
      outputSchema: { statuses: z.array(status), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, user, userId, groupId, limit = 50, offset }) => {
      const one = user !== undefined || userId !== undefined ? await targetUserId(config, requireSiteUrl(config), { user, userId }) : undefined;
      const [context, siteUrl] = await onSite(config, browser);
      const page = await courseCompletionStatus(context, siteUrl, id, { userId: one, group: groupId, limit, offset });
      return reply({ statuses: await shownStatuses(config, context, siteUrl, page.items), more: page.more });
    },
  );
};

export const registerMarkCourseComplete: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "mark_course_complete",
    {
      title: "Mark a participant's course completion",
      description:
        "Mark a participant's course completion by hand (an alias when the server pseudonymizes), as the course completion report's link does: the course's \"Manual completion by others\" criterion for a role the person holds. Moodle completes the course when the rest of the criteria allow it. Returns their completion afterwards. Confirm with the person first.",
      inputSchema: { courseId, ...targetFields },
      outputSchema: { changed: z.string(), status },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ courseId: id, user, userId }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const [context, siteUrl] = await onSite(config, browser);
      const result = await markCourseComplete(context, siteUrl, id, target);
      return reply({ changed: `Course completion of ${targetName({ user, userId })} marked in course ${id}.`, status: (await shownStatuses(config, context, siteUrl, [result.status]))[0] });
    },
  );
};
