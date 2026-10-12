// Decisions about participants: completion overrides, assignment extensions, quiz overrides, and a
// discussion's pin and lock. Participants come as the reading tools give them (people.ts).
import { z } from "zod";
import { COMPLETION_STATES, grantExtension, overrideCompletion, setDiscussionState, setQuizOverride } from "@falkenslab/moodle-driver";
import { requireSiteUrl } from "../config.js";
import { personByName, pseudonymizing, targetFields, targetName, targetUserId, text, userIdOf } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

/** An ISO 8601 date the agent gave, or a clear error. */
function date(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}: "${value}" isn't an ISO 8601 date and time.`);
  return parsed;
}

export const registerOverrideCompletion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "override_completion",
    {
      title: "Set a participant's activity completion",
      description:
        "Set a participant's completion of an activity as a teacher does from the progress report (an override, shown as such). Takes the participant as get_completion_report gives them. Returns the state saved. Changes the participant's progress: confirm with the person first.",
      inputSchema: { activityId: z.number().int().positive().describe("The activity's id (course module id)"), ...targetFields, state: z.enum(COMPLETION_STATES) },
      outputSchema: { changed: z.string(), state: z.enum(COMPLETION_STATES), overridden: z.boolean() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ activityId, user, userId, state }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const saved = await overrideCompletion(...(await onSite(config, browser)), activityId, target, state);
      return reply({ ...saved, changed: `Completion of activity ${activityId} set to ${saved.state} for ${targetName({ user, userId })}.` });
    },
  );
};

export const registerGrantExtension: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "grant_extension",
    {
      title: "Grant an assignment extension",
      description:
        "Grant participants an extension of an assignment's due date until a date, as the assignment's extension form does (several at once). Takes them as get_submissions gives them: users (aliases) when the server pseudonymizes, else userIds. Moodle refuses a date before the due date. Confirm with the person first.",
      inputSchema: {
        assignmentId: z.number().int().positive().describe("The assignment's id (course module id), as list_assignments gives it"),
        users: z.array(z.string()).min(1).optional().describe("The participants' aliases, when the server pseudonymizes"),
        userIds: z.array(z.number().int().positive()).min(1).optional().describe("The participants' user ids, when the server shows names"),
        until: z.string().describe("ISO 8601, e.g. 2026-11-03T23:59:00+01:00"),
      },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ assignmentId, users, userIds, until }) => {
      const siteUrl = requireSiteUrl(config);
      const pseudonymous = pseudonymizing(config);
      if (pseudonymous ? !users || userIds : !userIds || users)
        throw new Error(pseudonymous ? "This server pseudonymizes: give the participants as users, the aliases get_submissions gives." : "Give the participants as userIds, as get_submissions gives them.");
      const ids = users ? await Promise.all(users.map((alias) => userIdOf(siteUrl, alias))) : userIds!;
      const when = date(until, "until");
      await grantExtension(...(await onSite(config, browser)), assignmentId, ids, when);
      return reply({ changed: `Extension until ${when.toISOString()} granted to ${(users ?? userIds!.map((id) => `user ${id}`)).join(", ")} in assignment ${assignmentId}.` });
    },
  );
};

export const registerSetQuizOverride: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_quiz_override",
    {
      title: "Set a quiz override for a participant",
      description:
        "Give a participant their own quiz settings, as the quiz's user overrides do: open and close dates, time limit in minutes, or number of attempts (0 unlimited); what isn't given stays the quiz's. Takes the participant as list_participants gives them. Confirm with the person first.",
      inputSchema: {
        quizId: z.number().int().positive().describe("The quiz's id (course module id)"),
        ...targetFields,
        open: z.string().optional().describe("ISO 8601"),
        close: z.string().optional().describe("ISO 8601"),
        timeLimitMinutes: z.number().int().min(0).optional(),
        attempts: z.number().int().min(0).optional().describe("0 for unlimited"),
      },
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ quizId, user, userId, open, close, ...limits }) => {
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const settings = { ...limits, ...(open !== undefined && { open: date(open, "open") }), ...(close !== undefined && { close: date(close, "close") }) };
      await setQuizOverride(...(await onSite(config, browser)), quizId, target, settings);
      return reply({ changed: `Override of quiz ${quizId} set for ${targetName({ user, userId })}.` });
    },
  );
};

export const registerSetDiscussionState: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_discussion_state",
    {
      title: "Pin or lock a discussion",
      description: "Pin or unpin, lock or unlock a forum discussion, as the discussion list's menu does; what's already so is left alone. Returns the discussion as the forum lists it afterwards. Students see it: confirm with the person first.",
      inputSchema: {
        forumId: z.number().int().positive().describe("The forum's id (course module id), as get_course_structure gives it"),
        discussionId: z.number().int().positive().describe("As list_discussions gives it"),
        pinned: z.boolean().optional(),
        locked: z.boolean().optional(),
      },
      outputSchema: {
        changed: z.string(),
        discussion: z
          .object({
            id: z.number().int(),
            subject: z.string(),
            author: z.string().describe("An alias when the server pseudonymizes, or [participant]"),
            started: z.string().optional(),
            lastPost: z.object({ author: z.string(), time: z.string().optional(), postId: z.number().int().optional() }),
            replies: z.number().int(),
            locked: z.boolean(),
            pinned: z.boolean(),
            subscribed: z.boolean().optional(),
          })
          .optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ forumId, discussionId, pinned, locked }) => {
      if (pinned === undefined && locked === undefined) throw new Error("Give pinned, locked, or both.");
      const [context, siteUrl] = await onSite(config, browser);
      const { changed, discussion } = await setDiscussionState(context, siteUrl, forumId, discussionId, { pinned, locked });
      // The forum's list shows names without ids, as in list_discussions.
      const shownDiscussion = discussion && {
        ...discussion,
        subject: await text(config, siteUrl, discussion.subject),
        author: await personByName(config, context, siteUrl, discussion.author),
        lastPost: { ...discussion.lastPost, author: await personByName(config, context, siteUrl, discussion.lastPost.author) },
      };
      return reply({ changed, ...(shownDiscussion && { discussion: shownDiscussion }) });
    },
  );
};
