import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { discussionPosts, htmlToTexts } from "@falkenslab/moodle-driver";
import { decodeEntities } from "@falkenslab/moodle-driver";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  discussionId: z.number().int().positive().describe("The discussion id, as list_discussions gives it"),
};

const outputSchema = {
  discussion: z.object({ id: z.number().int(), forumId: z.number().int().describe("The forum's instance id"), courseId: z.number().int() }),
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

/** Unix seconds as ISO 8601. */
function isoDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

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
    async ({ discussionId }) => {
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const { posts, forumid, courseid } = await discussionPosts(context, siteUrl, discussionId);
      const texts = await htmlToTexts(
        context,
        posts.map((post) => post.message),
      );
      const output = {
        discussion: { id: discussionId, forumId: forumid, courseId: courseid },
        posts: posts.map((post, i) => ({
          id: post.id,
          parentId: post.parentid ?? undefined,
          subject: decodeEntities(post.subject),
          author: { id: post.author.id, fullName: post.author.fullname },
          created: isoDate(post.timecreated),
          modified: post.timemodified && post.timemodified - post.timecreated > 60 ? isoDate(post.timemodified) : undefined,
          text: texts[i] ?? "",
          attachments: (post.attachments ?? []).map((file) => ({ name: file.filename, url: file.url ?? file.fileurl ?? "" })),
          privateReply: post.isprivatereply ?? false,
          unread: post.unread ?? undefined,
        })),
      };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
