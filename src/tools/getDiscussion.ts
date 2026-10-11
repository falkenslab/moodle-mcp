import { z } from "zod";
import { discussion } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  discussionId: z.number().int().positive().describe("The discussion id, as list_discussions gives it"),
};

const outputSchema = {
  discussion: z.object({ id: z.number().int(), forumInstanceId: z.number().int().describe("The forum's instance id (not its course module id)"), courseId: z.number().int() }),
  posts: z.array(
    z.object({
      id: z.number().int(),
      parentId: z.number().int().optional().describe("The post it replies to; none for the first post"),
      subject: z.string(),
      author: z.object({ id: z.number().int(), fullName: z.string() }),
      created: z.string().describe("ISO 8601"),
      modified: z.string().optional().describe("ISO 8601, when edited after posting"),
      text: z.string().describe("The message as plain text"),
      attachments: z.array(z.object({ name: z.string(), url: z.string() })),
      privateReply: z.boolean(),
      unread: z.boolean().optional(),
    }),
  ),
};

export const registerGetDiscussion: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_discussion",
    {
      title: "Read a forum discussion",
      description:
        "Read every post of a Moodle forum discussion, oldest first: author, time, the post it replies to, the message as plain text and attachments. Takes the discussion id from list_discussions.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ discussionId }) => reply(await discussion(...(await onSite(config, browser)), discussionId)),
  );
};
