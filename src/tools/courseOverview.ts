// get_activities_overview, list_deadlines and get_course_updates: what's due, what needs doing and
// what changed, from Moodle's services, without opening each activity.
import { z } from "zod";
import { activitiesOverview, courseUpdates, deadlines } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive().describe("The course's id, from list_courses");
const reply = <T extends Record<string, unknown>>(output: T) => ({ content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }], structuredContent: output });

const field = z.object({
  key: z.string().describe("The column's key (duedate, submissions, actions…)"),
  label: z.string(),
  text: z.string().describe("The value as the overview shows it"),
  date: z.string().optional().describe("ISO date, for date columns"),
  url: z.string().optional().describe("Where the column links (the grading table…)"),
  details: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  alert: z.object({ label: z.string(), count: z.number() }).optional().describe('What needs attention, as "Needs grading" and how many'),
});

export const registerGetActivitiesOverview: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_activities_overview",
    {
      title: "Get a course's activities overview",
      description:
        'Moodle\'s activities overview of a course, as the person sees it: per activity, its columns (due date, submissions, what needs grading, attempts, the person\'s own grade, forum subscriptions…), by type or for every type in the course. For a teacher, the quickest way to see what\'s waiting to be graded (alert "Needs grading"); for a student, what\'s due and their results. Moodle 5 and later.',
      inputSchema: { courseId, type: z.string().min(1).optional().describe('One activity type (assign, quiz, forum…; "resource" for every resource type); every type when missing') },
      outputSchema: {
        activities: z.array(
          z.object({ id: z.number().int(), name: z.string(), type: z.string(), url: z.string().optional(), visible: z.boolean(), available: z.boolean().optional(), fields: z.array(field) }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId, type }) => reply({ activities: await activitiesOverview(...(await onSite(config, browser)), courseId, type) }),
  );
};

export const registerListDeadlines: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_deadlines",
    {
      title: "List upcoming deadlines",
      description:
        "What the person has to do by a date, from Moodle's calendar (submit an assignment, attempt a quiz…), in one course or all of them: from a week ago (overdue ones) to some days ahead. Each with its activity id, date, whether it's overdue and the action Moodle offers. Teachers get few such events: for what's waiting to be graded, use get_activities_overview.",
      inputSchema: {
        courseId: courseId.optional().describe("One course; every course when missing"),
        days: z.number().int().positive().max(365).optional().describe("How many days ahead (default 30)"),
      },
      outputSchema: {
        deadlines: z.array(
          z.object({
            activityId: z.number().int().optional(),
            activity: z.string(),
            type: z.string().optional(),
            event: z.string(),
            kind: z.string().describe("Moodle's event type: due, close, gradingdue…"),
            date: z.string(),
            overdue: z.boolean(),
            course: z.object({ id: z.number().int(), shortname: z.string().optional() }).optional(),
            action: z.object({ name: z.string(), actionable: z.boolean(), count: z.number().optional(), url: z.string().optional() }).optional(),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId, days }) => reply({ deadlines: await deadlines(...(await onSite(config, browser)), { courseId, days }) }),
  );
};

export const registerGetCourseUpdates: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_course_updates",
    {
      title: "Get what changed in a course",
      description:
        "What changed in a course's activities since a date (settings, content files, forum posts, submissions, attempts, grades…), as Moodle tracks it for the person, with each activity's name and type. Useful at the start of a session: what's new since last time.",
      inputSchema: {
        courseId,
        since: z.string().datetime({ offset: true }).optional().describe("ISO date and time; a week ago when missing"),
      },
      outputSchema: {
        since: z.string(),
        activities: z.array(
          z.object({
            id: z.number().int(),
            name: z.string().optional(),
            type: z.string().optional(),
            changes: z.array(z.object({ what: z.string().describe("configuration, contentfiles, posts, submissions, attempts, gradeitems…"), time: z.string().optional(), items: z.number().optional() })),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId, since }) => {
      const from = since ? new Date(since) : new Date(Date.now() - 7 * 86_400_000);
      return reply({ since: from.toISOString(), activities: await courseUpdates(...(await onSite(config, browser)), courseId, from) });
    },
  );
};
