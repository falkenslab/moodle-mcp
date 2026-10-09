// reply_to_post and create_discussion: Moodle's own post form (mod/forum/post.php), which takes
// attachments and prefills a reply's subject (ADR-008: no AJAX service opens a discussion).
import path from "node:path";
import { access } from "node:fs/promises";
import type { BrowserContext } from "playwright-core";
import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { formValue, openForm, setFields, submitForm, uploadToDraft, type FieldValue } from "../moodle/forms.js";
import { forumInstanceId, listDiscussions } from "../moodle/forum.js";
import type { RegisterTool } from "./types.js";

const common = {
  message: z.string().min(1).describe("The message (HTML)"),
  files: z.array(z.string()).optional().describe("Absolute local paths to attach"),
  subscribe: z.boolean().optional().describe("Subscribe to the discussion; Moodle's default when missing"),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().describe('Other post form fields by name, e.g. {"pinned": true} for a teacher'),
};

async function checkFiles(files: string[]): Promise<void> {
  for (const file of files) {
    if (!path.isAbsolute(file)) throw new Error(`Give files as absolute paths: "${file}".`);
    await access(file).catch(() => {
      throw new Error(`There's no file at ${file}.`);
    });
  }
}

/** Fills and submits the post form at `formPath`; returns the URL Moodle lands on. */
async function post(
  context: BrowserContext,
  siteUrl: string,
  formPath: string,
  input: { subject?: string; message: string; files?: string[]; subscribe?: boolean; fields?: Record<string, FieldValue> },
): Promise<string> {
  // Moodle takes "<p></p>" as a message and posts it blank (confirmed empirically, 5.2).
  const text = input.message.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  if (text === "" && !/<(img|video|audio|iframe)\b/i.test(input.message)) throw new Error("The message is empty: write something before posting.");
  if (input.files) await checkFiles(input.files);
  const page = await openForm(context, siteUrl, formPath);
  try {
    if (input.files && input.files.length > 0) {
      const draft = await formValue(page, "attachments");
      if (!draft) throw new Error("This forum takes no attachments.");
      await uploadToDraft(page, draft, input.files);
    }
    const values: Record<string, FieldValue> = { "message[text]": input.message, ...input.fields };
    if (input.subject !== undefined) values.subject = input.subject;
    if (input.subscribe !== undefined) values.discussionsubscribe = input.subscribe;
    await setFields(page, values);
    await submitForm(page, "submitbutton");
    return page.url();
  } finally {
    await page.close().catch(() => undefined);
  }
}

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
      const siteUrl = requireSiteUrl(config);
      const landed = new URL(await post(await browser.context(), siteUrl, `mod/forum/post.php?reply=${postId}`, input));
      // Moodle lands on the discussion, at the new post: discuss.php?d=<discussion>#p<post>.
      const newPost = /^#p(\d+)$/.exec(landed.hash)?.[1];
      const discussion = landed.searchParams.get("d");
      const output = {
        changed: `Replied to post ${postId}${newPost ? ` with post ${newPost}` : ""}.`,
        postId: newPost ? Number(newPost) : undefined,
        discussionId: discussion ? Number(discussion) : undefined,
      };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
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
      const siteUrl = requireSiteUrl(config);
      const context = await browser.context();
      const instance = await forumInstanceId(context, siteUrl, forumId);
      const before = new Set((await listDiscussions(context, siteUrl, forumId)).map((d) => d.id));
      await post(context, siteUrl, `mod/forum/post.php?forum=${instance}`, input);
      const created = (await listDiscussions(context, siteUrl, forumId)).find((d) => !before.has(d.id));
      const output = { changed: `Started discussion ${created?.id ?? "?"} "${input.subject}" in forum ${forumId}.`, discussionId: created?.id };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
