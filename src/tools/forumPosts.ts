// reply_to_post and create_discussion: the driver posts through Moodle's own post form.
import { z } from "zod";
import { replyToPost, startDiscussion } from "@falkenslab/moodle-driver";
import { refuseAliases } from "../people.js";
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
