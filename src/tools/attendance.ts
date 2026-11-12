// An Attendance activity (mod_attendance): its sessions, taking attendance for one, and its report.
// Participants as aliases under pseudonymize, remarks redacted, and no aliases in remarks sent to Moodle.
import { z } from "zod";
import {
  addAttendanceSessions,
  attendanceReport,
  attendanceSessions,
  deleteAttendanceSession,
  editAttendanceSession,
  sessionAttendance,
  takeAttendance,
  type SessionAttendance,
} from "../driver.js";
import type { BrowserContext } from "playwright-core";
import { requireSiteUrl, type Config } from "../config.js";
import { people, personFields, refuseAliases, shown, targetFields, targetUserId, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const attendanceId = z.number().int().positive().describe("The Attendance activity's id (course module id), as get_course_structure gives it");
const sessionId = z.number().int().positive().describe("The session's id, as list_attendance_sessions gives it");
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const session = z.object({
  id: z.number().int(),
  start: z.string().optional().describe("When it starts (ISO 8601); missing when the person can't change sessions"),
  durationMinutes: z.number().int().optional(),
  when: z.string().describe("Its date and time as Moodle shows them, in the person's language"),
  groupId: z.number().int().optional().describe("The group it's for; missing for all students"),
  description: z.string().describe("HTML"),
  taken: z.boolean().describe("Attendance has been taken for it"),
});

const statuses = z.array(z.object({ id: z.number().int(), acronym: z.string(), description: z.string() })).describe("The statuses the session can take");
const attendance = {
  sessionId: z.number().int(),
  statuses,
  participants: z.array(
    z.object({
      ...personFields,
      statusId: z.number().int().optional().describe("Missing when not marked"),
      status: z.string().optional().describe("The status's acronym; missing when not marked"),
      remarks: z.string(),
      canMark: z.boolean().describe("False when their enrolment ended or is suspended before the session"),
    }),
  ),
};

/** A moment the agent gives: ISO 8601, with its offset or in UTC. */
function moment(value: string, field: string): Date {
  const date = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(value) || Number.isNaN(date.getTime())) throw new Error(`${field} must be a date and time in ISO 8601, with its offset (2026-11-16T10:00:00+01:00).`);
  return date;
}

/** A day the agent gives (YYYY-MM-DD), as noon UTC: the same day in any time zone Moodle may read it in. */
function day(value: string, field: string): Date {
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) throw new Error(`${field} must be a day as YYYY-MM-DD.`);
  return date;
}

/** A session's attendance as tools give it: participants as aliases or names, remarks redacted. */
async function shownAttendance(config: Config, context: BrowserContext, siteUrl: string, { sessionId, statuses, participants }: SessionAttendance) {
  const who = await people(config, context, siteUrl, participants);
  return {
    sessionId,
    statuses,
    participants: await Promise.all(
      participants.map(async (p, i) => ({ ...shown(who[i]!), statusId: p.statusId, status: p.status, remarks: await text(config, siteUrl, p.remarks), canMark: p.canMark })),
    ),
  };
}

export const registerListAttendanceSessions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_attendance_sessions",
    {
      title: "List an attendance's sessions",
      description:
        "An Attendance activity's sessions, by date: each one's id, start and duration, the group it's for, its description and whether attendance has been taken. Sessions before the course's start date aren't listed (Moodle hides them, and leaves them out of the report).",
      inputSchema: { attendanceId },
      outputSchema: { sessions: z.array(session) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ attendanceId }) => reply({ sessions: await attendanceSessions(...(await onSite(config, browser)), attendanceId) }),
  );
};

export const registerAddAttendanceSessions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_attendance_sessions",
    {
      title: "Add attendance sessions",
      description:
        "Add sessions to an Attendance activity: one, or with repeatOn and repeatUntil one on each of those weekdays from the start's week until that day, every repeatEveryWeeks weeks, all at the start's time of day. With groupIds, one session for each group (the activity in group mode). Returns the new sessions. Changes the course: confirm with the person first.",
      inputSchema: {
        attendanceId,
        start: z.string().describe("When the (first) session starts, ISO 8601 with its offset (2026-11-16T10:00:00+01:00)"),
        durationMinutes: z.number().int().positive().describe("How long each lasts; it must end the same day"),
        description: z.string().optional().describe("HTML"),
        groupIds: z.array(z.number().int().positive()).min(1).optional().describe("One session for each of these groups; for all students when missing"),
        repeatOn: z.array(z.enum(WEEKDAYS)).min(1).optional().describe("Repeat weekly on these days, with repeatUntil"),
        repeatUntil: z.string().optional().describe("The repeat's last day, YYYY-MM-DD, included"),
        repeatEveryWeeks: z.number().int().min(1).max(36).optional().describe("Every how many weeks; 1 when missing"),
      },
      outputSchema: { changed: z.string(), sessionIds: z.array(z.number().int()), sessions: z.array(session) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ attendanceId, start, repeatUntil, ...input }) => {
      if ((input.repeatOn === undefined) !== (repeatUntil === undefined)) throw new Error("Give repeatOn and repeatUntil together, or neither.");
      const dates = { start: moment(start, "start"), ...(repeatUntil !== undefined && { repeatUntil: day(repeatUntil, "repeatUntil") }) };
      return reply(await addAttendanceSessions(...(await onSite(config, browser)), attendanceId, { ...input, ...dates }));
    },
  );
};

export const registerEditAttendanceSession: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_attendance_session",
    {
      title: "Edit an attendance session",
      description:
        "Change an attendance session's start, duration or description; only what is given changes, and a new start keeps the duration unless one is given. Moodle doesn't move a session to another group. Returns the session afterwards. Changes the course: confirm with the person first.",
      inputSchema: {
        attendanceId,
        sessionId,
        start: z.string().optional().describe("ISO 8601 with its offset (2026-11-16T10:00:00+01:00)"),
        durationMinutes: z.number().int().positive().optional(),
        description: z.string().optional().describe("HTML"),
      },
      outputSchema: { changed: z.string(), sessionId: z.number().int(), session: session.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ attendanceId, sessionId, start, ...changes }) => {
      if (start === undefined && changes.durationMinutes === undefined && changes.description === undefined) throw new Error("Give a new start, durationMinutes or description.");
      return reply(await editAttendanceSession(...(await onSite(config, browser)), attendanceId, sessionId, { ...changes, ...(start !== undefined && { start: moment(start, "start") }) }));
    },
  );
};

export const registerDeleteAttendanceSession: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_attendance_session",
    {
      title: "Delete an attendance session",
      description: "Delete an attendance session, with the attendance taken for it; Moodle recalculates the activity's grades. Changes the course: confirm with the person first.",
      inputSchema: { attendanceId, sessionId },
      outputSchema: { changed: z.string(), sessionId: z.number().int() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ attendanceId, sessionId }) => {
      const { changed } = await deleteAttendanceSession(...(await onSite(config, browser)), attendanceId, sessionId);
      return reply({ changed, sessionId });
    },
  );
};

export const registerGetSessionAttendance: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_session_attendance",
    {
      title: "Get a session's attendance",
      description: "An attendance session's statuses (id, acronym, name) and each participant it's for, with their status and remarks when marked. Read before take_attendance.",
      inputSchema: { attendanceId, sessionId },
      outputSchema: attendance,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ attendanceId, sessionId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownAttendance(config, context, siteUrl, await sessionAttendance(context, siteUrl, attendanceId, sessionId)));
    },
  );
};

export const registerTakeAttendance: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "take_attendance",
    {
      title: "Take attendance",
      description:
        "Take attendance for a session: each participant given gets a status of the session's set (by its acronym, its name or its id, as get_session_attendance gives them) and, when given, remarks; the others keep what they have. Every mark is checked before anything is saved: one Moodle wouldn't take refuses them all. Moodle marks the session taken and recalculates the grade. Returns the session's attendance afterwards. Changes the course: confirm with the person first.",
      inputSchema: {
        attendanceId,
        sessionId,
        marks: z
          .array(
            z.object({
              ...targetFields,
              status: z.string().min(1).describe('The status: its acronym ("P"), its name ("Present") or its id'),
              remarks: z.string().optional().describe("Shown beside the mark; as they are when missing. No aliases in them"),
            }),
          )
          .min(1),
      },
      outputSchema: { changed: z.string(), ...attendance },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ attendanceId, sessionId, marks }) => {
      refuseAliases(config, ...marks.map((m) => m.remarks));
      const resolved = await Promise.all(
        marks.map(async ({ user, userId, status, remarks }) => ({
          userId: await targetUserId(config, requireSiteUrl(config), { user, userId }),
          status: /^\d+$/.test(status) ? Number(status) : status,
          ...(remarks !== undefined && { remarks }),
        })),
      );
      const [context, siteUrl] = await onSite(config, browser);
      const { changed, attendance: after } = await takeAttendance(context, siteUrl, attendanceId, sessionId, resolved);
      return reply({ changed, ...(await shownAttendance(config, context, siteUrl, after)) });
    },
  );
};

const points = z.object({ sessions: z.number().int().optional(), points: z.number(), maxPoints: z.number(), percentage: z.number() });

export const registerGetAttendanceReport: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_attendance_report",
    {
      title: "Get an attendance report",
      description:
        "An Attendance activity's report: for each participant, how many of their taken sessions have each status and that as a percentage, their points and percentage over taken sessions (what Moodle grades), over all sessions, and the most they can still reach. Sessions before the course's start date don't count.",
      inputSchema: { attendanceId, groupId: z.number().int().positive().optional().describe("Only this group's participants") },
      outputSchema: {
        participants: z.array(
          z.object({
            ...personFields,
            statuses: z.array(z.object({ acronym: z.string(), count: z.number().int(), percentage: z.number() })),
            taken: points.describe("Over the sessions taken for them"),
            all: points.describe("Over all sessions, taken or not"),
            maxPossible: points.describe("What they'd reach attending every session not taken yet"),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ attendanceId, groupId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const rows = await attendanceReport(context, siteUrl, attendanceId, groupId === undefined ? {} : { groupId });
      const who = await people(config, context, siteUrl, rows);
      return reply({ participants: rows.map(({ statuses, taken, all, maxPossible }, i) => ({ ...shown(who[i]!), statuses, taken, all, maxPossible })) });
    },
  );
};
