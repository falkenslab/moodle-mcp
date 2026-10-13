// Notifications and private messages. Other people go through people.ts (ADR-013, ADR-016): senders
// and members as aliases under pseudonymize, their texts redacted, aliases refused in what is sent.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { conversation, conversations, markNotificationsRead, messageParticipants, notifications, sendMessage, userById } from "@falkenslab/moodle-driver";
import { requireSiteUrl, type Config } from "../config.js";
import { people, peopleByIds, personFields, pseudonymizing, refuseAliases, self, shown, targetFields, targetName, targetsFields, targetUserId, targetUserIds, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";
import { more, pageInputs, pagedText } from "./paging.js";

type Shown = ReturnType<typeof shown>;

/**
 * People by user id as the agent may see them: under pseudonymize, each looked up (the driver gives
 * senders by id only) and remembered, so their names in the texts that follow become aliases too.
 */
async function byUserId(config: Config, context: BrowserContext, siteUrl: string, known: { userId: number; fullName: string }[], ids: number[]): Promise<Map<number, Shown>> {
  // The person isn't among a conversation's members, but sends messages in it.
  const me = await self(context, siteUrl);
  const withMe = known.some((p) => p.userId === me.userId) ? known : [...known, me];
  const missing = [...new Set(ids)].filter((id) => id > 0 && !withMe.some((p) => p.userId === id));
  const looked = (await Promise.all(missing.map((id) => userById(context, siteUrl, id)))).flatMap((u) => (u ? [{ userId: u.id, fullName: u.fullName }] : []));
  const everyone = [...withMe, ...looked];
  const who = await people(config, context, siteUrl, everyone);
  return new Map(everyone.map((p, i) => [p.userId, shown(who[i]!)]));
}

/** A sender: the site itself (a negative id), someone known, or someone Moodle didn't give. */
function sender(map: Map<number, Shown>, config: Config, id: number): Shown | { site: true } {
  if (id < 0) return { site: true };
  return map.get(id) ?? (pseudonymizing(config) ? { user: "[participant]" } : { userId: id });
}

const from = z.object({ ...personFields, site: z.boolean().optional().describe("Sent by the site itself (no-reply, support)") });

export const registerListNotifications: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_notifications",
    {
      title: "List my notifications",
      description:
        "List the person's notifications, newest first (only unread ones when asked), a page at a time: limit of them (30 by default) after skipping offset; more says whether there are others to ask for with a bigger offset. Each: subject, text, who it's from (an alias when the server pseudonymizes), when, whether it's read, and where it leads. Names in the texts are redacted when pseudonymizing.",
      inputSchema: {
        unreadOnly: z.boolean().optional(),
        limit: z.number().int().positive().max(100).optional().describe("How many (30 by default)"),
        offset: z.number().int().min(0).optional().describe("How many to skip first, newest first (0 by default); with unreadOnly, it counts unread ones"),
      },
      outputSchema: {
        notifications: z.array(
          z.object({ id: z.number().int(), subject: z.string(), text: z.string(), from, time: z.string().optional(), read: z.boolean(), url: z.string().optional(), component: z.string().optional(), eventType: z.string().optional() }),
        ),
        more: z.boolean().describe("There are more after this page: ask again with offset moved by limit"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ unreadOnly, limit = 30, offset }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const { items: found, more } = await notifications(context, siteUrl, { unreadOnly, limit, offset });
      const senders = await byUserId(config, context, siteUrl, [], found.map((n) => n.fromUserId));
      const list = await Promise.all(
        found.map(async ({ fromUserId, subject, text: body, ...rest }) => ({ ...rest, subject: await text(config, siteUrl, subject), text: await text(config, siteUrl, body), from: sender(senders, config, fromUserId) })),
      );
      return reply({ notifications: list, more });
    },
  );
};

export const registerMarkNotificationsRead: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "mark_notifications_read",
    {
      title: "Mark my notifications read",
      description: "Mark all the person's notifications read, as the notifications popover's \"Mark all as read\" does. Doing it twice changes nothing.",
      inputSchema: {},
      outputSchema: { changed: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => reply(await markNotificationsRead(...(await onSite(config, browser)))),
  );
};

const lastMessage = z.object({ from, text: z.string(), time: z.string().optional() });

export const registerListConversations: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_conversations",
    {
      title: "List my conversations",
      description: `List the person's message conversations, latest first: private, group or with themselves, their members (aliases when the server pseudonymizes), unread count and the last message as text. ${pagedText("conversations", 20)} Read one with get_conversation.`,
      inputSchema: pageInputs("conversations", 20, 100, ", latest first"),
      outputSchema: {
        conversations: z.array(
          z.object({ id: z.number().int().describe("The conversation's id, which get_conversation takes"), type: z.enum(["private", "group", "self"]), name: z.string().optional(), members: z.array(z.object(personFields)), unread: z.number().int(), lastMessage: lastMessage.optional() }),
        ),
        more,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ limit = 20, offset }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const { items: found, more } = await conversations(context, siteUrl, { limit, offset });
      const map = await byUserId(config, context, siteUrl, found.flatMap((c) => c.members), found.flatMap((c) => (c.lastMessage ? [c.lastMessage.fromUserId] : [])));
      const list = await Promise.all(
        found.map(async (c) => ({
          id: c.id,
          type: c.type,
          ...(c.name !== undefined && { name: await text(config, siteUrl, c.name) }),
          members: c.members.map((m) => sender(map, config, m.userId) as Shown),
          unread: c.unread,
          ...(c.lastMessage && { lastMessage: { from: sender(map, config, c.lastMessage.fromUserId), text: await text(config, siteUrl, c.lastMessage.text), time: c.lastMessage.time } }),
        })),
      );
      return reply({ conversations: list, more });
    },
  );
};

export const registerGetConversation: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_conversation",
    {
      title: "Read a conversation",
      description:
        "Read a message conversation: its members and each message's sender (aliases when the server pseudonymizes), text and time; names and contact data in the texts are redacted when pseudonymizing. A page at a time, counted from the newest: limit messages (50 by default) after skipping offset, the first page the latest, each page's messages oldest first; more says whether there are older ones. Takes the id from list_conversations.",
      inputSchema: { conversationId: z.number().int().positive(), ...pageInputs("messages", 50, 200, ", counted from the newest") },
      outputSchema: { id: z.number().int(), members: z.array(z.object(personFields)), messages: z.array(z.object({ id: z.number().int(), from, text: z.string(), time: z.string().optional() })), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ conversationId, limit = 50, offset }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await conversation(context, siteUrl, conversationId, { limit, offset });
      const page = found.messages.items;
      const map = await byUserId(config, context, siteUrl, found.members, page.map((m) => m.fromUserId));
      const messages = await Promise.all(page.map(async (m) => ({ id: m.id, from: sender(map, config, m.fromUserId), text: await text(config, siteUrl, m.text), ...(m.time !== undefined && { time: m.time }) })));
      return reply({ id: found.id, members: found.members.map((m) => sender(map, config, m.userId) as Shown), messages, more: found.messages.more });
    },
  );
};

export const registerSendMessage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "send_message",
    {
      title: "Send a private message",
      description:
        "Send a private message to someone, as the messaging drawer does: to user (an alias) when the server pseudonymizes, else userId. The text is plain; no aliases in it, since the recipient reads it. Returns the message and its conversation. Sent as the person, visibly: confirm the text and the recipient with the person first.",
      inputSchema: { ...targetFields, text: z.string().min(1) },
      outputSchema: { changed: z.string(), messageId: z.number().int(), conversationId: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ user, userId, text: body }) => {
      refuseAliases(config, body);
      const target = await targetUserId(config, requireSiteUrl(config), { user, userId });
      const sent = await sendMessage(...(await onSite(config, browser)), target, body);
      return reply({ ...sent, changed: `Message sent to ${targetName({ user, userId })}.` });
    },
  );
};

export const registerMessageParticipants: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "message_participants",
    {
      title: "Message several participants",
      description:
        "Send one private message to several participants of a course, as the participants page's \"Send a message\" does: to users (aliases) or userIds, or to everyone chosen by role, group or inactiveSince (everyone when none is given), the person left out. Returns who got it and who Moodle didn't write to, and why. The text is plain, with no aliases in it. Sent as the person, visibly: confirm the text and the recipients with the person first.",
      inputSchema: {
        courseId: z.number().int().positive(),
        text: z.string().min(1),
        ...targetsFields,
        role: z.number().int().positive().optional().describe("Or: everyone with this role"),
        group: z.number().int().positive().optional().describe("Or: everyone in this group"),
        inactiveSince: z.string().optional().describe("Or: everyone who hasn't accessed the course since this date (ISO 8601)"),
      },
      outputSchema: {
        changed: z.string(),
        sentTo: z.array(z.object(personFields)),
        refused: z.array(z.object({ ...personFields, reason: z.string() })),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ courseId, text: body, users, userIds, role, group, inactiveSince }) => {
      refuseAliases(config, body);
      const siteUrl = requireSiteUrl(config);
      const chosen = users || userIds;
      if (chosen && (role !== undefined || group !== undefined || inactiveSince !== undefined)) throw new Error("Give the recipients as people, or by role, group or inactiveSince: not both.");
      let since: Date | undefined;
      if (inactiveSince !== undefined) {
        since = new Date(inactiveSince);
        if (Number.isNaN(since.getTime())) throw new Error(`"${inactiveSince}" isn't an ISO 8601 date.`);
      }
      const selection = chosen ? { userIds: await targetUserIds(config, siteUrl, { users, userIds }) } : { role, group, inactiveSince: since };
      const [context] = await onSite(config, browser);
      const result = await messageParticipants(context, siteUrl, courseId, body, selection);
      // Moodle reports recipients by id: as aliases (or names) from the course's participants.
      const shownIds = await peopleByIds(config, context, siteUrl, courseId, [...result.sentTo, ...result.refused.map((r) => r.userId)]);
      return reply({
        changed: `Message sent to ${result.sentTo.length} participant${result.sentTo.length === 1 ? "" : "s"} of course ${courseId}${result.refused.length ? `; ${result.refused.length} refused` : ""}.`,
        sentTo: result.sentTo.map((id) => shownIds.get(id)!),
        refused: await Promise.all(result.refused.map(async (r) => ({ ...shownIds.get(r.userId)!, reason: await text(config, siteUrl, r.reason) }))),
      });
    },
  );
};
