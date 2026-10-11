// Notifications and private messages. Other people go through people.ts (ADR-013, ADR-016): senders
// and members as aliases under pseudonymize, their texts redacted, aliases refused in what is sent.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { conversation, conversations, markNotificationsRead, notifications, sendMessage, userById } from "@falkenslab/moodle-driver";
import { requireSiteUrl, type Config } from "../config.js";
import { people, personFields, pseudonymizing, refuseAliases, self, shown, targetFields, targetName, targetUserId, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

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
        "List the person's notifications, newest first (only unread ones when asked): subject, text, who it's from (an alias when the server pseudonymizes), when, whether it's read, and where it leads. Names in the texts are redacted when pseudonymizing.",
      inputSchema: { unreadOnly: z.boolean().optional() },
      outputSchema: {
        notifications: z.array(
          z.object({ id: z.number().int(), subject: z.string(), text: z.string(), from, time: z.string().optional(), read: z.boolean(), url: z.string().optional(), component: z.string().optional(), eventType: z.string().optional() }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ unreadOnly }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await notifications(context, siteUrl, { unreadOnly });
      const senders = await byUserId(config, context, siteUrl, [], found.map((n) => n.fromUserId));
      const list = await Promise.all(
        found.map(async ({ fromUserId, subject, text: body, ...rest }) => ({ ...rest, subject: await text(config, siteUrl, subject), text: await text(config, siteUrl, body), from: sender(senders, config, fromUserId) })),
      );
      return reply({ notifications: list });
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
      description: "List the person's message conversations, latest first: private, group or with themselves, their members (aliases when the server pseudonymizes), unread count and the last message as text. Read one with get_conversation.",
      inputSchema: {},
      outputSchema: {
        conversations: z.array(
          z.object({ id: z.number().int().describe("The conversation's id, which get_conversation takes"), type: z.enum(["private", "group", "self"]), name: z.string().optional(), members: z.array(z.object(personFields)), unread: z.number().int(), lastMessage: lastMessage.optional() }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await conversations(context, siteUrl);
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
      return reply({ conversations: list });
    },
  );
};

export const registerGetConversation: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_conversation",
    {
      title: "Read a conversation",
      description: "Read a message conversation, oldest first: its members and each message's sender (aliases when the server pseudonymizes), text and time; names and contact data in the texts are redacted when pseudonymizing. Takes the id from list_conversations.",
      inputSchema: { conversationId: z.number().int().positive() },
      outputSchema: { id: z.number().int(), members: z.array(z.object(personFields)), messages: z.array(z.object({ id: z.number().int(), from, text: z.string(), time: z.string().optional() })) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ conversationId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await conversation(context, siteUrl, conversationId);
      const map = await byUserId(config, context, siteUrl, found.members, found.messages.map((m) => m.fromUserId));
      const messages = await Promise.all(found.messages.map(async (m) => ({ id: m.id, from: sender(map, config, m.fromUserId), text: await text(config, siteUrl, m.text), ...(m.time !== undefined && { time: m.time }) })));
      return reply({ id: found.id, members: found.members.map((m) => sender(map, config, m.userId) as Shown), messages });
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
