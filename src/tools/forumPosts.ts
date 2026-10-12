// reply_to_post, create_discussion, edit_post and delete_post: the driver works through Moodle's own post form.
import { z } from "zod";
import { deletePost, editPost, replyToPost, startDiscussion } from "@falkenslab/moodle-driver";
import { people, pseudonymizing, refuseAliases, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const common = {
  message: z.string().min(1).describe("The message (HTML); no aliases in it, since people read it"),
  files: z.array(z.string()).optional().describe("Absolute local paths to attach"),
  subscribe: z.boolean().optional().describe("Subscribe to the discussion; Moodle's default when missing"),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe('Other post form fields by name, e.g. {"pinned": true} for a teacher'),
};

export const registerReplyToPost: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "reply_to_post",
    {
      title: "Reply to a forum post",
      description:
        "Reply to a post in a Moodle forum discussion, with optional attachments (local files). The subject defaults to Moodle's \"Re: …\". Returns the new post's id and its discussion. Posts as the person, visibly: confirm the text with the person first.",
      inputSchema: { postId: z.number().int().positive().describe("The post to reply to, as get_discussion gives it"), subject: z.string().min(1).optional(), ...common },
      outputSchema: { changed: z.string(), postId: z.number().int().optional(), discussionId: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ postId, ...input }) => {
      refuseAliases(config, input.subject, input.message);
      return reply(await replyToPost(...(await onSite(config, browser)), postId, input));
    },
  );
};

export const registerCreateDiscussion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_discussion",
    {
      title: "Start a forum discussion",
      description:
        "Start a discussion in a Moodle forum, with optional attachments (local files); a teacher can post announcements this way in the announcements forum. Returns the new discussion's id. Posts as the person, visibly: confirm the text with the person first.",
      inputSchema: { forumId: z.number().int().positive().describe("The forum's id (course module id), as get_course_structure gives it"), subject: z.string().min(1), ...common },
      outputSchema: { changed: z.string(), discussionId: z.number().int().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ forumId, ...input }) => {
      refuseAliases(config, input.subject, input.message);
      return reply(await startDiscussion(...(await onSite(config, browser)), forumId, input));
    },
  );
};

export const registerEditPost: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_post",
    {
      title: "Edit a forum post",
      description:
        "Change a forum post through Moodle's own form, as its author (within the site's editing time) or a moderator: its subject, message (HTML), and attachments to add or remove. Only what's given changes. Returns the post afterwards (its author as an alias when the server pseudonymizes). Visible to the forum: confirm with the person first.",
      inputSchema: {
        postId: z.number().int().positive().describe("As get_discussion gives it"),
        subject: z.string().min(1).optional(),
        message: z.string().min(1).optional().describe("HTML; no aliases in it, since people read it"),
        addFiles: z.array(z.string()).optional().describe("Absolute local paths to attach"),
        removeFiles: z.array(z.string()).optional().describe("Attachments' names to remove"),
      },
      outputSchema: {
        changed: z.string(),
        post: z
          .object({
            id: z.number().int(),
            parentId: z.number().int().optional(),
            subject: z.string(),
            author: z.object({ alias: z.string().optional(), id: z.number().int().optional(), fullName: z.string().optional() }),
            created: z.string().optional(),
            modified: z.string().optional(),
            text: z.string(),
            attachments: z.array(z.object({ name: z.string(), url: z.string().optional() })),
            privateReply: z.boolean(),
            unread: z.boolean().optional(),
          })
          .optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ postId, subject, message, addFiles, removeFiles }) => {
      refuseAliases(config, subject, message);
      const [context, siteUrl] = await onSite(config, browser);
      const files = addFiles || removeFiles ? { ...(addFiles && { add: addFiles }), ...(removeFiles && { remove: removeFiles }) } : undefined;
      const { changed, post } = await editPost(context, siteUrl, postId, { subject, message, files });
      if (!post) return reply({ changed });
      // As get_discussion gives a post: its author as an alias, unless it's the person's own.
      const [author] = await people(config, context, siteUrl, [{ userId: post.author.id, fullName: post.author.fullName }]);
      const others = !!author!.alias;
      return reply({
        changed,
        post: {
          ...post,
          author: others ? { alias: author!.alias } : { id: post.author.id, fullName: post.author.fullName },
          subject: await text(config, siteUrl, post.subject),
          text: await text(config, siteUrl, post.text),
          attachments: await Promise.all(post.attachments.map(async (a) => (others && pseudonymizing(config) ? { name: await text(config, siteUrl, a.name) } : a))),
        },
      });
    },
  );
};

export const registerDeletePost: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_post",
    {
      title: "Delete a forum post",
      description:
        "Delete a forum post and its replies through Moodle's own confirmation; a discussion's first post takes the whole discussion. Only a moderator deletes someone else's post or one with replies. Can't be undone: confirm with the person first.",
      inputSchema: { postId: z.number().int().positive().describe("As get_discussion gives it") },
      outputSchema: { changed: z.string(), discussionId: z.number().int().optional(), replies: z.number().int().describe("Replies deleted with it"), discussionDeleted: z.boolean() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ postId }) => reply(await deletePost(...(await onSite(config, browser)), postId)),
  );
};
