import { z } from "zod";
import { CONTENT_TYPES, activityContent } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
import type { RegisterTool } from "./types.js";

const inputSchema = {
  activityId: z.number().int().positive().describe("The activity's id (course module id), as get_course_structure gives it"),
  type: z.enum(CONTENT_TYPES).describe("The activity's type, as get_course_structure gives it"),
};

const link = z.object({ name: z.string(), url: z.string() });

const outputSchema = {
  activity: z.object({ id: z.number().int(), type: z.enum(CONTENT_TYPES) }),
  text: z.string().optional().describe("Page and label content, as plain text with paragraphs and lists kept"),
  chapters: z.array(z.object({ title: z.string(), text: z.string() })).optional().describe("A book's chapters, in order"),
  media: z
    .array(z.object({ kind: z.enum(["video", "audio", "youtube", "vimeo", "embed"]), url: z.string(), title: z.string().optional() }))
    .optional()
    .describe("Videos, audio and players in a page's, label's or book's content: download_file saves the site's own files; the rest are links"),
  url: z.string().optional().describe("A URL resource's target"),
  files: z.array(link).optional().describe("A file resource's or a folder's files"),
  trail: z.enum(["realistic", "fast"]).describe("How it was read: realistic viewed it page by page at a reader's pace"),
  readingSeconds: z.number().optional().describe("With the realistic trail, the time spent reading"),
};

export const registerGetActivityContent: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_activity_content",
    {
      title: "Read an activity's content",
      description:
        "Read a content activity as a person would, so Moodle logs the view: a page's or label's text, a book's chapters, a URL resource's target, or a file resource's or folder's files (as links). Takes the id and type from get_course_structure. With the realistic trail it reads page by page at a reader's pace and reports progress.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ activityId, type }, extra) => {
      // Clients that pass a progress token keep waiting while the reading pauses report progress.
      const progressToken = extra._meta?.progressToken;
      const onProgress = (secondsRead: number) => {
        if (progressToken === undefined) return;
        void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: secondsRead, message: "Reading at a person's pace" } }).catch(() => undefined);
      };
      const output = await activityContent(...(await onSite(config, browser)), activityId, type, { trail: config.trail, onProgress });
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: { ...output } };
    },
  );
};
