import { z } from "zod";
import { discussion } from "@falkenslab/moodle-driver";
import { people, pseudonymizing, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  discussionId: z.number().int().positive().describe("The discussion id, as list_discussions gives it"),
};

const outputSchema = {
  discussion: z.object({
    id: z.number().int(),
    forumInstanceId: z.number().int().describe("The forum's instance id (not its course module id)"),
    courseId: z.number().int(),
    subscribed: z.boolean().optional().describe("The person is subscribed to it; none where they can't subscribe or it's forced"),
  }),
  posts: z.array(
    z.object({
      id: z.number().int(),
      parentId: z.number().int().optional().describe("The post it replies to; none for the first post"),
      subject: z.string(),
      author: z
        .object({ alias: z.string().optional(), id: z.number().int().optional(), fullName: z.string().optional() })
        .describe("An alias when the server pseudonymizes (the person's own posts keep their id and name), else id and name"),
      created: z.string().describe("ISO 8601"),
      modified: z.string().optional().describe("ISO 8601, when edited after posting"),
      text: z.string().describe("The message as plain text"),
      images: z.array(z.object({ url: z.string().optional().describe("None when pseudonymizing someone else's post"), alt: z.string().optional() })).optional().describe("Images in the message"),
      attachments: z.array(z.object({ name: z.string(), url: z.string().optional().describe("None when pseudonymizing someone else's post: the link carries the file's name") })),
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
        "Read every post of a Moodle forum discussion, oldest first: author (an alias when the server pseudonymizes), time, the post it replies to, the message as plain text (names and contact data redacted when pseudonymizing) and attachments. Takes the discussion id from list_discussions.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ discussionId }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const found = await discussion(context, siteUrl, discussionId);
      // Authors first, so the texts below find them in the directory (a reply naming another participant).
      const authors = await people(config, context, siteUrl, found.posts.map((p) => ({ userId: p.author.id, fullName: p.author.fullName })));
      const posts = await Promise.all(
        found.posts.map(async (post, i) => {
          const author = authors[i]!;
          if (!author.alias) return { ...post, subject: await text(config, siteUrl, post.subject), text: await text(config, siteUrl, post.text), author: { id: author.userId!, fullName: author.fullName! } };
          return {
            ...post,
            author: { alias: author.alias },
            subject: await text(config, siteUrl, post.subject),
            text: await text(config, siteUrl, post.text),
            attachments: await Promise.all(post.attachments.map(async (a) => (pseudonymizing(config) ? { name: await text(config, siteUrl, a.name) } : a))),
            // Someone else's images are theirs, named in their links as attachments are: only their alt text, redacted.
            ...(post.images && { images: await Promise.all(post.images.map(async (i) => (pseudonymizing(config) ? { ...(i.alt !== undefined && { alt: await text(config, siteUrl, i.alt) }) } : i))) }),
          };
        }),
      );
      return reply({ ...found, posts });
    },
  );
};
