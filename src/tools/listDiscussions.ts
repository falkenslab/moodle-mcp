import { z } from "zod";
import { forumDiscussions } from "@falkenslab/moodle-driver";
import { personByName, text } from "../people.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";
import { more, pageInputs, pagedText } from "./paging.js";

const inputSchema = {
  forumId: z.number().int().positive().describe("The forum's id (its course module id), as get_course_structure gives it"),
  ...pageInputs("discussions", 30, 100, ", in the forum's order"),
};

const outputSchema = {
  discussions: z.array(
    z.object({
      id: z.number().int().describe("The discussion id, which get_discussion takes"),
      subject: z.string(),
      author: z.string().describe(`Who started it: when the server pseudonymizes, an alias, or "[participant]" for someone it hasn't met yet (get_discussion gives their alias)`),
      started: z.string().optional().describe("ISO 8601"),
      lastPost: z.object({ author: z.string(), time: z.string().optional().describe("ISO 8601"), postId: z.number().int().optional() }),
      replies: z.number().int().describe("0 means nobody has answered yet"),
      locked: z.boolean(),
      pinned: z.boolean().optional().describe("Kept at the top of the list"),
      subscribed: z.boolean().optional().describe("The person is subscribed to it"),
    }),
  ),
  more,
};

export const registerListDiscussions: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_discussions",
    {
      title: "List a forum's discussions",
      description:
        "List the discussions of a Moodle forum: subject, who started it and when, the last post's author and time, the number of replies (0: unanswered) and whether it's locked. " +
        pagedText("discussions", 30) +
        " Takes the forum id from get_course_structure; read one with get_discussion.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ forumId, limit = 30, offset }) => {
      const [context, siteUrl] = await onSite(config, browser);
      const { items: found, more } = await forumDiscussions(context, siteUrl, forumId, { limit, offset });
      // The page shows names without user ids: only names the directory already knows become aliases.
      const discussions = await Promise.all(
        found.map(async (d) => ({
          ...d,
          subject: await text(config, siteUrl, d.subject),
          author: await personByName(config, context, siteUrl, d.author),
          lastPost: { ...d.lastPost, author: await personByName(config, context, siteUrl, d.lastPost.author) },
        })),
      );
      return reply({ discussions, more });
    },
  );
};
