import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { listDiscussions } from "@falkenslab/moodle-driver";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  forumId: z.number().int().positive().describe("The forum's id (its course module id), as get_course_structure gives it"),
};

const outputSchema = {
  discussions: z.array(
    z.object({
      id: z.number().int().describe("The discussion id, which get_discussion takes"),
      subject: z.string(),
      author: z.string().describe("Who started it"),
      started: z.string().optional().describe("ISO 8601"),
      lastPost: z.object({ author: z.string(), time: z.string().optional().describe("ISO 8601"), postId: z.number().int().optional() }),
      replies: z.number().int().describe("0 means nobody has answered yet"),
      locked: z.boolean(),
    }),
  ),
};

/** Unix seconds as ISO 8601. */
function isoDate(seconds: number | undefined): string | undefined {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

export const registerListDiscussions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_discussions",
    {
      title: "List a forum's discussions",
      description:
        "List the discussions of a Moodle forum: subject, who started it and when, the last post's author and time, the number of replies (0: unanswered) and whether it's locked. Takes the forum id from get_course_structure; read one with get_discussion.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ forumId }) => {
      const siteUrl = requireSiteUrl(config);
      const rows = await listDiscussions(await browser.context(), siteUrl, forumId);
      const output = {
        discussions: rows.map((row) => ({
          id: row.id,
          subject: row.subject,
          author: row.author,
          started: isoDate(row.started),
          lastPost: { author: row.lastPost.author, time: isoDate(row.lastPost.time), postId: row.lastPost.postId },
          replies: row.replies,
          locked: row.locked,
        })),
      };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
