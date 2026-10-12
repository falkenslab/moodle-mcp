// A course's reports: views per activity (counts only), who took part in an activity and the logs
// (people's data, as aliases under pseudonymize; the logs never with an IP address).
import { z } from "zod";
import { LOG_ACTIONS, PARTICIPATION_ACTIONS, activityReport, courseLogs, participationReport } from "@falkenslab/moodle-driver";
import { requireSiteUrl } from "../config.js";
import { people, personByName, personFields, pseudonymizing, redactAll, shown, targetFields, targetUserId } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const courseId = z.number().int().positive();

function date(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date.`);
  return parsed;
}

export const registerGetActivityReport: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_activity_report",
    {
      title: "Get a course's activity views",
      description: "Read a course's activity report: per activity, how many times it was viewed, by how many people and when last, from the logs (between from and until when given). Counts only, no one's name. Activities nobody viewed come with zero.",
      inputSchema: { courseId, from: z.string().optional().describe("ISO 8601"), until: z.string().optional().describe("ISO 8601") },
      outputSchema: {
        activities: z.array(z.object({ activityId: z.number().int(), type: z.string(), name: z.string(), views: z.number().int(), users: z.number().int(), lastAccess: z.string().optional() })),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, from, until }) => reply({ activities: await activityReport(...(await onSite(config, browser)), id, { from: date(from, "from"), until: date(until, "until") }) }),
  );
};

export const registerGetParticipationReport: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_participation_report",
    {
      title: "Get who took part in an activity",
      description:
        "Read an activity's participation report: everyone with a role (all the roles it offers, unless roleId) and how many actions they made there (views or posts only with action; since a date with since); those who did nothing come with 0. People as aliases when the server pseudonymizes.",
      inputSchema: {
        courseId,
        activityId: z.number().int().positive(),
        roleId: z.number().int().positive().optional(),
        since: z.string().optional().describe("ISO 8601"),
        action: z.enum(PARTICIPATION_ACTIONS).optional(),
      },
      outputSchema: { participants: z.array(z.object({ ...personFields, roleId: z.number().int(), actions: z.number().int() })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, activityId, roleId, since, action }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await participationReport(context, siteUrl, id, activityId, { roleId, since: date(since, "since"), action });
      const who = await people(config, context, siteUrl, found);
      return reply({ participants: found.map((p, i) => ({ ...shown(who[i]!), roleId: p.roleId, actions: p.actions })) });
    },
  );
};

export const registerGetCourseLogs: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_course_logs",
    {
      title: "Get a course's logs",
      description:
        "Read a course's logs, newest first, as its logs report lists them: by a user (an alias when the server pseudonymizes), an activity, a kind of action and a time span, up to limit entries (100 by default). Each entry: when, who, who it was about, where, what happened. Never IP addresses.",
      inputSchema: {
        courseId,
        ...targetFields,
        activityId: z.number().int().positive().optional(),
        action: z.enum(LOG_ACTIONS).optional(),
        from: z.string().optional().describe("ISO 8601"),
        until: z.string().optional().describe("ISO 8601"),
        limit: z.number().int().positive().max(1000).optional(),
      },
      outputSchema: {
        entries: z.array(
          z.object({
            time: z.string().optional().describe("ISO 8601"),
            by: z.object(personFields).describe("Who did it"),
            about: z.object(personFields).optional().describe("Who it was about, when someone"),
            context: z.string().describe("Where: the course or an activity"),
            activityId: z.number().int().optional(),
            component: z.string(),
            event: z.string(),
            description: z.string(),
            origin: z.string().describe('"web", "ws", "cli"…'),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId: id, user, userId, activityId, action, from, until, limit }) => {
      const siteUrl = requireSiteUrl(config);
      const filterUser = user === undefined && userId === undefined ? undefined : await targetUserId(config, siteUrl, { user, userId });
      const [context] = await onSite(config, browser);
      const found = await courseLogs(context, siteUrl, id, { userId: filterUser, activityId, action, from: date(from, "from"), until: date(until, "until"), limit });
      // Everyone named, with their id when the log has it, in one list: one alias each.
      const byIdName = new Map<number, { userId: number; fullName: string }>();
      for (const e of found) {
        if (e.userId) byIdName.set(e.userId, { userId: e.userId, fullName: e.userName });
        if (e.relatedUserId && e.relatedUserName) byIdName.set(e.relatedUserId, { userId: e.relatedUserId, fullName: e.relatedUserName });
      }
      const named = [...byIdName.values()];
      const who = await people(config, context, siteUrl, named);
      const byId = new Map(named.map((p, i) => [p.userId, shown(who[i]!)]));
      const person = async (id: number | undefined, name: string) => (id !== undefined && byId.get(id)) || (pseudonymizing(config) ? { user: await personByName(config, context, siteUrl, name) } : { fullName: name });
      // Every entry's free text in one redaction (one read of the directory), user ids included.
      const texts = await redactAll(config, siteUrl, found.flatMap((e) => [e.context, e.description]));
      const entries = await Promise.all(
        found.map(async (e, i) => ({
          time: e.time,
          by: await person(e.userId, e.userName),
          ...(e.relatedUserName && { about: await person(e.relatedUserId, e.relatedUserName) }),
          context: texts[2 * i]!,
          activityId: e.activityId,
          component: e.component,
          event: e.event,
          // Moodle's descriptions name users by id ("The user with id '7'…"): redactAll hides them.
          description: texts[2 * i + 1]!,
          origin: e.origin,
        })),
      );
      return reply({ entries });
    },
  );
};
